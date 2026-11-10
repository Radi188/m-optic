// Runtime globals the try-on uses that React Native's TypeScript config does
// not declare (no DOM lib). `performance` is provided by React Native;
// TextDecoder/TextEncoder by Hermes or render/polyfills.ts.

declare const performance: { now(): number };

declare class TextDecoder {
  constructor(label?: string);
  decode(input?: ArrayBuffer | ArrayBufferView): string;
}

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
