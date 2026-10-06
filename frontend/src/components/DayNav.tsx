import { formatDayTitle, formatShortDay, shiftDay } from '../time'

interface Props {
  day: string
  daysWithTrips: string[]
  onChange: (day: string) => void
}

export function DayNav({ day, daysWithTrips, onChange }: Props) {
  const title = formatDayTitle(day)

  return (
    <nav className="day-nav" aria-label="Выбор дня">
      <div className="day-nav__row">
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange(shiftDay(day, -1))}
          aria-label="Предыдущий день"
        >
          ‹
        </button>
        <label className="day-nav__title">
          <span className="day-nav__weekday">{title.weekday}</span>
          <span className="day-nav__date">{title.date}</span>
          <input
            type="date"
            className="day-nav__picker"
            value={day}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            aria-label="Выбрать дату"
          />
        </label>
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange(shiftDay(day, 1))}
          aria-label="Следующий день"
        >
          ›
        </button>
      </div>

      {daysWithTrips.length > 0 && (
        <div className="day-chips" role="list" aria-label="Дни с поездками">
          {daysWithTrips.map((value) => (
            <button
              key={value}
              type="button"
              role="listitem"
              className="chip"
              aria-current={value === day ? 'date' : undefined}
              onClick={() => onChange(value)}
            >
              {formatShortDay(value)}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
