import { useRef, useState, type FormEvent } from 'react'
import { api, ApiError, type Payment } from '../api'
import { shiftDay, zonedToIso } from '../time'

interface Props {
  day: string
  timeZone: string
  onSaved: (message: string) => void
}

const EMPTY = { start: '', end: '', amount: '', commission: '', payment: 'card' as Payment }

function newTripId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // randomUUID есть только в secure context; по http из локальной сети нужен запасной вариант
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function AddTripForm({ day, timeZone, onSaved }: Props) {
  const [fields, setFields] = useState(EMPTY)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  // id живёт до успешного сохранения: повторная отправка той же формы не создаст дубль
  const tripId = useRef(newTripId())

  const endsNextDay = fields.start !== '' && fields.end !== '' && fields.end < fields.start

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setErrors([])
    try {
      const { created } = await api.addTrip({
        id: tripId.current,
        start: zonedToIso(day, fields.start, timeZone),
        end: zonedToIso(endsNextDay ? shiftDay(day, 1) : day, fields.end, timeZone),
        amount: Number(fields.amount),
        commission: Number(fields.commission),
        payment: fields.payment,
      })
      tripId.current = newTripId()
      setFields((current) => ({ ...EMPTY, payment: current.payment }))
      onSaved(created ? 'Поездка добавлена' : 'Эта поездка уже была сохранена')
    } catch (error) {
      setErrors(error instanceof ApiError ? error.messages : ['Не удалось сохранить поездку'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit} aria-label="Новая поездка">
      <h2>Новая поездка</h2>

      <div className="form__row">
        <label>
          <span className="label">Начало</span>
          <input
            type="time"
            required
            value={fields.start}
            onChange={(event) => update('start', event.target.value)}
          />
        </label>
        <label>
          <span className="label">
            Окончание{endsNextDay && <em className="hint"> · след. день</em>}
          </span>
          <input
            type="time"
            required
            value={fields.end}
            onChange={(event) => update('end', event.target.value)}
          />
        </label>
      </div>

      <div className="form__row">
        <label>
          <span className="label">Сумма, ₸</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={fields.amount}
            onChange={(event) => update('amount', event.target.value)}
          />
        </label>
        <label>
          <span className="label">Комиссия, ₸</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            value={fields.commission}
            onChange={(event) => update('commission', event.target.value)}
          />
        </label>
      </div>

      <fieldset className="segmented">
        <legend className="label">Оплата</legend>
        {(['card', 'cash'] as const).map((payment) => (
          <label key={payment} className="segmented__option">
            <input
              type="radio"
              name="payment"
              value={payment}
              checked={fields.payment === payment}
              onChange={() => update('payment', payment)}
            />
            <span>{payment === 'card' ? 'Карта' : 'Наличные'}</span>
          </label>
        ))}
      </fieldset>

      {errors.length > 0 && (
        <ul className="form__errors" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="primary" disabled={saving}>
        {saving ? 'Сохраняю…' : 'Добавить поездку'}
      </button>
    </form>
  )
}
