import type { TFunction } from 'i18next';

function enumLabel(t: TFunction, group: string, value?: string): string {
  if (!value) {
    return t('common.notAvailable');
  }

  return t(`enums.${group}.${value}`, { defaultValue: value });
}

export function roleLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'role', value);
}

export function branchLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'branch', value);
}

export function materialTypeLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'materialType', value);
}

export function loanStatusLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'loanStatus', value);
}

export function reservationStatusLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'reservationStatus', value);
}

export function membershipLevelLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'membershipLevel', value);
}

export function penaltyTypeLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'penaltyType', value);
}

export function paymentMethodLabel(t: TFunction, value?: string): string {
  return enumLabel(t, 'paymentMethod', value);
}
