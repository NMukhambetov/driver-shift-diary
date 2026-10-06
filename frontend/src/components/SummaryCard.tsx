import type { DaySummary } from '../api'
import { formatMoney, pluralTrips } from '../money'

export function SummaryCard({ summary }: { summary: DaySummary }) {
  const cashShare = summary.revenue > 0 ? (summary.cash.amount / summary.revenue) * 100 : 0

  return (
    <section className="card summary" aria-label="Сводка за день">
      <div className="summary__net">
        <span className="label">На руки</span>
        <strong className="summary__net-value">{formatMoney(summary.net)}</strong>
        <span className="muted">
          {summary.trips_count} {pluralTrips(summary.trips_count)}
        </span>
      </div>

      <dl className="summary__grid">
        <div>
          <dt className="label">Выручка</dt>
          <dd>{formatMoney(summary.revenue)}</dd>
        </div>
        <div>
          <dt className="label">Комиссия</dt>
          <dd className="negative">−{formatMoney(summary.commission)}</dd>
        </div>
      </dl>

      <div className="split">
        <div
          className="split__bar"
          role="img"
          aria-label={`Наличные ${Math.round(cashShare)}%, карта ${100 - Math.round(cashShare)}%`}
        >
          <span className="split__cash" style={{ width: `${cashShare}%` }} />
        </div>
        <div className="split__legend">
          <span>
            <i className="dot dot--cash" />
            Наличные · {summary.cash.count}
            <b>{formatMoney(summary.cash.amount)}</b>
          </span>
          <span>
            <i className="dot dot--card" />
            Карта · {summary.card.count}
            <b>{formatMoney(summary.card.amount)}</b>
          </span>
        </div>
      </div>
    </section>
  )
}
