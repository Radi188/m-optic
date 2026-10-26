/**
 * Downloads a try-on GLB on the native side (no CORS on native, so catalog
 * URLs load directly — the website's /api/vto-glb proxy is not needed) and
 * hands it to the WebView engine as a base64 data: URI.
 *
 * Cached in memory per URL for the life of the app, so switching back to a
 * colourway, or re-opening the try-on, does not download it again. (The spec's
 * on-disk cache needs a file-system native module, which the app does not have
 * yet — see the try-on README.)
 */

type Progress = (fraction: number | null) => void;

const cache = new Map<string, Promise<string>>();

function download(url: string, onProgress: Progress): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.onprogress = e => onProgress(e.lengthComputable && e.total > 0 ? e.loaded / e.total : null);
    xhr.onerror = () => reject(new Error(`GLB download failed: ${url}`));
    xhr.ontimeout = () => reject(new Error(`GLB download timed out: ${url}`));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`GLB HTTP ${xhr.status}: ${url}`));
        return;
      }
      // Blob → data URL in native code; no large string maths on the JS thread.
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const comma = dataUrl.indexOf(',');
        if (comma < 0) {
          reject(new Error('Unexpected data URL from FileReader'));
          return;
        }
        // The blob's own MIME type varies by server; glTF binary is what it is.
        resolve(`data:model/gltf-binary;base64,${dataUrl.slice(comma + 1)}`);
      };
      reader.readAsDataURL(xhr.response);
    };
    xhr.send();
  });
}

/**
 * The GLB as a data: URI. `onProgress` gets 0–1 while downloading (null when
 * the server sends no length); a cached model resolves without calling it.
 */
export function loadGlb(url: string, onProgress: Progress = () => {}): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;
  const pending = download(url, onProgress).catch(err => {
    cache.delete(url); // a failed download is retried next time
    throw err;
  });
  cache.set(url, pending);
  return pending;
}
