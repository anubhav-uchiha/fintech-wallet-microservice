export function calculateCommission(amount: number) {
  const commissionPercentage = 1;

  const commission = (amount * commissionPercentage) / 100;

  return {
    commission,
    totalDebit: amount + commission,
  };
}
