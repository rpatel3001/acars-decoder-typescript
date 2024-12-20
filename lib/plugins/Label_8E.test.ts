import { MessageDecoder } from '../MessageDecoder';
import { Label_8E } from './Label_8E';

test('decodes Label 8E sample 1', () => {
  const decoder = new MessageDecoder();
  const decoderPlugin = new Label_8E(decoder);

  expect(decoderPlugin.decode).toBeDefined();
  expect(decoderPlugin.name).toBe('label-8e');
  expect(decoderPlugin.qualifiers).toBeDefined();
  expect(decoderPlugin.qualifiers()).toEqual({
    labels: ['8E'],
  });

  const decodeResult = decoderPlugin.decode({ text: 'EGSS,1618' });
  
  expect(decodeResult.decoded).toBe(true);
  expect(decodeResult.decoder.name).toBe('label-8e');
  expect(decodeResult.formatted.description).toBe('ETA Report');
  expect(decodeResult.message.text).toBe('EGSS,1618');
  expect(decodeResult.raw.arrival_icao).toBe('EGSS');
  expect(decodeResult.formatted.items.length).toBe(2);
  expect(decodeResult.formatted.items[0].type).toBe('time_of_day');
  expect(decodeResult.formatted.items[0].code).toBe('ETA');
  expect(decodeResult.formatted.items[0].label).toBe('Estimated Time of Arrival');
  expect(decodeResult.formatted.items[0].value).toBe('16:18:00');
  expect(decodeResult.formatted.items[1].type).toBe('icao');
  expect(decodeResult.formatted.items[1].code).toBe('DST');
  expect(decodeResult.formatted.items[1].label).toBe('Destination');
  expect(decodeResult.formatted.items[1].value).toBe('EGSS');
});
