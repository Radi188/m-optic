/**
 * TEMPORARY — sample /profile/history payload for previewing the History UI.
 *
 * Delete this file and the USE_MOCK_HISTORY flag in historyController once the
 * real endpoint returns rows.
 *
 * It is deliberately written in the *raw* API shape rather than as finished
 * view models, so it runs through `normaliseHistory` exactly like a real
 * response — which means it also exercises the shapes the normaliser has to
 * tolerate: nested eye objects, flat columns, od/os aliases, a row with no
 * readings, a row with no date, and money as both string and number.
 */
import type { HistoryResponse } from '../types/history';

export const MOCK_HISTORY: HistoryResponse = {
  refractions: [
    // Nested per-eye objects — the most likely real shape.
    {
      id: 101,
      created_at: '2026-08-14T09:30:00Z',
      right_eye: { sph: '-4.00', cyl: '-0.75', axis: 180, va: '6/6' },
      left_eye: { sph: '-3.75', cyl: '-0.50', axis: 175, va: '6/9' },
      add: '+1.00',
      pd: 62,
      notes: 'Mild astigmatism in both eyes. Recommended anti-glare coating.',
      doctor: { name: 'Dr. Sok Dara' },
      seller: { name: 'Chan Rithy' },
      branch: { branch_name: 'Toul Kork' },
    },
    // Deliberately out of order — the list sorts newest first.
    {
      id: 102,
      created_at: '2025-02-03T14:05:00Z',
      right_eye: { sphere: '-3.50', cylinder: '-0.75', axis: 178 },
      left_eye: { sphere: '-3.25', cylinder: '-0.50', axis: 170 },
      pd: 62,
      diagnosis: 'Slight progression since the previous visit.',
      doctor_name: 'Dr. Chan Sophea',
      seller_name: 'Meas Sreyneang',
      branch_name: 'Aeon Mall 2',
    },
    // Flat columns instead of nested objects.
    {
      id: 103,
      date: '2025-11-20',
      right_sph: '-3.75',
      right_cyl: '-0.50',
      seller_name: 'Sok Pisey',
      right_va: '6/6',
      left_va: '6/6',
      right_axis: '180',
      left_sph: '-3.50',
      left_cyl: '-0.50',
      left_axis: '172',
      pd: '61',
      branch_name: 'Toul Kork',
    },
    // A single field carrying the whole prescription — sphere/cylinder, and
    // sphere/cylinder×axis. Both must split rather than land in the sphere slot.
    {
      id: 106,
      created_at: '2025-06-18T09:00:00Z',
      right_eye: '-4.00/-2.00',
      left_eye: '-3.75/-1.75x180',
      pd: '62',
      note: 'Combined reading as recorded in store.',
      doctor_name: 'Dr. Kim Chanthy',
      branch_name: 'Toul Kork',
    },
    // od/os aliases carrying a bare sphere string.
    {
      id: 104,
      created_at: '2024-06-11T10:00:00Z',
      od: '-3.25',
      os: '-3.00',
      note: 'First examination.',
      branch_name: 'Sen Sok',
    },
    // No readings at all — should render "No reading recorded", not undefined.
    {
      id: 105,
      created_at: '2024-01-08T11:20:00Z',
      branch_name: 'Toul Kork',
    },
  ],

  invoices: [
    {
      id: 9001,
      invoice_number: 'INV-2026-0142',
      created_at: '2026-08-14T10:15:00Z',
      status: 'paid',
      total: '235.00',
      currency: '$',
      branch: { branch_name: 'Toul Kork' },
      items: [
        { id: 1, product_name: 'Ray-Ban Aviator RB3025', quantity: 1, total: '165.00' },
        { id: 2, product_name: 'Anti-glare coating', quantity: 2, total: '50.00' },
        { id: 3, product_name: 'Lens cleaning kit', quantity: 1, total: '20.00' },
      ],
    },
    {
      id: 9002,
      invoice_no: 'INV-2026-0098',
      date: '2026-03-02',
      payment_status: 'pending',
      grand_total: 89.5,
      branch_name: 'Aeon Mall 2',
      details: [
        { name: 'Oakley Holbrook', qty: 1, price: 89.5 },
      ],
    },
    {
      id: 9003,
      number: 'INV-2025-0771',
      created_at: '2025-11-20T16:40:00Z',
      status: 'cancelled',
      amount: '$120.00',
      branch_name: 'Toul Kork',
      items: [{ name: 'Progressive lenses', quantity: 2, total: 120 }],
    },
    // Bare row: no items, no branch, money as a plain number.
    {
      id: 9004,
      code: 'INV-2025-0304',
      created_at: '2025-02-03T15:00:00Z',
      status: 'paid',
      total_amount: 45,
    },
  ],
};
