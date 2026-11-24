export class WhereBuilder {
  private readonly clauses: string[] = [];
  private readonly params: unknown[] = [];

  eq(column: string, value: string | number | undefined): this {
    if (value === undefined || value === '') {
      return this;
    }

    this.clauses.push(`${column} = ?`);
    this.params.push(value);
    return this;
  }

  raw(clause: string, ...params: unknown[]): this {
    this.clauses.push(clause);
    this.params.push(...params);
    return this;
  }

  sql(): string {
    if (this.clauses.length === 0) {
      return '';
    }

    return `WHERE ${this.clauses.join(' AND ')}`;
  }

  values(): unknown[] {
    return this.params;
  }
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function readPositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}
