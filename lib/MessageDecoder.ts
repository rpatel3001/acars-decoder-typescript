import { DecodeResult, DecoderPluginInterface, Message, Options } from './DecoderPluginInterface'; // eslint-disable-line import/no-cycle

import * as Plugins from './plugins/official';
import { MIAMCoreUtils } from './utils/miam';
import { ResultFormatter } from './utils/result_formatter';

export class MessageDecoder {
  name: string;
  plugins: Array<DecoderPluginInterface>;
  debug: boolean;

  constructor() {
    this.name = 'acars-decoder-typescript';
    this.plugins = [];
    this.debug = false;

    this.registerPlugin(new Plugins.Label_ColonComma(this));
    this.registerPlugin(new Plugins.Label_5Z_Slash(this));
    this.registerPlugin(new Plugins.Label_10_LDR(this));
    this.registerPlugin(new Plugins.Label_10_POS(this));
    this.registerPlugin(new Plugins.Label_10_Slash(this));
    this.registerPlugin(new Plugins.Label_12_N_Space(this));
    this.registerPlugin(new Plugins.Label_13Through18_Slash(this));
    this.registerPlugin(new Plugins.Label_15(this));
    this.registerPlugin(new Plugins.Label_15_FST(this));
    this.registerPlugin(new Plugins.Label_16_N_Space(this));
    this.registerPlugin(new Plugins.Label_1L_3Line(this));
    this.registerPlugin(new Plugins.Label_1L_070(this));
    this.registerPlugin(new Plugins.Label_1L_660(this));
    this.registerPlugin(new Plugins.Label_1L_Slash(this));
    this.registerPlugin(new Plugins.Label_20_POS(this));
    this.registerPlugin(new Plugins.Label_21_POS(this));
    this.registerPlugin(new Plugins.Label_22(this));
    this.registerPlugin(new Plugins.Label_24_Slash(this));
    this.registerPlugin(new Plugins.Label_30_Slash_EA(this));
    this.registerPlugin(new Plugins.Label_44_ETA(this));
    this.registerPlugin(new Plugins.Label_44_IN(this));
    this.registerPlugin(new Plugins.Label_44_OFF(this));
    this.registerPlugin(new Plugins.Label_44_ON(this));
    this.registerPlugin(new Plugins.Label_44_POS(this));
    this.registerPlugin(new Plugins.Label_4A(this));
    this.registerPlugin(new Plugins.Label_4A_01(this));
    this.registerPlugin(new Plugins.Label_4A_DIS(this));
    this.registerPlugin(new Plugins.Label_4A_DOOR(this));
    this.registerPlugin(new Plugins.Label_4A_Slash_01(this));
    this.registerPlugin(new Plugins.Label_4N(this));
    this.registerPlugin(new Plugins.Label_B6_Forwardslash(this));
    this.registerPlugin(new Plugins.Label_H1_FLR(this));
    this.registerPlugin(new Plugins.Label_H1_OHMA(this));
    this.registerPlugin(new Plugins.Label_H1_WRN(this));
    this.registerPlugin(new Plugins.Label_H1(this));
    this.registerPlugin(new Plugins.Label_HX(this));
    this.registerPlugin(new Plugins.Label_80(this));
    this.registerPlugin(new Plugins.Label_83(this));
    this.registerPlugin(new Plugins.Label_8E(this));
    this.registerPlugin(new Plugins.Label_1M_Slash(this));
    this.registerPlugin(new Plugins.Label_SQ(this));
    this.registerPlugin(new Plugins.Label_QP(this));
    this.registerPlugin(new Plugins.Label_QQ(this));
    this.registerPlugin(new Plugins.Label_QR(this));
    this.registerPlugin(new Plugins.Label_QS(this));
  }

  registerPlugin(plugin: DecoderPluginInterface): boolean {
    const pluginInstance = plugin;
    // plugin.onRegister(this.store);
    this.plugins.push(plugin);
    return true;
  }

  decode(message: Message, options: Options = {}): DecodeResult {
    if (message.label === 'MA') {
      const decodeResult = MIAMCoreUtils.parse(message.text);

      // Only transplant message text if the MIAM core decoded message passed CRC and is complete
      if (decodeResult.decoded &&
        decodeResult.message.data !== undefined &&
        decodeResult.message.data.crcOk &&
        decodeResult.message.data.complete &&
        decodeResult.message.data.acars !== undefined) {
        message = {
          ...message,
          label: decodeResult.message.data.acars.label,
          ...(decodeResult.message.data.acars.sublabel ? { sublabel: decodeResult.message.data.acars.sublabel } : {}),
          ...(decodeResult.message.data.acars.mfi ? { mfi: decodeResult.message.data.acars.mfi } : {}),
          ...(decodeResult.message.data.acars.text ? { text: decodeResult.message.data.acars.text } : {}),
        }
      }
    }

    // C-Band puts a 10 char header in front of some message types
    // First 4 chars are some kind of message number
    // Last 6 chars are the flight number
    let cband = message.text.match(/^(?<msgno>[A-Z]\d{2}[A-Z])(?<airline>[A-Z]{2})(?<number>[0-9]{4})/);
    if (cband?.groups) {
        message.text = message.text.substring(10);
    }

    // console.log('All plugins');
    // console.log(this.plugins);
    const usablePlugins = this.plugins.filter((plugin) => {
      const qualifiers: any = plugin.qualifiers();

      if (qualifiers.labels.includes(message.label)) {
        if (qualifiers.preambles && qualifiers.preambles.length > 0) {
          const matching = qualifiers.preambles.filter((preamble: string) => { // eslint-disable-line arrow-body-style,max-len
            // console.log(message.text.substring(0, preamble.length));
            // console.log(preamble);
            return message.text.substring(0, preamble.length) === preamble;
          });
          // console.log(matching);
          return matching.length >= 1;
        } else { // eslint-disable-line no-else-return
          return true;
        }
      }

      return false;
    });

    if (options.debug) {
      console.log('Usable plugins');
      console.log(usablePlugins);
    }

    let result: DecodeResult = {
      decoded: false,
      error: 'No known decoder plugin for this message',
      decoder: {
        name: 'none',
        type: 'none',
        decodeLevel: 'none',
      },
      message: message,
      remaining: {
        text: message.text,
      },
      raw: {},
      formatted: {
        description: 'Not Decoded',
        items: [],
      },
    };

    // for-in is not happy. doing it the old way
    for (let i = 0; i < usablePlugins.length; i++) {
      const plugin = usablePlugins[i];
      result = plugin.decode(message);
      if (result.decoded) {
        break;
      }
    }

    if (cband?.groups) {
        ResultFormatter.flightNumber(result, cband.groups.airline + Number(cband.groups.number));
        message.text = cband.input;
    }

    if (options.debug) {
      console.log('Result');
      console.log(result);
    }

    return result;
  }

  lookupAirportByIata(iata: string): any {
    const airportsArray: Array<any> = []; // = this.store.state.acarsData.airports;
    // console.log(airportsArray);
    const airport = airportsArray.filter((e: any) => e.iata === iata);

    return airport;
  }
}

export default {
};
