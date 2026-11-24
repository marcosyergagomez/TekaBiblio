export function formatMoney(value: unknown): string | null {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount.toFixed(2);
}

export function sumMoney(values: readonly unknown[]): number {
  const total = values.reduce<number>((sum, value) => {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return Number(total.toFixed(2));
}

export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Number(amount.toFixed(2));
}

export function formatDate(value: string | undefined, withTime = false): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}
