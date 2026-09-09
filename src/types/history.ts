/**
 * GET /profile/history — the customer's own clinical and purchase record.
 *
 * The endpoint returns `{ invoices: [], refractions: [] }`. Both arrays were
 * empty on every account we could inspect, so the row shapes below are read
 * defensively: each field is optional and several spellings are accepted, and
 * the normalisers turn a row into a view model that renders whatever actually
 * arrives instead of printing "undefined". When the real payload is known this
 * file is the only place that needs tightening.
 */

import { buildFileUrl } from '../utils/fileUrlHelper';

export type HistoryResponse = {
  invoices?: RawInvoice[] | null;
  refractions?: RawRefraction[] | null;
};

// ─── Raw rows ────────────────────────────────────────────────────────────────

export type RawEye = {
  sph?: string | number | null;
  sphere?: string | number | null;
  cyl?: string | number | null;
  cylinder?: string | number | null;
  axis?: string | number | null;
  add?: string | number | null;
  va?: string | null;
};

export type RawRefraction = {
  id?: number | string;
  created_at?: string | null;
  date?: string | null;
  examined_at?: string | null;

  /** Either nested per-eye objects… */
  right_eye?: RawEye | string | null;
  left_eye?: RawEye | string | null;
  od?: RawEye | string | null;
  os?: RawEye | string | null;

  /** …or flat columns. */
  right_sph?: string | number | null;
  right_cyl?: string | number | null;
  right_axis?: string | number | null;
  left_sph?: string | number | null;
  left_cyl?: string | number | null;
  left_axis?: string | number | null;
  right_va?: string | number | null;
  left_va?: string | number | null;

  add?: string | number | null;
  pd?: string | number | null;
  note?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  branch?: { branch_name?: string | null } | string | null;
  branch_name?: string | null;
  doctor?: { name?: string | null } | string | null;
  doctor_name?: string | null;
  /** Whoever wrote the receipt — the store's own staff, not a doctor. */
  seller?: { name?: string | null } | string | null;
  seller_name?: string | null;
};

export type RawItemInventory = {
  id?: number | string;
  item_code?: string | null;
  item_name?: string | null;
  item_name_kh?: string | null;
  image?: string | null;
  product_type?: string | null;
  slug?: string | null;
};

export type RawInvoiceItem = {
  id?: number | string;
  reference?: string | null;
  item_id?: number | string | null;
  item_name?: string | null;
  /** Unit price. Some rows carry 0 here and put the charge on `grand_total`. */
  item_price?: number | string | null;
  order_qty?: number | string | null;
  total_amount?: number | string | null;
  discount_amount?: number | string | null;
  grand_total?: number | string | null;
  note?: string | null;
  item_inventory?: RawItemInventory | null;

  /** Older/alternate spellings, kept so a shape change does not blank the list. */
  name?: string | null;
  product_name?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  price?: number | string | null;
  unit_price?: number | string | null;
  total?: number | string | null;
};

export type RawBranch = {
  id?: number | string;
  branch_name?: string | null;
  address?: string | null;
  phone_number?: string | null;
};

export type RawInvoice = {
  id?: number | string;
  invoice_reference?: string | null;
  transaction_date?: string | null;
  created_at?: string | null;
  /** "Receipt", "Order", … — the human-readable document kind. */
  event?: string | null;
  /** "1"/"0" row state, not a payment state — never shown as a badge. */
  status?: string | number | null;
  payment_method?: string | null;
  currency?: string | null;
  exchange_rate?: number | string | null;
  queue_number?: number | string | null;
  is_ready?: boolean | null;
  note?: string | null;
  description?: string | null;

  total_amount_usd?: number | string | null;
  total_amount_khr?: number | string | null;
  grand_total_usd?: number | string | null;
  grand_total_khr?: number | string | null;
  discount_amount?: number | string | null;
  discount_percentage?: number | string | null;
  receive_amount?: number | string | null;

  invoice_details?: RawInvoiceItem[] | null;
  branch?: RawBranch | string | null;

  /** Older/alternate spellings. */
  invoice_number?: string | null;
  invoice_no?: string | null;
  number?: string | null;
  code?: string | null;
  date?: string | null;
  issued_at?: string | null;
  payment_status?: string | null;
  total?: number | string | null;
  total_amount?: number | string | null;
  grand_total?: number | string | null;
  amount?: number | string | null;
  items?: RawInvoiceItem[] | null;
  details?: RawInvoiceItem[] | null;
  branch_name?: string | null;
};

// ─── View models ─────────────────────────────────────────────────────────────

export type EyeReading = {
  sph: string | null;
  cyl: string | null;
  axis: string | null;
  /** Visual acuity, e.g. "6/6" — the receipts carry this in place of ADD. */
  va: string | null;
};

export type Refraction = {
  id: string;
  /** ISO string, or null when the row carries no date at all. */
  date: string | null;
  right: EyeReading;
  left: EyeReading;
  add: string | null;
  pd: string | null;
  note: string | null;
  branch: string | null;
  doctor: string | null;
  /** Receipt seller; used as the card's title when present. */
  seller: string | null;
  /** True when neither eye carries a single readable value. */
  isEmpty: boolean;
};

export type InvoiceItem = {
  id: string;
  name: string;
  /** Stock code, e.g. "0AX10726103" — what the customer sees on the receipt. */
  code: string | null;
  /** Absolute URL, already resolved from the API's relative upload path. */
  image: string | null;
  productType: string | null;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
};

export type Invoice = {
  id: string;
  /** `invoice_reference`, e.g. "I2609031527448438778". */
  number: string | null;
  date: string | null;
  /** Document kind — "Receipt". Shown as the card's badge. */
  status: string | null;
  /** Line-items total before discount, in USD. */
  subtotal: number | null;
  discount: number | null;
  /** Payable total, in USD. */
  total: number | null;
  /** The same total in riel, as the backend computed it. */
  totalKhr: number | null;
  currency: string;
  exchangeRate: number | null;
  paymentMethod: string | null;
  queueNumber: string | null;
  /** Whether the order has been prepared for collection. */
  isReady: boolean;
  note: string | null;
  branch: string | null;
  branchAddress: string | null;
  branchPhone: string | null;
  items: InvoiceItem[];
};

export type History = {
  refractions: Refraction[];
  invoices: Invoice[];
};

// ─── Normalisers ─────────────────────────────────────────────────────────────

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function toNumber(...values: unknown[]): number | null {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      // Money often arrives as "12.50" or "$12.50".
      const n = Number(v.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Reads a field off a nested object only — a bare string is a name, not an address. */
function fieldOf(value: unknown, key: string): string | null {
  if (value && typeof value === 'object') {
    return firstString((value as Record<string, unknown>)[key]);
  }
  return null;
}

function nameOf(value: unknown, key: string): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object') {
    return firstString((value as Record<string, unknown>)[key]);
  }
  return null;
}

/**
 * Pull a combined reading apart.
 *
 * A single field often carries the whole prescription rather than just the
 * sphere — "-4.00/-2.00" (sphere/cylinder) and "-4.00/-2.00x180"
 * (sphere/cylinder×axis) are both common. Left whole, the cylinder ends up
 * rendered inside the sphere slot and the cylinder column reads as empty.
 */
export function splitCombinedEye(value: string): EyeReading {
  const text = value.trim();
  if (!text) return { sph: null, cyl: null, axis: null, va: null };

  const [spherePart, ...rest] = text.split('/');
  const remainder = rest.join('/').trim();

  // The axis is written against the cylinder, as "x180" or "×180".
  const [cylPart, axisPart] = remainder
    ? remainder.split(/[x×]/i)
    : [undefined, undefined];

  return {
    sph: firstString(spherePart),
    cyl: firstString(cylPart),
    axis: firstString(axisPart),
    va: null,
  };
}

/**
 * "-4.00 / -2.00" when a cylinder is present, otherwise just the sphere.
 * A card gives each eye one value slot, and the cylinder belongs beside its
 * sphere rather than being dropped.
 */
export function formatEye(reading: EyeReading): string {
  if (!reading.sph && !reading.cyl) return '—';
  if (!reading.cyl) return reading.sph ?? '—';
  return `${reading.sph ?? '—'} / ${reading.cyl}`;
}

/** An eye can arrive as an object, a bare string ("-4.00"), or flat columns. */
function toEye(
  nested: RawEye | string | null | undefined,
  sph: unknown,
  cyl: unknown,
  axis: unknown,
  va?: unknown,
): EyeReading {
  if (typeof nested === 'string') {
    return { ...splitCombinedEye(nested), va: firstString(va) };
  }

  const sphere = firstString(nested?.sph, nested?.sphere, sph);
  const cylinder = firstString(nested?.cyl, nested?.cylinder, cyl);
  const ax = firstString(nested?.axis, axis);
  const acuity = firstString(nested?.va, va);

  // A flat sphere column can carry the combined form too — only trust it to
  // fill in cyl/axis that nothing else supplied.
  if (sphere && sphere.includes('/')) {
    const parsed = splitCombinedEye(sphere);
    return {
      sph: parsed.sph,
      cyl: cylinder ?? parsed.cyl,
      axis: ax ?? parsed.axis,
      va: acuity,
    };
  }

  return { sph: sphere, cyl: cylinder, axis: ax, va: acuity };
}

export function normaliseRefraction(raw: RawRefraction, index: number): Refraction {
  const right = toEye(
    raw.right_eye ?? raw.od,
    raw.right_sph,
    raw.right_cyl,
    raw.right_axis,
    raw.right_va,
  );
  const left = toEye(
    raw.left_eye ?? raw.os,
    raw.left_sph,
    raw.left_cyl,
    raw.left_axis,
    raw.left_va,
  );

  const readings = [right.sph, right.cyl, right.axis, left.sph, left.cyl, left.axis];

  return {
    id: String(raw.id ?? `refraction-${index}`),
    date: firstString(raw.created_at, raw.date, raw.examined_at),
    right,
    left,
    add: firstString(raw.add),
    pd: firstString(raw.pd),
    note: firstString(raw.note, raw.notes, raw.diagnosis),
    branch: nameOf(raw.branch, 'branch_name') ?? firstString(raw.branch_name),
    doctor: nameOf(raw.doctor, 'name') ?? firstString(raw.doctor_name),
    seller: nameOf(raw.seller, 'name') ?? firstString(raw.seller_name),
    isEmpty: readings.every(v => v === null),
  };
}

/**
 * Money arrives as "248.0000" strings, and a zero is meaningful (a free
 * lens) — so `0` must survive rather than falling through to the next
 * candidate the way `toNumber`'s truthiness check would allow.
 */
function money(...values: unknown[]): number | null {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const n = toNumber(v);
    if (n !== null) return n;
  }
  return null;
}

function normaliseInvoiceItem(raw: RawInvoiceItem, index: number): InvoiceItem {
  const inventory = raw.item_inventory ?? null;

  // `item_price` is 0 on rows where the charge was written to `grand_total`
  // instead (a lens billed as part of the frame), so the line total is the
  // reliable figure and the unit price is only shown when it is non-zero.
  const total = money(raw.grand_total, raw.total_amount, raw.total, raw.price);
  const unitPrice = money(raw.item_price, raw.unit_price, raw.price);

  return {
    id: String(raw.id ?? raw.reference ?? `item-${index}`),
    name:
      firstString(
        raw.item_name,
        inventory?.item_name,
        raw.name,
        raw.product_name,
        raw.description,
      ) ?? '—',
    code: firstString(inventory?.item_code, raw.reference),
    image: buildFileUrl(inventory?.image ?? null),
    productType: firstString(inventory?.product_type),
    quantity: toNumber(raw.order_qty, raw.quantity, raw.qty),
    unitPrice: unitPrice && unitPrice > 0 ? unitPrice : null,
    total,
  };
}

export function normaliseInvoice(raw: RawInvoice, index: number): Invoice {
  const items = (raw.invoice_details ?? raw.items ?? raw.details ?? []).map(
    normaliseInvoiceItem,
  );

  return {
    id: String(raw.id ?? `invoice-${index}`),
    number: firstString(
      raw.invoice_reference,
      raw.invoice_number,
      raw.invoice_no,
      raw.number,
      raw.code,
    ),
    // `transaction_date` is local store time and is what the receipt shows;
    // `created_at` is the UTC fallback.
    date: firstString(raw.transaction_date, raw.created_at, raw.date, raw.issued_at),
    // `status` is a "1"/"0" row flag, so the badge uses `event` ("Receipt")
    // and falls back to the payment status when a future payload sends one.
    status: firstString(raw.event, raw.payment_status),
    subtotal: money(raw.total_amount_usd, raw.total_amount),
    discount: money(raw.discount_amount),
    total: money(
      raw.grand_total_usd,
      raw.grand_total,
      raw.total,
      raw.total_amount_usd,
      raw.amount,
    ),
    totalKhr: money(raw.grand_total_khr, raw.total_amount_khr),
    // The API's `currency` is a code ("usd"); the UI wants a symbol.
    currency: currencySymbol(raw.currency),
    exchangeRate: money(raw.exchange_rate),
    paymentMethod: firstString(raw.payment_method),
    queueNumber: firstString(raw.queue_number),
    isReady: raw.is_ready === true,
    note: firstString(raw.note, raw.description),
    branch: nameOf(raw.branch, 'branch_name') ?? firstString(raw.branch_name),
    branchAddress: fieldOf(raw.branch, 'address'),
    branchPhone: fieldOf(raw.branch, 'phone_number'),
    items,
  };
}

function currencySymbol(code: unknown): string {
  const value = firstString(code)?.toLowerCase();
  if (!value) return '$';
  if (value === 'usd' || value === '$') return '$';
  if (value === 'khr' || value === '៛') return '៛';
  return value.toUpperCase() + ' ';
}

/** Milliseconds for sorting; undated rows sort last. */
function dateValue(date: string | null): number {
  if (!date) return -Infinity;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}

/**
 * Newest first. The API returns no guaranteed order, and the history lists are
 * only readable when the most recent exam or invoice is at the top. Rows the
 * backend gave no usable date keep their original relative order at the end.
 */
export function sortByDateDesc<T extends { date: string | null }>(rows: T[]): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const diff = dateValue(b.row.date) - dateValue(a.row.date);
      if (diff !== 0 && !Number.isNaN(diff)) return diff;
      return a.index - b.index; // Stable for equal or missing dates.
    })
    .map(entry => entry.row);
}

export function normaliseHistory(raw: HistoryResponse | null | undefined): History {
  return {
    refractions: sortByDateDesc((raw?.refractions ?? []).map(normaliseRefraction)),
    invoices: sortByDateDesc((raw?.invoices ?? []).map(normaliseInvoice)),
  };
}
