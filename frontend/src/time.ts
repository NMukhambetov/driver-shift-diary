const MINUTE = 60_000

function offsetMinutes(timeZone: string, epochMs: number): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(epochMs)
    .find((part) => part.type === 'timeZoneName')?.value
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  const [, sign, hours, minutes] = match
  return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes))
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

/** Местные дата и время в поясе timeZone -> ISO 8601 со смещением этого пояса. */
export function zonedToIso(day: string, time: string, timeZone: string): string {
  const wallClockAsUtc = Date.parse(`${day}T${time}:00Z`)
  // второй проход нужен, если смещение в искомый момент отличается от смещения в первой оценке (DST)
  const firstGuess = offsetMinutes(timeZone, wallClockAsUtc)
  const offset = offsetMinutes(timeZone, wallClockAsUtc - firstGuess * MINUTE)
  return `${day}T${time}:00${formatOffset(offset)}`
}

export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

export function durationMinutes(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / MINUTE)
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    Date.parse(iso),
  )
}

export function localDayOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(Date.parse(iso))
}

export function formatDayTitle(day: string): { weekday: string; date: string } {
  const noonUtc = Date.parse(`${day}T12:00:00Z`)
  return {
    weekday: new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', weekday: 'long' }).format(noonUtc),
    date: new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
      .format(noonUtc)
      .replace(' г.', ''),
  }
}

export function formatShortDay(day: string): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    .format(Date.parse(`${day}T12:00:00Z`))
    .replace('.', '')
}
