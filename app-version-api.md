# Mobile app — forced update endpoint

The app asks the backend for the oldest version that may still be used. When
the installed version is older, the app shows a full-screen "Update required"
screen with an **Update now** button and cannot be used until it is updated.

Backend: Laravel 8 API at `/api/v1`. Public (no token).

## Endpoint

```
GET {BASE_URL}/api/v1/app-version?platform=ios
GET {BASE_URL}/api/v1/app-version?platform=android
Accept: application/json
```

### Response

```json
{
  "data": {
    "min_version": "1.6",
    "store_url": "https://apps.apple.com/app/id6810026031"
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `min_version` | string \| null | Oldest version allowed, e.g. `"1.6"` or `"1.6.2"`. `null` = nobody is forced. |
| `store_url` | string \| null | Where **Update now** goes. Optional — the app falls back to its own store page. |

- Compare uses the store **version name** (iOS "Version", Android `versionName`),
  numerically per part: `1.10` is newer than `1.9`.
- Keep a separate value per platform: iOS and Android are reviewed and released
  on different days, so raise each one only once that build is live in its store.
- Store URLs:
  - iOS: `https://apps.apple.com/app/id6810026031`
  - Android: `https://play.google.com/store/apps/details?id=cross.moptic.app`

## Behaviour in the app

- The app opens straight away; the check runs in the background (8 s timeout)
  and again each time the app returns to the foreground.
- **Fails open:** if the endpoint is missing, errors or times out, nobody is
  blocked. A server outage must never lock every customer out.
- Once a device has been told to update, a later failed check does not unlock it.
- Store it somewhere admin-editable (e.g. a settings table), so raising the
  minimum needs no deploy.
