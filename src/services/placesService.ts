import Config from 'react-native-config';

const API_KEY: string = (Config as any).GOOGLE_MAPS_API_KEY ?? '';

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.internationalPhoneNumber',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
].join(',');

export type PlaceLocation = {
  placeId: string;
  name: string;
  branch: string;
  address: string;
  phone: string;
  weekdayText: string[];
  isOpen: boolean;
  rating: number;
  userRatingCount: number;
  lat: number;
  lng: number;
  photoUri: string | null;
};

export function buildPhotoUri(photoName: string): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=800&skipHttpRedirect=false&key=${API_KEY}`;
}

function extractBranch(name: string): string {
  const stripped = name
    .replace(/m[\s-]?optic/i, '')
    .trim()
    .replace(/^[-–,\s]+/, '')
    .trim();
  return stripped || name;
}

export async function searchMOpticLocations(): Promise<PlaceLocation[]> {
  const res = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: 'M Optic',
      // Restrict results to Cambodia bounding box
      locationRestriction: {
        rectangle: {
          low:  { latitude: 10.4, longitude: 102.3 },
          high: { latitude: 14.7, longitude: 107.6 },
        },
      },
    }),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    console.error('[Places API]', json.error?.message ?? 'Unknown error');
    return [];
  }

  const places: any[] = json.places ?? [];

  return places.map(p => ({
    placeId: p.id,
    name: p.displayName?.text ?? '',
    branch: extractBranch(p.displayName?.text ?? ''),
    address: p.formattedAddress ?? '',
    phone: p.internationalPhoneNumber ?? '',
    weekdayText: p.regularOpeningHours?.weekdayDescriptions ?? [],
    isOpen: p.currentOpeningHours?.openNow ?? false,
    rating: p.rating ?? 0,
    userRatingCount: p.userRatingCount ?? 0,
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    photoUri: p.photos?.[0]?.name ? buildPhotoUri(p.photos[0].name) : null,
  }));
}

export function getEmbedUrl(placeId: string): string {
  return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=place_id:${placeId}&zoom=16`;
}

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
