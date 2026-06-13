const DEPOSIT_THRESHOLD_PCM = 4166.66;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

const gbpWithPence = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function isSharedProperty(type?: string) {
  return type === "Shared Property";
}

export function isValidMoneyInput(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0;
}

export function formatRentPcm(value: number) {
  if (!Number.isFinite(value)) return gbp.format(0);
  const formatter = Number.isInteger(value) ? gbp : gbpWithPence;
  return `${formatter.format(value)} pcm`;
}

export function calculateDeposit(rentPcm: number, propertyType?: string) {
  if (isSharedProperty(propertyType) || !Number.isFinite(rentPcm) || rentPcm <= 0) return null;
  const weeklyRent = (rentPcm * 12) / 52;
  return weeklyRent * (rentPcm > DEPOSIT_THRESHOLD_PCM ? 6 : 5);
}

export function depositDisplay(rentPcm: number, propertyType?: string) {
  const deposit = calculateDeposit(rentPcm, propertyType);
  if (deposit === null) return "Deposit information available from landlord";
  return `Deposit: ${gbpWithPence.format(deposit)}`;
}
