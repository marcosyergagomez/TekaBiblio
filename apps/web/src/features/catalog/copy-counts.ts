export function countCopies(
  copies: readonly { materialId: string; status: string }[],
  materialId: string,
): { total: number; available: number } {
  let total = 0;
  let available = 0;

  for (const copy of copies) {
    if (copy.materialId !== materialId) {
      continue;
    }

    total += 1;
    if (copy.status === 'AVAILABLE') {
      available += 1;
    }
  }

  return { total, available };
}
