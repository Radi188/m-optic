# Customer app and website — product sale price

How the customer mobile app and the website show sale prices on products.
No new endpoint: every product response already carries the sale fields.

Backend: Laravel 8 API at `/api/v1`. Product endpoints are public (no token).

---

## 1. Conventions

### Base URL and headers

```
{BASE_URL}/api/v1
Accept: application/json
```

### `platform` query parameter

Send it on every product request. It decides which "show sale price"
settings apply.

| Client | Parameter |
|---|---|
| Mobile app | `?platform=mobile` (default when omitted) |
| Website | `?platform=web` |

The same product can be on sale on the app but not on the website, so never
reuse a response from one platform on the other.

---

## 2. Endpoints that return products

All of these use the same product shape (section 3).

| Endpoint | Notes |
|---|---|
| `GET /homepage` | `new_arrivals`, and on web also `best_sellers`, `sunglasses` |
| `GET /products` | Catalog list, paginated |
| `GET /products/best-sellers` | |
| `GET /products/new-arrivals` | |
| `GET /products/category/{categorySlugOrId}` | |
| `GET /products/brand/{brandSlugOrId}` | |
| `GET /products/type/{productType}` | |
| `GET /products/{id}` | Detail, includes `variations` |
| `GET /products/slug/{slug}` | Detail, includes `variations` |

---

## 3. Sale fields

| Field | Type | Meaning |
|---|---|---|
| `price` | number | Regular price. Always present. |
| `on_sale` | boolean | `true` when the sale must be shown on this platform. |
| `sale_price` | number \| null | Price the customer pays. `null` unless `on_sale`. |
| `discount_percentage` | number \| null | Percent off, e.g. `20`. `null` unless `on_sale`. |

Use `on_sale` to decide the layout. Do not compare `price` and `sale_price`
yourself: the backend already checks the product's sale price, the product's
"show on mobile/web" setting and the category's setting.

### Product on sale

```json
{
  "id": 1201,
  "item_code": "FR-1001",
  "name": "Ray-Ban RB2140",
  "price": 100,
  "on_sale": true,
  "sale_price": 80,
  "discount_percentage": 20,
  "image": "https://example.com/uploads/item123.png",
  "category": { "id": 3, "name": "Frames" },
  "brand": { "id": 5, "name": "Ray-Ban" }
}
```

### Product not on sale (or sale hidden on this platform)

```json
{
  "id": 1202,
  "item_code": "FR-1002",
  "name": "Oakley OX8046",
  "price": 120,
  "on_sale": false,
  "sale_price": null,
  "discount_percentage": null
}
```

---

## 4. How to display

```
on_sale = true   →   $80.00   $100.00 (struck through)   [-20%]
on_sale = false  →   $100.00
```

| Element | When | Value |
|---|---|---|
| Main price | always | `on_sale ? sale_price : price` |
| Struck-through price | `on_sale` | `price` |
| Discount badge | `on_sale` | `-{discount_percentage}%` |

---

## 5. Variations (product detail)

On `GET /products/{id}` and `GET /products/slug/{slug}`, each entry in
`variations` has its own `price`, `on_sale`, `sale_price` and
`discount_percentage`. When the customer picks a variant, show that
variant's values, not the parent's.

```json
"variations": [
  {
    "id": 1310,
    "variation_id": 44,
    "name": "Ray-Ban RB2140 Black",
    "price": 110,
    "on_sale": true,
    "sale_price": 88,
    "discount_percentage": 20,
    "price_adjustment": 10,
    "color_code": "901"
  }
]
```

A variant is discounted by the same percentage as its parent product.

---

## 6. Known limitation

The `/products` filters `min_price` / `max_price` and the sorts
`price_asc` / `price_desc` use the regular `price`, not `sale_price`.
A product at $100 on sale for $80 is not returned for `max_price=90`.
