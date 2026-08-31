/**
 * Store locations, sourced from our own GET /api/v1/branches.
 *
 * This replaces the Google Places text search that used to back the store map.
 * The branches endpoint is authoritative — it is what the shop actually edits —
 * but it carries less than Places did, and most of the work here is being
 * honest about the gaps rather than inventing values:
 *
 *  • Most branches have no latitude/longitude yet, so `hasCoords` says whether
 *    a branch can be put on the map at all. Never fall back to 0/0: that is a
 *    real point in the Gulf of Guinea and it renders as a pin in the ocean.
 *  • The endpoint has one open/close window, not per-day hours, so every day
 *    gets the same row.
 *  • There are no ratings. `rating` stays 0, which the sheet already treats as
 *    "no rating to show".
 */
import api from './api';
import { buildFileUrl } from '../utils/fileUrlHelper';

/** Raw row from GET /api/v1/branches. */
export interface BranchResponse {
  id: number;
  branch_name: string;
  latitude: string | null;
  longitude: string | null;
  google_maps_link: string | null;
  address: string | null;
  phone_number: string | null;
  logo: string | null;
  description: string | null;
  /** 'HH:mm', or null when the branch has no hours set. */
  open_time: string | null;
  close_time: string | null;
  is_manually_closed: boolean;
  /** 'Open' | 'Closed' | 'Unknown' — 'Unknown' when no hours are set. */
  current_status: string;
  gallery: unknown[];
}

/**
 * 'unknown' is a real state here, not a default: a branch with no hours set
 * must not be labelled Closed, which is a claim we cannot support.
 */
export type StoreStatus = 'open' | 'closed' | 'unknown';

/** What the store screen renders. */
export interface StoreLocation {
  id: string;
  name: string;
  branch: string;
  address: string;
  phone: string;
  weekdayText: string[];
  status: StoreStatus;
  rating: number;
  userRatingCount: number;
  lat: number;
  lng: number;
  /** False when the branch has no coordinates — it cannot be mapped. */
  hasCoords: boolean;
  mapsLink: string | null;
  photoUri: string | null;
}

// Monday first, to match todayIndex() in the store screen.
const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * The endpoint exposes a single daily window, so every weekday gets the same
 * row. Formatted "Day: time" because that is what the sheet parses.
 */
function toWeekdayText(open: string | null, close: string | null): string[] {
  if (!open || !close) return [];
  return DAYS.map(day => `${day}: ${open} – ${close}`);
}

/**
 * Coordinates arrive as strings, or null. Returns null for anything that is not
 * a usable number so the caller can tell "missing" apart from "zero".
 */
function toCoord(raw: string | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toStatus(branch: BranchResponse): StoreStatus {
  if (branch.is_manually_closed) return 'closed';
  const status = (branch.current_status || '').toLowerCase();
  if (status === 'open') return 'open';
  if (status === 'closed') return 'closed';
  return 'unknown';
}

export function mapBranch(branch: BranchResponse): StoreLocation {
  const lat = toCoord(branch.latitude);
  const lng = toCoord(branch.longitude);

  return {
    id: String(branch.id),
    name: (branch.branch_name || '').trim(),
    // `description` is the shop's short code (BT, STM, SSW…) — a better tab
    // label than the full Khmer name, which overflows.
    branch: (branch.description || branch.branch_name || '').trim(),
    address: (branch.address || '').trim(),
    phone: (branch.phone_number || '').trim(),
    weekdayText: toWeekdayText(branch.open_time, branch.close_time),
    status: toStatus(branch),
    rating: 0,
    userRatingCount: 0,
    lat: lat ?? 0,
    lng: lng ?? 0,
    hasCoords: lat !== null && lng !== null,
    mapsLink: branch.google_maps_link,
    photoUri: buildFileUrl(branch.logo),
  };
}

export async function fetchBranches(): Promise<StoreLocation[]> {
  // The endpoint returns a bare array today; tolerate a { data: [...] } wrapper
  // too, since the rest of this API paginates that way.
  const res = await api.get<BranchResponse[] | { data: BranchResponse[] }>(
    '/branches',
  );
  const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return rows.map(mapBranch);
}

/** Group identical consecutive days into one row ("Mon – Sun  09:00 – 19:00"). */
export function groupHours(
  weekdayText: string[],
): { days: string; time: string }[] {
  if (!weekdayText.length) return [];
  const parsed = weekdayText.map(t => {
    const idx = t.indexOf(': ');
    return { day: t.slice(0, idx), time: t.slice(idx + 2) };
  });
  const groups: { days: string; time: string }[] = [];
  let start = 0;
  for (let i = 1; i <= parsed.length; i++) {
    if (i === parsed.length || parsed[i].time !== parsed[start].time) {
      const days =
        i - start === 1
          ? parsed[start].day
          : `${parsed[start].day} – ${parsed[i - 1].day}`;
      groups.push({ days, time: parsed[start].time });
      start = i;
    }
  }
  return groups;
}
