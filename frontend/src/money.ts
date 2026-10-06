const tenge = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export function formatMoney(amount: number): string {
  return `${tenge.format(amount)} ₸`
}

export function pluralTrips(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'поездка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'поездки'
  return 'поездок'
}
