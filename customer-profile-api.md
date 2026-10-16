# Customer app — profile API

Endpoints the customer mobile app uses to show and edit the logged-in
customer's profile: details, avatar, and account deletion.

Backend: Laravel 8 API at `/api/v1`, Sanctum bearer tokens issued by the
customer OTP + PIN login (`/auth/verify-otp`, `/auth/login-pin`).

---

## 1. Conventions

### Base URL and headers

```
{BASE_URL}/api/v1
```

Every request below needs the customer's token:

```
Authorization: Bearer {token}
Accept: application/json
```

Send `Accept: application/json` on every request, or Laravel may answer
errors with an HTML redirect instead of JSON.

### Errors

| Status | When | Body |
|---|---|---|
| 401 | Missing, expired or revoked token | `{ "message": "Unauthenticated." }` |
| 403 | Token belongs to a staff account, not a customer (delete only) | `{ "message": "Only customers can delete their account." }` |
| 422 | Validation failed | `{ "errors": { "field": ["message", …] } }` |

On 401, clear the stored token and send the user back to login.

---

## 2. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/profile` | Load the profile screen |
| PUT | `/profile` | Edit name, email, gender, age |
| POST | `/profile/avatar` | Upload or replace the profile photo |
| DELETE | `/profile` | Delete the account |

---

### 2.1 `GET /profile`

Returns the customer, their latest prescription and loyalty summary.

**Response 200**

```json
{
  "id": 123,
  "customer_name": "Sok Dara",
  "phone_number": "012345678",
  "email": "dara@example.com",
  "gender": "Male",
  "age": 32,
  "avatar_url": "https://example.com/storage/avatars/abc.jpg",
  "is_member": 1,
  "order_count": 4,
  "loyalty_points": 250,
  "loyalty_total_points": 900,
  "tier": { "id": 2, "name": "Silver", "min_points": 500, "benefits": [ … ] },
  "next_tier": { … },
  "points_to_next_tier": 100,
  "progress_percentage": 80,
  "prescription": {
    "right_eye": "…",
    "left_eye": "…",
    "add": "…",
    "pd": "…",
    "created_at": "2026-09-01T03:20:00.000000Z"
  }
}
```

Fields that can be `null`: `email`, `gender`, `age`, `avatar_url`, `tier`,
`next_tier`, `prescription`.

Use this endpoint to fill the edit form.

---

### 2.2 `PUT /profile`

Updates the profile. **Every field is optional.** Send only what changed.

**Body (JSON)**

| Field | Type | Rules |
|---|---|---|
| `customer_name` | string | max 255 |
| `email` | string | valid email, max 255 |
| `gender` | string | `male`, `female` or `other` (lowercase, see note) |
| `age` | integer | 0–150 |

```json
{
  "customer_name": "Sok Dara",
  "email": "dara@example.com",
  "gender": "male",
  "age": 32
}
```

**Response 200**

```json
{
  "message": "Profile updated",
  "customer": { "id": 123, "customer_name": "Sok Dara", … }
}
```

`customer` is the raw customer record. It does **not** include
`avatar_url`, `tier` or the loyalty summary. After saving, call
`GET /profile` again to refresh the screen; don't build the screen from
this response.

**Response 422 example**

```json
{
  "errors": {
    "email": ["The email must be a valid email address."],
    "age": ["The age must be an integer."]
  }
}
```

Show each message under its field.

> **Gender note:** customers created at the shop are saved as `Male` /
> `Female` / `Other` (capitalised), and `GET /profile` returns that value.
> `PUT /profile` currently only accepts lowercase. Lowercase the value
> before sending it (`gender.toLowerCase()`), and compare without case
> when preselecting the dropdown.

**Cannot be edited here:**
- **Phone number.** It is the login identity.
- **Address.** Not supported by the API yet.

---

### 2.3 `POST /profile/avatar`

Uploads a new profile photo. The old one is deleted.

**Body:** `multipart/form-data`

| Field | Type | Rules |
|---|---|---|
| `avatar` | file | required, image, jpeg / png / jpg / webp, max 5 MB |

Compress or resize on the device before upload; anything over 5 MB is
rejected.

**Response 200**

```json
{
  "message": "Avatar updated",
  "avatar_url": "https://example.com/storage/avatars/xyz.jpg"
}
```

Use the returned `avatar_url` right away. The URL changes on each
upload, so image caches won't show the old photo.

---

### 2.4 `DELETE /profile`

Deletes the account. This **cannot be undone**: always show a
confirmation dialog first.

What happens:
- name becomes "Deleted customer";
- phone, email, address, avatar, PIN and push token are erased;
- every token for the account is revoked, including the current one.

Purchase and prescription history stay in the shop's records but are no
longer linked to anyone reachable.

**Body:** none

**Response 200**

```json
{ "message": "Account deleted successfully." }
```

After success, clear the stored token and all cached customer data, then
go to the login / welcome screen. The phone number can't log in to this
account again.

---

## 3. Suggested edit-profile flow

```
Profile screen
   │  GET /profile
   │
   ├─ Tap avatar → pick / crop photo → POST /profile/avatar
   │                → replace image with returned avatar_url
   │
   ├─ Tap "Edit" → form prefilled from GET /profile
   │     (phone shown read-only)
   │     → Save → PUT /profile with changed fields only
   │          ├─ 200 → GET /profile, back to Profile screen
   │          └─ 422 → show field errors
   │
   └─ Settings → "Delete account" → confirm dialog
         → DELETE /profile → clear token → Welcome screen
```
