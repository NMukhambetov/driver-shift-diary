import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from app.models import Trip
from app.summary import local_day

EPOCH = datetime(1970, 1, 1, tzinfo=UTC)

SCHEMA = """
CREATE TABLE IF NOT EXISTS trips (
    id          TEXT PRIMARY KEY,
    start_at    TEXT NOT NULL,
    end_at      TEXT NOT NULL,
    start_us    INTEGER NOT NULL,
    end_us      INTEGER NOT NULL,
    amount      INTEGER NOT NULL CHECK (amount > 0),
    payment     TEXT NOT NULL CHECK (payment IN ('cash', 'card')),
    commission  INTEGER NOT NULL CHECK (commission >= 0 AND commission <= amount),
    CHECK (end_us > start_us)
);
CREATE INDEX IF NOT EXISTS trips_by_time ON trips (start_us, end_us);
"""


class TripConflict(Exception):
    pass


def to_micros(moment: datetime) -> int:
    # целые микросекунды: сравнение моментов без ошибок float и без учёта offset строки
    return (moment - EPOCH) // timedelta(microseconds=1)


class TripRepository:
    def __init__(self, db_path: Path, tz: ZoneInfo):
        self._db_path = db_path
        self._tz = tz
        with self._connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(SCHEMA)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self._db_path, isolation_level=None, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    @staticmethod
    def _from_row(row: sqlite3.Row) -> Trip:
        return Trip(
            id=row["id"],
            start=row["start_at"],
            end=row["end_at"],
            amount=row["amount"],
            payment=row["payment"],
            commission=row["commission"],
        )

    def is_empty(self) -> bool:
        with self._connect() as conn:
            return conn.execute("SELECT 1 FROM trips LIMIT 1").fetchone() is None

    def add(self, trip: Trip) -> tuple[Trip, bool]:
        """Сохраняет поездку. Возвращает (поездка, создана ли новая).

        Повтор с тем же id и теми же данными возвращает сохранённую поездку.
        Тот же id с другими данными или пересечение по времени дают TripConflict.
        """
        start_us, end_us = to_micros(trip.start), to_micros(trip.end)
        with self._connect() as conn:
            # IMMEDIATE берёт блокировку записи сразу: проверка и вставка атомарны
            conn.execute("BEGIN IMMEDIATE")
            try:
                existing = conn.execute("SELECT * FROM trips WHERE id = ?", (trip.id,)).fetchone()
                if existing is not None:
                    stored = self._from_row(existing)
                    if stored != trip:
                        raise TripConflict(f"Поездка {trip.id} уже сохранена с другими данными")
                    conn.execute("COMMIT")
                    return stored, False

                overlap = conn.execute(
                    "SELECT id FROM trips WHERE start_us < ? AND end_us > ? LIMIT 1",
                    (end_us, start_us),
                ).fetchone()
                if overlap is not None:
                    raise TripConflict(f"Поездка пересекается по времени с поездкой {overlap['id']}")

                conn.execute(
                    "INSERT INTO trips (id, start_at, end_at, start_us, end_us, amount, payment, commission)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (trip.id, trip.start.isoformat(), trip.end.isoformat(), start_us, end_us,
                     trip.amount, trip.payment, trip.commission),
                )
                conn.execute("COMMIT")
                return trip, True
            except BaseException:
                conn.execute("ROLLBACK")
                raise

    def trips_on(self, day: date) -> list[Trip]:
        day_start = datetime.combine(day, time.min, self._tz)
        next_day_start = datetime.combine(day + timedelta(days=1), time.min, self._tz)
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM trips WHERE start_us >= ? AND start_us < ? ORDER BY start_us",
                (to_micros(day_start), to_micros(next_day_start)),
            ).fetchall()
        return [self._from_row(row) for row in rows]

    def days(self) -> list[date]:
        with self._connect() as conn:
            rows = conn.execute("SELECT start_at FROM trips").fetchall()
        return sorted({local_day(datetime.fromisoformat(row["start_at"]), self._tz) for row in rows})
