import type { Trip } from '../api'
import { formatMoney } from '../money'
import { durationMinutes, formatTime, localDayOf } from '../time'

interface Props {
  trips: Trip[]
  day: string
  timeZone: string
}

export function TripList({ trips, day, timeZone }: Props) {
  if (trips.length === 0) {
    return <p className="empty">В этот день поездок нет</p>
  }

  return (
    <ol className="card trips" aria-label="Поездки">
      {trips.map((trip) => {
        const endsNextDay = localDayOf(trip.end, timeZone) !== day
        return (
          <li key={trip.id} className="trip">
            <div className="trip__time">
              <span>
                {formatTime(trip.start, timeZone)}–{formatTime(trip.end, timeZone)}
                {endsNextDay && <sup title="Окончание на следующий день">+1</sup>}
              </span>
              <span className="muted">{durationMinutes(trip.start, trip.end)} мин</span>
            </div>
            <span className={`badge badge--${trip.payment}`}>
              {trip.payment === 'cash' ? 'Наличные' : 'Карта'}
            </span>
            <div className="trip__money">
              <span>{formatMoney(trip.amount)}</span>
              <span className="muted">−{formatMoney(trip.commission)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
