import { describe, expect, it } from 'vitest'
import { durationMinutes, shiftDay, zonedToIso } from './time'

describe('zonedToIso', () => {
  it('ставит смещение часового пояса водителя', () => {
    expect(zonedToIso('2026-10-01', '08:10', 'Asia/Almaty')).toBe('2026-10-01T08:10:00+05:00')
  })

  it('учитывает переход на летнее время', () => {
    expect(zonedToIso('2026-01-15', '12:00', 'Europe/Berlin')).toBe('2026-01-15T12:00:00+01:00')
    expect(zonedToIso('2026-07-15', '12:00', 'Europe/Berlin')).toBe('2026-07-15T12:00:00+02:00')
  })

  it('работает для UTC', () => {
    expect(zonedToIso('2026-10-01', '00:00', 'UTC')).toBe('2026-10-01T00:00:00+00:00')
  })
})

describe('shiftDay', () => {
  it('переходит через границу месяца и года', () => {
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31')
  })
})

describe('durationMinutes', () => {
  it('считает длительность поездки через полночь', () => {
    expect(durationMinutes('2026-10-02T23:40:00+05:00', '2026-10-03T00:10:00+05:00')).toBe(30)
  })
})
