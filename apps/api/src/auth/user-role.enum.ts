export enum UserRole {
  ADMIN_GLOBAL = 'admin_global',
  ADMIN_SEDE = 'admin_sede',
  BIBLIOTECARIO = 'bibliotecario',
  SOCIO = 'socio',
  INVITADO = 'invitado',
}

export type RequestUser = {
  userId: string;
  role: UserRole;
  branchId?: string;
  memberId?: string;
};
