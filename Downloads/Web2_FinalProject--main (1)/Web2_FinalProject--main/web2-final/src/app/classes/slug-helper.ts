export function createSlug(name: string, id: string | number): string {
  const sanitizedName = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return `${sanitizedName}-p${id}`;
}

export function extractIdFromSlug(slug: string): string | null {
  const match = slug.match(/-p([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

export function getIdentityType(identity: string): 'ID' | 'SLUG_WITH_ID' | 'PURE_SLUG' {
  if (!identity) return 'ID';
  if (identity.includes('-p')) {
    const parts = identity.split('-p');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length > 0) {
      return 'SLUG_WITH_ID';
    }
  }
  return 'ID';
}
