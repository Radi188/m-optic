/**
 * Compose the saved try-on photo exactly as the review card shows it: the shot
 * on a white card, with the M-Optic mark, the frame and its colours printed
 * underneath. What the wearer approves on screen is what lands in their
 * downloads — a bare camera frame loses the one thing that makes the picture
 * worth keeping, which frame it was.
 *
 * The layout is not re-authored here. It is MEASURED off the live review card
 * (padding, gaps, type sizes, the logo box, the hairline) and multiplied by the
 * ratio between the capture and what the screen shows, so the file is the card
 * at full resolution. Restyle the card in JSX and the download follows; there
 * are no numbers here to keep in sync.
 */

/**
 * Extra space under the frame name, in CSS px, applied to the SAVED card only.
 *
 * On screen the two lines sit tight together and read as one block, which suits
 * a card you glance at. The download is looked at on its own — often printed or
 * posted — and the same gap reads cramped there, so the export opens it up. It
 * is scaled with everything else, so the proportion holds at any capture size.
 */
const EXPORT_LINE_GAP_PX = 6;

/** Used only when the card cannot be measured — proportions of the photo width. */
const FALLBACK = {
    pad: 0.045,
    logo: 0.075,
    title: 0.038,
    subtitle: 0.03,
    gapAfterPhoto: 0.05,
    gapAfterLogo: 0.035,
    gapBetweenLines: 0.018,
};

export interface PhotoCardMetrics {
    /** Capture pixels per CSS pixel of the on-screen card. */
    scale: number;
    padLeft: number;
    padRight: number;
    padTop: number;
    padBottom: number;
    borderWidth: number;
    borderColor: string;
    captionMarginTop: number;
    captionGap: number;
    logoWidth: number;
    logoHeight: number;
    titleFont: string;
    titleSize: number;
    titleColor: string;
    subtitleMarginTop: number;
    subtitleFont: string;
    subtitleSize: number;
    subtitleColor: string;
}

export interface PhotoCardOptions {
    /** Same mark the review card shows; skipped if it fails to load. */
    logoSrc: string;
    /** Frame line, e.g. "Ray-Ban - 0RX4340V". */
    title?: string | null;
    /** Colour line, e.g. "Frame color: Black · Lens color: Blue Block". */
    subtitle?: string | null;
    /** Measured off the live card; omitted only if it is not mounted. */
    metrics?: PhotoCardMetrics | null;
}

const px = (value: string): number => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

/** A CSS `font` shorthand canvas understands, built from a computed style. */
const fontOf = (style: CSSStyleDeclaration): string =>
    `${style.fontStyle} ${style.fontWeight} ${px(style.fontSize)}px ${style.fontFamily}`;

/**
 * Read the review card's own geometry.
 *
 * `canvas` is the preview canvas: its rendered width against the capture width
 * gives the scale everything else is multiplied by. Returns null when anything
 * needed is missing, and the composer then falls back to proportions.
 */
export function measurePhotoCardMetrics(
    card: HTMLElement | null,
    canvas: HTMLCanvasElement | null,
    captureWidth: number,
): PhotoCardMetrics | null {
    if (!card || !canvas || typeof window === 'undefined') return null;

    const shownWidth = canvas.getBoundingClientRect().width;
    if (!(shownWidth > 0) || !(captureWidth > 0)) return null;

    const cardStyle = getComputedStyle(card);
    const canvasStyle = getComputedStyle(canvas);
    const caption = card.querySelector<HTMLElement>('[data-photo-caption]');
    const logo = card.querySelector<HTMLElement>('[data-photo-logo]');
    const title = card.querySelector<HTMLElement>('[data-photo-title]');
    const subtitle = card.querySelector<HTMLElement>('[data-photo-subtitle]');

    const captionStyle = caption ? getComputedStyle(caption) : null;
    const titleStyle = title ? getComputedStyle(title) : null;
    const subtitleStyle = subtitle ? getComputedStyle(subtitle) : null;
    const logoBox = logo?.getBoundingClientRect();

    return {
        scale: captureWidth / shownWidth,
        padLeft: px(cardStyle.paddingLeft),
        padRight: px(cardStyle.paddingRight),
        padTop: px(cardStyle.paddingTop),
        padBottom: px(cardStyle.paddingBottom),
        borderWidth: px(canvasStyle.borderTopWidth),
        borderColor: canvasStyle.borderTopColor || 'rgba(0,0,0,0.1)',
        captionMarginTop: captionStyle ? px(captionStyle.marginTop) : 0,
        captionGap: captionStyle ? px(captionStyle.rowGap || captionStyle.gap) : 0,
        logoWidth: logoBox?.width ?? 0,
        logoHeight: logoBox?.height ?? 0,
        titleFont: titleStyle ? fontOf(titleStyle) : '',
        titleSize: titleStyle ? px(titleStyle.fontSize) : 0,
        titleColor: titleStyle?.color ?? '#101a33',
        subtitleMarginTop: subtitleStyle ? px(subtitleStyle.marginTop) : 0,
        subtitleFont: subtitleStyle ? fontOf(subtitleStyle) : '',
        subtitleSize: subtitleStyle ? px(subtitleStyle.fontSize) : 0,
        subtitleColor: subtitleStyle?.color ?? 'rgba(16,26,51,0.6)',
    };
}

let logoPromise: Promise<HTMLImageElement | null> | null = null;

/** Loaded once per session: saving twice should not re-fetch the mark. */
function loadLogo(src: string): Promise<HTMLImageElement | null> {
    logoPromise ??= new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        // A missing mark must not cost the wearer their photo.
        img.onerror = () => resolve(null);
        img.src = src;
    });

    return logoPromise;
}

/** Proportional stand-in for an unmeasurable card, in capture pixels. */
function fallbackMetrics(width: number, fontFamily: string): PhotoCardMetrics {
    const pad = Math.round(width * FALLBACK.pad);
    const titleSize = Math.max(15, Math.round(width * FALLBACK.title));
    const subtitleSize = Math.max(12, Math.round(width * FALLBACK.subtitle));
    const logo = Math.max(28, Math.round(width * FALLBACK.logo));

    return {
        scale: 1,
        padLeft: pad,
        padRight: pad,
        padTop: pad,
        padBottom: pad,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        captionMarginTop: Math.round(width * FALLBACK.gapAfterPhoto),
        captionGap: Math.round(width * FALLBACK.gapAfterLogo),
        logoWidth: logo,
        logoHeight: logo,
        titleFont: `500 ${titleSize}px ${fontFamily}`,
        titleSize,
        titleColor: '#101a33',
        subtitleMarginTop: Math.round(width * FALLBACK.gapBetweenLines),
        subtitleFont: `400 ${subtitleSize}px ${fontFamily}`,
        subtitleSize,
        subtitleColor: 'rgba(16,26,51,0.6)',
    };
}

/** Every measured length, in capture pixels. */
function scaled(m: PhotoCardMetrics): PhotoCardMetrics {
    const s = m.scale;
    const resize = (font: string, size: number) =>
        size > 0 ? font.replace(`${size}px`, `${Math.round(size * s)}px`) : font;

    return {
        ...m,
        scale: 1,
        padLeft: Math.round(m.padLeft * s),
        padRight: Math.round(m.padRight * s),
        padTop: Math.round(m.padTop * s),
        padBottom: Math.round(m.padBottom * s),
        borderWidth: Math.max(1, Math.round(m.borderWidth * s)),
        captionMarginTop: Math.round(m.captionMarginTop * s),
        captionGap: Math.round(m.captionGap * s),
        logoWidth: Math.round(m.logoWidth * s),
        logoHeight: Math.round(m.logoHeight * s),
        titleFont: resize(m.titleFont, m.titleSize),
        titleSize: Math.round(m.titleSize * s),
        subtitleMarginTop: Math.round((m.subtitleMarginTop + EXPORT_LINE_GAP_PX) * s),
        subtitleFont: resize(m.subtitleFont, m.subtitleSize),
        subtitleSize: Math.round(m.subtitleSize * s),
    };
}

/**
 * Returns a new canvas holding the finished card. The source photo is left
 * untouched, so Retake still has the original to show.
 */
export async function composePhotoCard(
    photo: HTMLCanvasElement,
    { logoSrc, title, subtitle, metrics }: PhotoCardOptions,
): Promise<HTMLCanvasElement> {
    const bodyFont =
        typeof window === 'undefined'
            ? 'sans-serif'
            : getComputedStyle(document.body).fontFamily || 'sans-serif';

    const m = scaled(metrics ?? fallbackMetrics(photo.width, bodyFont));

    const logo = await loadLogo(logoSrc);
    // Webfonts land after first paint; drawing before they do would silently
    // fall back to a system face and change the card's look.
    await document.fonts?.ready?.catch(() => undefined);

    const hasLogo = Boolean(logo) && m.logoWidth > 0 && m.logoHeight > 0;
    let captionHeight = 0;
    if (hasLogo || title || subtitle) captionHeight += m.captionMarginTop;
    if (hasLogo) captionHeight += m.logoHeight;
    if (hasLogo && (title || subtitle)) captionHeight += m.captionGap;
    if (title) captionHeight += m.titleSize;
    if (subtitle) captionHeight += (title ? m.subtitleMarginTop : 0) + m.subtitleSize;

    const card = document.createElement('canvas');
    card.width = photo.width + m.padLeft + m.padRight;
    card.height = m.padTop + photo.height + captionHeight + m.padBottom;

    const ctx = card.getContext('2d');
    if (!ctx) return photo;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, card.width, card.height);

    ctx.drawImage(photo, m.padLeft, m.padTop);
    if (m.borderWidth > 0) {
        // Drawn on the photo's own edge, like the CSS border on the preview.
        ctx.strokeStyle = m.borderColor;
        ctx.lineWidth = m.borderWidth;
        const inset = m.borderWidth / 2;
        ctx.strokeRect(
            m.padLeft + inset,
            m.padTop + inset,
            photo.width - m.borderWidth,
            photo.height - m.borderWidth,
        );
    }

    const centerX = card.width / 2;
    let y = m.padTop + photo.height + m.captionMarginTop;

    if (hasLogo && logo) {
        // `object-contain`, like the <Image> on the card: the mark keeps its own
        // aspect ratio inside the measured box and is centred in whatever space
        // is left, rather than being stretched to fill it.
        const source = logo.naturalWidth / (logo.naturalHeight || 1);
        const box = m.logoWidth / (m.logoHeight || 1);
        const drawW = source > box ? m.logoWidth : Math.round(m.logoHeight * source);
        const drawH = source > box ? Math.round(m.logoWidth / source) : m.logoHeight;

        ctx.drawImage(
            logo,
            centerX - drawW / 2,
            y + (m.logoHeight - drawH) / 2,
            drawW,
            drawH,
        );
        y += m.logoHeight;
        if (title || subtitle) y += m.captionGap;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (title) {
        ctx.font = m.titleFont;
        ctx.fillStyle = m.titleColor;
        ctx.fillText(title, centerX, y);
        y += m.titleSize + m.subtitleMarginTop;
    }

    if (subtitle) {
        ctx.font = m.subtitleFont;
        ctx.fillStyle = m.subtitleColor;
        ctx.fillText(subtitle, centerX, y);
    }

    return card;
}
