/* eslint-disable no-bitwise -- UTF-8 decoding is bit manipulation. */
/**
 * The few web globals three's GLTFLoader needs that Hermes may not provide.
 * Installed only when missing, so a runtime that has them keeps its own.
 */

type DecoderInput = ArrayBuffer | ArrayBufferView | undefined;

class Utf8Decoder {
  readonly encoding = 'utf-8';

  decode(input?: DecoderInput): string {
    if (!input) return '';
    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    let out = '';
    let chunk: number[] = [];
    let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0; // BOM
    while (i < bytes.length) {
      const b0 = bytes[i++];
      let cp: number;
      if (b0 < 0x80) cp = b0;
      else if (b0 >= 0xc0 && b0 < 0xe0) cp = ((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f);
      else if (b0 >= 0xe0 && b0 < 0xf0)
        cp = ((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      else if (b0 >= 0xf0)
        cp =
          ((b0 & 0x07) << 18) |
          ((bytes[i++] & 0x3f) << 12) |
          ((bytes[i++] & 0x3f) << 6) |
          (bytes[i++] & 0x3f);
      else cp = 0xfffd;
      if (cp > 0xffff) {
        cp -= 0x10000;
        chunk.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      } else {
        chunk.push(cp);
      }
      if (chunk.length >= 8192) {
        out += String.fromCharCode.apply(null, chunk);
        chunk = [];
      }
    }
    return out + String.fromCharCode.apply(null, chunk);
  }
}

const g = globalThis as unknown as { TextDecoder?: unknown };
if (typeof g.TextDecoder === 'undefined') {
  g.TextDecoder = Utf8Decoder;
}

export {};
