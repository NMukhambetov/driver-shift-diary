import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type DayReport } from './api'
import { AddTripForm } from './components/AddTripForm'
import { DayNav } from './components/DayNav'
import { SummaryCard } from './components/SummaryCard'
import { TripList } from './components/TripList'
import { todayIn } from './time'

type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Не удалось загрузить данные'
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function App() {
  const [timeZone, setTimeZone] = useState<string | null>(null)
  const [daysWithTrips, setDaysWithTrips] = useState<string[]>([])
  const [day, setDay] = useState<string | null>(null)
  const [report, setReport] = useState<Load<DayReport>>({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .days(controller.signal)
      .then(({ timezone, days }) => {
        setTimeZone(timezone)
        setDaysWithTrips(days)
        setDay((current) => current ?? days.at(-1) ?? todayIn(timezone))
      })
      .catch((error: unknown) => {
        if (!isAbort(error)) setReport({ status: 'error', message: errorMessage(error) })
      })
    return () => controller.abort()
  }, [version])

  useEffect(() => {
    if (day === null) return
    // при быстром переключении дней ответ на старый запрос не должен перетереть новый
    const controller = new AbortController()
    setReport((current) => (current.status === 'ready' ? current : { status: 'loading' }))
    api
      .day(day, controller.signal)
      .then((data) => setReport({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setReport({ status: 'error', message: errorMessage(error) })
      })
    return () => controller.abort()
  }, [day, version])

  useEffect(() => {
    if (toast === null) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleSaved = useCallback((message: string) => {
    setToast(message)
    setVersion((value) => value + 1)
  }, [])

  return (
    <main className="app">
      <header className="app__header">
        <h1>Дневник смен</h1>
        {timeZone && <span className="muted">{timeZone}</span>}
      </header>

      {day && <DayNav day={day} daysWithTrips={daysWithTrips} onChange={setDay} />}

      {report.status === 'error' && (
        <div className="card error" role="alert">
          <p>{report.message}</p>
          <button type="button" onClick={() => setVersion((value) => value + 1)}>
            Повторить
          </button>
        </div>
      )}

      {report.status === 'loading' && <div className="card skeleton" aria-busy="true" />}

      {report.status === 'ready' && timeZone && (
        <>
          <SummaryCard summary={report.data.summary} />
          <TripList trips={report.data.trips} day={report.data.date} timeZone={timeZone} />
        </>
      )}

      {day && timeZone && <AddTripForm day={day} timeZone={timeZone} onSaved={handleSaved} />}

      <div className="toast" role="status" aria-live="polite" data-visible={toast !== null}>
        {toast}
      </div>
    </main>
  )
}
