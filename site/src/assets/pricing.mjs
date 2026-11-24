// Team plan price: EUR 15 per paid seat per month, billed yearly, minimum 5 seats.
// Subcontractors who reply by email are free and never count as seats.
export const SEAT_PRICE = 15;
export const MIN_SEATS = 5;

export function teamPrice(seats) {
  const n = Math.max(MIN_SEATS, Math.floor(Number(seats) || 0));
  const monthly = n * SEAT_PRICE;
  return { seats: n, monthly, yearly: monthly * 12 };
}

export function formatEuro(value) {
  return "€" + String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
