// Allowed-km policy. LeRent's daily allowance is tiered by rental length;
// other tenants use the car's own mileageLimits.dailyLimit (or unlimited).
// Single source of truth — used by the customer emails and the public
// km-allowance endpoint the tenant websites read.

const LERENT_KM_TIERS = [
  { minDays: 1, maxDays: 3, kmPerDay: 250 },
  { minDays: 4, maxDays: 10, kmPerDay: 210 },
  { minDays: 11, maxDays: 20, kmPerDay: 180 },
  { minDays: 21, maxDays: 29, kmPerDay: 150 },
  { minDays: 30, maxDays: null, kmPerDay: 125 }
];

const lerentDailyKm = (days) => {
  if (days <= 3) return 250;
  if (days <= 10) return 210;
  if (days <= 20) return 180;
  if (days <= 29) return 150;
  return 125;
};

module.exports = { LERENT_KM_TIERS, lerentDailyKm };
