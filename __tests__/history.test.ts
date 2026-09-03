import {
  normaliseHistory,
  normaliseInvoice,
  normaliseRefraction,
  sortByDateDesc,
} from '../src/types/history';

describe('history normalisers', () => {
  it('handles the documented empty payload', () => {
    expect(normaliseHistory({ invoices: [], refractions: [] })).toEqual({
      invoices: [],
      refractions: [],
    });
  });

  it('handles a missing or null payload without throwing', () => {
    expect(normaliseHistory(null)).toEqual({ invoices: [], refractions: [] });
    expect(normaliseHistory({})).toEqual({ invoices: [], refractions: [] });
  });

  it('reads nested per-eye objects', () => {
    const r = normaliseRefraction(
      {
        id: 7,
        created_at: '2026-05-12T00:00:00Z',
        right_eye: { sph: '-4.00', cyl: '-0.50', axis: 180 },
        left_eye: { sphere: '-3.75', cylinder: null, axis: null },
        pd: 62,
        notes: 'Mild astigmatism',
      },
      0,
    );

    expect(r.id).toBe('7');
    expect(r.right).toEqual({ sph: '-4.00', cyl: '-0.50', axis: '180', va: null });
    expect(r.left.sph).toBe('-3.75');
    expect(r.left.cyl).toBeNull();
    expect(r.pd).toBe('62');
    expect(r.note).toBe('Mild astigmatism');
    expect(r.isEmpty).toBe(false);
  });

  it('reads visual acuity from nested objects and flat columns', () => {
    const nested = normaliseRefraction(
      { right_eye: { sph: '-1.00', va: '6/6' }, left_eye: { sph: '-1.25' } },
      0,
    );
    expect(nested.right.va).toBe('6/6');
    expect(nested.left.va).toBeNull();

    const flat = normaliseRefraction(
      { right_sph: '-1.00', right_va: '6/9', left_sph: '-1.25', left_va: 6 },
      0,
    );
    expect(flat.right.va).toBe('6/9');
    expect(flat.left.va).toBe('6');
  });

  it('reads flat columns and od/os aliases', () => {
    const flat = normaliseRefraction(
      { right_sph: '-1.25', left_sph: '-1.50', date: '2026-01-02' },
      1,
    );
    expect(flat.right.sph).toBe('-1.25');
    expect(flat.date).toBe('2026-01-02');

    const alias = normaliseRefraction({ od: '-2.00', os: '-2.25' }, 2);
    expect(alias.right.sph).toBe('-2.00');
    expect(alias.left.sph).toBe('-2.25');
  });

  it('flags a row with no readings instead of printing undefined', () => {
    const r = normaliseRefraction({ id: 3, created_at: '2026-01-01' }, 0);
    expect(r.isEmpty).toBe(true);
    expect(r.right.sph).toBeNull();
  });

  it('falls back to an index-based id when the row has none', () => {
    expect(normaliseRefraction({}, 4).id).toBe('refraction-4');
    expect(normaliseInvoice({}, 2).id).toBe('invoice-2');
  });

  it('parses money in several shapes', () => {
    expect(normaliseInvoice({ total: '125.50' }, 0).total).toBe(125.5);
    expect(normaliseInvoice({ grand_total: 99 }, 0).total).toBe(99);
    expect(normaliseInvoice({ amount: '$42.00' }, 0).total).toBe(42);
    expect(normaliseInvoice({}, 0).total).toBeNull();
  });

  it('reads invoice numbers, status and line items', () => {
    const inv = normaliseInvoice(
      {
        id: 11,
        invoice_no: 'INV-0042',
        payment_status: 'paid',
        total: '120.00',
        currency: '$',
        branch: { branch_name: 'Toul Kork' },
        items: [
          { id: 1, product_name: 'Aviator frame', qty: 1, total: '90.00' },
          { name: 'Lenses', quantity: 2, price: 15 },
        ],
      },
      0,
    );

    expect(inv.number).toBe('INV-0042');
    expect(inv.status).toBe('paid');
    expect(inv.branch).toBe('Toul Kork');
    expect(inv.items).toHaveLength(2);
    expect(inv.items[0]).toEqual({
      id: '1',
      name: 'Aviator frame',
      quantity: 1,
      total: 90,
    });
    expect(inv.items[1].id).toBe('item-1');
    expect(inv.items[1].total).toBe(15);
  });

  it('defaults the currency and copes with absent items', () => {
    const inv = normaliseInvoice({ id: 1 }, 0);
    expect(inv.currency).toBe('$');
    expect(inv.items).toEqual([]);
  });

  it('returns refractions and invoices newest first', () => {
    const history = normaliseHistory({
      refractions: [
        { id: 1, created_at: '2024-01-10T09:00:00Z', right_eye: { sph: '-1' } },
        { id: 2, created_at: '2026-05-12T09:00:00Z', right_eye: { sph: '-2' } },
        { id: 3, created_at: '2025-03-01T09:00:00Z', right_eye: { sph: '-3' } },
      ],
      invoices: [
        { id: 'a', date: '2025-06-01' },
        { id: 'b', date: '2026-02-02' },
      ],
    });

    expect(history.refractions.map(r => r.id)).toEqual(['2', '3', '1']);
    expect(history.invoices.map(i => i.id)).toEqual(['b', 'a']);
  });

  it('sorts same-day exams by time, not just date', () => {
    const history = normaliseHistory({
      refractions: [
        { id: 'morning', created_at: '2026-05-12T08:30:00Z' },
        { id: 'evening', created_at: '2026-05-12T18:45:00Z' },
      ],
    });

    expect(history.refractions.map(r => r.id)).toEqual(['evening', 'morning']);
  });

  it('puts undated rows last while keeping their original order', () => {
    const rows = [
      { id: 'no-date-1', date: null },
      { id: 'old', date: '2020-01-01' },
      { id: 'no-date-2', date: null },
      { id: 'new', date: '2026-01-01' },
      { id: 'unparseable', date: 'not a date' },
    ];

    expect(sortByDateDesc(rows).map(r => r.id)).toEqual([
      'new',
      'old',
      'no-date-1',
      'no-date-2',
      'unparseable',
    ]);
  });

  it('does not mutate the array it is given', () => {
    const rows = [{ id: 'a', date: '2020-01-01' }, { id: 'b', date: '2026-01-01' }];
    const sorted = sortByDateDesc(rows);

    expect(rows.map(r => r.id)).toEqual(['a', 'b']);
    expect(sorted.map(r => r.id)).toEqual(['b', 'a']);
  });
});

describe('combined eye readings', () => {
  it('splits "sphere/cylinder" into separate fields', () => {
    const r = normaliseRefraction(
      { id: 1, right_eye: '-4.00/-2.00', left_eye: '-3.75/-1.25' },
      0,
    );
    expect(r.right).toEqual({ sph: '-4.00', cyl: '-2.00', axis: null, va: null });
    expect(r.left.cyl).toBe('-1.25');
    expect(r.isEmpty).toBe(false);
  });

  it('splits "sphere/cylinder x axis", either separator', () => {
    expect(
      normaliseRefraction({ right_eye: '-4.00/-2.00x180' }, 0).right,
    ).toEqual({ sph: '-4.00', cyl: '-2.00', axis: '180', va: null });

    expect(
      normaliseRefraction({ right_eye: '-4.00/-2.00×90' }, 0).right,
    ).toEqual({ sph: '-4.00', cyl: '-2.00', axis: '90', va: null });
  });

  it('leaves a plain sphere untouched', () => {
    expect(normaliseRefraction({ right_eye: '-4.00' }, 0).right).toEqual({
      sph: '-4.00',
      cyl: null,
      axis: null,
      va: null,
    });
  });

  it('splits a combined value arriving in a flat column', () => {
    const r = normaliseRefraction({ right_sph: '-2.50/-0.75x10' }, 0);
    expect(r.right).toEqual({ sph: '-2.50', cyl: '-0.75', axis: '10', va: null });
  });

  it('prefers explicit columns over values parsed from the combined string', () => {
    const r = normaliseRefraction(
      { right_sph: '-2.50/-0.75', right_cyl: '-1.00', right_axis: '95' },
      0,
    );
    expect(r.right).toEqual({ sph: '-2.50', cyl: '-1.00', axis: '95', va: null });
  });

  it('handles whitespace and an empty string', () => {
    expect(normaliseRefraction({ right_eye: '  -1.00 / -0.50  ' }, 0).right)
      .toEqual({ sph: '-1.00', cyl: '-0.50', axis: null, va: null });
    expect(normaliseRefraction({ right_eye: '   ' }, 0).right.sph).toBeNull();
  });
});
