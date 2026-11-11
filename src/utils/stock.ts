/**
 * Stock state from the product API.
 *
 * The API has no quantity field; `stock_type` is the only stock signal. Every
 * catalog item currently sends `stock_type: "S"` (checked 2026-11-11 across
 * all 145 mobile products), so nothing reads as out of stock until the backend
 * sends an out-of-stock value — any `stock_type` containing "out" (e.g. "out",
 * "out_of_stock", "Out of Stock"). Change this one function if the backend
 * picks a different field.
 */
export type StockInfo = { stock_type?: string | null } | null | undefined;

export const isOutOfStock = (item: StockInfo): boolean =>
  /out/i.test(item?.stock_type ?? '');

/** A colourway's own stock state wins; otherwise the product's. */
export const isOutOfStockFor = (product: StockInfo, variation?: StockInfo): boolean =>
  variation?.stock_type ? isOutOfStock(variation) : isOutOfStock(product);
