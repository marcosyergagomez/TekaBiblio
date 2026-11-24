export const DEMO_PASSWORD = 'Demo12345!';

export const DEMO_ACCOUNTS = [
  { labelKey: 'auth.demoUsers.adminGlobal', email: 'admin.global@tekabiblio.local' },
  { labelKey: 'auth.demoUsers.adminBranch', email: 'admin.norte@tekabiblio.local' },
  { labelKey: 'auth.demoUsers.librarian', email: 'biblio.norte@tekabiblio.local' },
  { labelKey: 'auth.demoUsers.memberGold', email: 'socio.oro@tekabiblio.local' },
] as const;

const STAFF_ROLES = new Set(['admin_global', 'admin_sede', 'bibliotecario']);

export function isStaffRole(role: string | undefined): boolean {
  return Boolean(role && STAFF_ROLES.has(role));
}
