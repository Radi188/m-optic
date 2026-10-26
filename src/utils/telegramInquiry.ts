import i18n from '../localizations/i18n';

/** M-Optic's Telegram account for product enquiries. */
export const TELEGRAM_CONTACT_URL = 'https://t.me/Mopticstm';

/**
 * A photo link Telegram can turn into an image preview. Product photos are
 * stored as AVIF, which Telegram does not preview, so those go through wsrv.nl
 * (a free public image proxy) as a JPEG. Other formats are linked as they are.
 * Drop this once the server can hand out a JPEG/WebP copy itself.
 */
export const telegramPreviewImage = (url: string) =>
  /\.avif($|\?)/i.test(url)
    ? `https://wsrv.nl/?url=${url.replace(/^https?:\/\//i, '')}&output=jpg`
    : url;

export interface InquiryDetails {
  name: string;
  brand?: string | null;
  /** Colour label as shown to the customer, e.g. "Rose Gold". */
  colourLabel?: string | null;
  /** The shop's colour code, appended in brackets when known. */
  colourCode?: string | null;
  itemCode?: string | null;
  photo?: string | null;
}

/**
 * The enquiry the customer sends us on Telegram: which frame, which colour,
 * and a photo of that colourway. A t.me link can only pre-fill text, so the
 * photo goes in as its URL — Telegram shows it as a link preview once sent.
 * The price is left out on purpose: staff quote it.
 *
 * Always written in Khmer, whatever language the app is in: it is read by the
 * shop's staff, not by the customer.
 */
export function buildTelegramInquiry(d: InquiryDetails): string {
  const tKm = i18n.getFixedT('km');
  const colour = d.colourLabel
    ? d.colourCode
      ? `${d.colourLabel} (${d.colourCode})`
      : d.colourLabel
    : null;
  return [
    tKm('TelegramEnquiryIntro'),
    '',
    tKm('TelegramEnquiryProduct', { value: d.name }),
    d.brand ? tKm('TelegramEnquiryBrand', { value: d.brand }) : null,
    colour ? tKm('TelegramEnquiryColor', { value: colour }) : null,
    d.itemCode ? tKm('TelegramEnquiryCode', { value: d.itemCode }) : null,
    // Last, on its own line: Telegram shows the picture under the message.
    d.photo ? `\n${telegramPreviewImage(d.photo)}` : null,
  ]
    .filter(line => line !== null)
    .join('\n');
}

/** The t.me link that opens a chat with the enquiry pre-filled. */
export function telegramInquiryUrl(message: string): string {
  return message
    ? `${TELEGRAM_CONTACT_URL}?text=${encodeURIComponent(message)}`
    : TELEGRAM_CONTACT_URL;
}
