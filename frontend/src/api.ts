export type Payment = 'cash' | 'card'

export interface Trip {
  id: string
  start: string
  end: string
  amount: number
  payment: Payment
  commission: number
}

export interface PaymentTotal {
  count: number
  amount: number
}

export interface DaySummary {
  trips_count: number
  revenue: number
  commission: number
  net: number
  cash: PaymentTotal
  card: PaymentTotal
}

export interface DayReport {
  date: string
  timezone: string
  summary: DaySummary
  trips: Trip[]
}

export interface DaysList {
  timezone: string
  days: string[]
}

const FIELD_LABELS: Record<string, string> = {
  start: 'Начало',
  end: 'Окончание',
  amount: 'Сумма',
  commission: 'Комиссия',
  payment: 'Оплата',
  id: 'ID',
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages.join('; '))
  }
}

interface ValidationIssue {
  loc: (string | number)[]
  msg: string
}

function readMessages(body: unknown, status: number): string[] {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return [detail]
  if (Array.isArray(detail)) {
    return (detail as ValidationIssue[]).map((issue) => {
      const field = FIELD_LABELS[String(issue.loc.at(-1))]
      const text = issue.msg.replace(/^Value error, /, '')
      return field ? `${field}: ${text}` : text
    })
  }
  return [`Ошибка сервера (${status})`]
}

async function request<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, ['Нет связи с сервером'])
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, readMessages(body, response.status))
  return { status: response.status, body: body as T }
}

export const api = {
  async days(signal?: AbortSignal): Promise<DaysList> {
    return (await request<DaysList>('/api/days', { signal })).body
  },

  async day(day: string, signal?: AbortSignal): Promise<DayReport> {
    return (await request<DayReport>(`/api/days/${day}`, { signal })).body
  },

  /** created=false: сервер уже знал эту поездку (повторная отправка). */
  async addTrip(trip: Trip): Promise<{ trip: Trip; created: boolean }> {
    const { status, body } = await request<Trip>('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    })
    return { trip: body, created: status === 201 }
  },
}
