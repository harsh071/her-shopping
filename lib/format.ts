const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function dollars(cents: number): string {
  return usd.format(Math.round(cents) / 100);
}

export function grams(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kg` : `${value} g`;
}

export function deliveryLabel(days: number): string {
  if (days <= 1) return 'Tomorrow';
  return `${days} days`;
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}
