// src/utils/price.js
// Helper utilities for computing displayed/checkout prices from product data

export function isDiscountActive(discount) {
  if (!discount || typeof discount !== 'object') return false;
  const now = new Date();
  if (discount.startAt && new Date(discount.startAt) > now) return false;
  if (discount.endAt && new Date(discount.endAt) < now) return false;
  return true;
}

// Return the variant object with the lowest base price (variant.price only)
export function getLowestPriceVariant(product) {
  if (!product) return null;
  const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
  if (variants.length === 0) return null;
  let best = variants[0];
  for (const v of variants) {
    const p1 = Number(best?.price) || 0;
    const p2 = Number(v?.price) || 0;
    if (p2 < p1) best = v;
  }
  return best;
}

export function getLowestVariantBasePrice(product) {
  const v = getLowestPriceVariant(product);
  if (v) return Number(v.price) || 0;
  return 0;
}

// compute final price given a base price and discount object
export function computeFinalPriceFromBase(basePrice = 0, discount) {
  const base = Number(basePrice) || 0;
  if (!discount || !isDiscountActive(discount)) return base;

  if ((discount.type || '').toLowerCase() === 'percent') {
    const pct = Number(discount.value) || 0;
    return Math.round(base * (1 - pct / 100));
  }

  if ((discount.type || '').toLowerCase() === 'fixed') {
    const value = Number(discount.value) || 0;
    return Math.max(0, Math.round(base - value));
  }

  return base;
}

// compute final price for a product by using its lowest variant base price
export function computeFinalPrice(product) {
  return computeFinalPriceFromBase(getLowestVariantBasePrice(product), product?.discount);
}

export function getDiscountLabel(discount) {
  if (!discount || !isDiscountActive(discount)) return null;
  if ((discount.type || '').toLowerCase() === 'percent') return `${Number(discount.value) || 0}%`;
  if ((discount.type || '').toLowerCase() === 'fixed') return `${(Number(discount.value) || 0).toLocaleString()}₫`;
  return null;
}
