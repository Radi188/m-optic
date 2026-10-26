import { ENGINE_JS } from './engineBundle.generated';

/**
 * Where the try-on's heavy, self-hosted assets live: MediaPipe's WASM and
 * face_landmarker.task under /mediapipe, the Draco decoder under /draco. They
 * are the website's own copies (first-party, not a third-party CDN).
 *
 * The page is loaded with this origin as its base URL, so the engine's
 * absolute paths (/mediapipe/wasm, /draco/) resolve to it and are same-origin
 * — no CORS — and the page is a secure https context, which getUserMedia
 * requires.
 *
 * Only the Vercel deployment serves these files today (checked: m-eyewear.com
 * returns 404 for them). Point this at the production web domain once it
 * serves /mediapipe and /draco.
 */
export const VTO_ASSET_ORIGIN = 'https://moptic-ecommerce-website.vercel.app';

/** The WebView page: an empty root and the engine bundle, inlined. */
export function buildEngineHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>html,body,#root{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}</style>
</head>
<body>
<div id="root"></div>
<script>${ENGINE_JS.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
}
