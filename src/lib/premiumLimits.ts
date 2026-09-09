/**
 * Premium-limieten voor het free-tier.
 * Gratis = bruikbaar (timer + 1 auto + basisreminder); Premium ontgrendelt power-user features.
 */
export const FREE_FAVORITES_LIMIT = 8;
export const FREE_HISTORY_DAYS = 60;
export const FREE_VEHICLES_LIMIT = 1;

/** Free tier: één waarschuwing vóór einde parkeertijd. Premium: dubbele/custom reminders. */
export const FREE_REMINDER_COUNT = 1;
export const PREMIUM_REMINDER_COUNT = 2;

export const canAddVehicle = (premium: boolean, currentCount: number): boolean =>
  premium || currentCount < FREE_VEHICLES_LIMIT;

export const canAddFavorite = (premium: boolean, currentCount: number): boolean =>
  premium || currentCount < FREE_FAVORITES_LIMIT;

export const isFavoriteLocked = (premium: boolean, index: number): boolean =>
  !premium && index >= FREE_FAVORITES_LIMIT;

export const canUseDoubleReminders = (premium: boolean): boolean => premium;

export const historyDaysLimit = (premium: boolean): number | null =>
  premium ? null : FREE_HISTORY_DAYS;
