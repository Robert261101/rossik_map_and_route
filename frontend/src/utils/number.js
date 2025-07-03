// src/utils/number.js
export function formatNum(value) {
  if (typeof value !== 'number') return value;
  // 'fr-FR' uses space as thousands separator and comma as decimal
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
