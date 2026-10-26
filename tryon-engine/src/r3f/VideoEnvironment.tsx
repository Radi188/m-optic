
/**
 * VideoEnvironment — lights and reflects the frame with the room the wearer is
 * actually sitting in.
 *
 * The single cheapest realism win available: instead of a canned HDR (or none),
 * the live camera feed becomes the scene's environment map, so metal temples and
 * lens glass pick up the real wall colour, the window behind them and the lamp
 * overhead. Frames stop looking pasted on because their highlights agree with
 * the photo underneath.
 *
 * A webcam frame is not a real 360° panorama, so treating it as equirectangular
 * is an approximation — but reflections on a 14 cm object are broad and blurry,
 * and the colour/intensity is what sells it, not the geometry.
 *
 * The video is copied into a small fixed-size canvas rather than fed to
 * PMREMGenerator directly. That is not an optimisation, it is REQUIRED:
 * PMREMGenerator sizes itself from `texture.image.width`, and for a VideoTexture
 * `image` is the <video> ELEMENT, whose `width` is the HTML attribute — 0 on an
 * element sized by CSS. That zero becomes log2(0) = -Infinity, the LOD mesh list
 * comes back empty, and three throws "Cannot set properties of undefined
 * (setting 'material')" on every frame. A canvas has real dimensions.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** How often the environment is re-derived from the video (ms). */
const REFRESH_MS = 500;

/**
 * Equirectangular source size. 2:1 is the panorama aspect PMREM expects, and
 * 256 wide gives a 64px cube — plenty for the soft, broad reflections a pair of
 * glasses shows.
 */
const ENV_W = 256;
const ENV_H = 128;

/**
 * A webcam is far brighter than a real panorama of the same room (auto-exposure
 * lifts it), so reflections at full strength read as blown out.
 */
const ENVIRONMENT_INTENSITY = 0.55;

export default function VideoEnvironment({ video }: { video: HTMLVideoElement | null }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const lastRef = useRef(0);
    const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
    /** Latches on failure so a broken environment cannot throw 60×/second. */
    const failedRef = useRef(false);

    const source = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = ENV_W;
        canvas.height = ENV_H;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        return { canvas, ctx, texture };
    }, []);

    const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);

    useEffect(() => {
        const previousIntensity = scene.environmentIntensity;
        scene.environmentIntensity = ENVIRONMENT_INTENSITY;
        return () => {
            // Restore the scene and release the GPU resources we own. The render
            // target holds the mip chain, so it must go before the generator.
            scene.environment = null;
            scene.environmentIntensity = previousIntensity;
            targetRef.current?.dispose();
            targetRef.current = null;
            pmrem.dispose();
            source.texture.dispose();
        };
    }, [scene, pmrem, source]);

    useFrame(() => {
        if (failedRef.current || !video || !source.ctx) return;
        // HAVE_CURRENT_DATA plus real dimensions — drawImage on a video with no
        // decoded frame yet paints nothing and the environment goes black.
        if (video.readyState < 2 || video.videoWidth === 0) return;

        const now = performance.now();
        if (now - lastRef.current < REFRESH_MS) return;
        lastRef.current = now;

        try {
            source.ctx.drawImage(video, 0, 0, ENV_W, ENV_H);
            source.texture.needsUpdate = true;
            // Passing the existing target makes three reuse it instead of
            // allocating a fresh cube target on every refresh.
            targetRef.current = pmrem.fromEquirectangular(source.texture, targetRef.current);
            scene.environment = targetRef.current.texture;
        } catch (err) {
            failedRef.current = true;
            scene.environment = null;
            console.warn('[VTO] video environment map disabled:', err);
        }
    });

    return null;
}
