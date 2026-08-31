/**
 * glassesModel — shared loading pipeline for a glasses GLB.
 *
 * `essilor.glb` is a binary glTF, so (unlike the old .obj path) it cannot be
 * embedded in the WebView HTML as text. Instead it is fetched once from the
 * Metro asset server on the RN JS thread, converted to a base64 `data:` URI and
 * handed to Three.js `GLTFLoader` inside the WebView. A `data:` URI is
 * same-origin for the WebView, so this works in dev and in release builds on
 * both platforms without any CORS/file-access configuration.
 *
 * The result is cached module-wide PER URL, so the 3-D viewer and the AR try-on
 * share a single fetch + encode for the same model.
 *
 * Products carry their own .glb (assets[type='3d_model']). Those are fetched the
 * same way rather than handed to GLTFLoader as a plain https URL, because the
 * WebView runs on a 'http://localhost' origin and the asset host sends no
 * Access-Control-Allow-Origin — a direct load would be blocked by CORS. RN's
 * own fetch has no such restriction, so the bytes come across here and go in as
 * a data: URI. `essilor.glb` remains the fallback when a product has no model.
 */
import { useEffect, useState } from 'react';
import { Image } from 'react-native';

// Metro gives us a URL for the .glb asset ('glb' is in metro.config.js assetExts).
export const GLB_URI = Image.resolveAssetSource(
  require('../assets/models/essilor.glb'),
).uri;

const B64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/* eslint-disable no-bitwise -- base64 is inherently bit twiddling */
/** Minimal base64 encoder — RN has no reliable global `btoa`. */
function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    chunk += B64_CHARS[b0 >> 2];
    chunk += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    chunk += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    chunk += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : '=';
    // Flush periodically so we never build one huge rope in a tight loop.
    if (chunk.length >= 16384) {
      parts.push(chunk);
      chunk = '';
    }
  }
  parts.push(chunk);
  return parts.join('');
}
/* eslint-enable no-bitwise */

/** Native path: Blob -> FileReader.readAsDataURL (no big JS string math). */
async function viaBlob(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  const comma = dataUrl.indexOf(',');
  if (comma < 0) {
    throw new Error('Unexpected data URL from FileReader');
  }
  return dataUrl.slice(comma + 1);
}

/** Fallback path: ArrayBuffer -> manual base64. Re-fetches (body is consumed). */
async function viaArrayBuffer(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return bytesToBase64(new Uint8Array(buf));
}

const cache = new Map<string, Promise<string>>();

/**
 * Fetches + encodes a GLB once per URL; subsequent callers reuse the promise.
 * Omit `url` for the bundled fallback model.
 */
export function loadGlbDataUri(url?: string | null): Promise<string> {
  const src = url || GLB_URI;
  const hit = cache.get(src);
  if (hit) {
    return hit;
  }

  const pending = (async () => {
    let base64: string;
    try {
      base64 = await viaBlob(src);
    } catch (e) {
      console.warn('[glassesModel] Blob path failed, retrying as ArrayBuffer:', e);
      base64 = await viaArrayBuffer(src);
    }
    return `data:model/gltf-binary;base64,${base64}`;
  })().catch(e => {
    cache.delete(src); // allow a retry on the next mount
    throw e;
  });

  cache.set(src, pending);
  return pending;
}

/**
 * Hook wrapper: `{ dataUri, error }`, both null while loading.
 * Pass the product's own model URL; omit it to get the bundled fallback.
 */
export function useGlassesGlb(url?: string | null): {
  dataUri: string | null;
  error: Error | null;
} {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    setDataUri(null);
    setError(null);
    loadGlbDataUri(url)
      .then(uri => {
        if (alive) {
          setDataUri(uri);
        }
      })
      .catch(e => {
        console.warn('[glassesModel] GLB load failed:', e);
        if (alive) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return { dataUri, error };
}
