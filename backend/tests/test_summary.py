from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.models import Trip
from app.summary import local_day, summarize

ALMATY = ZoneInfo("Asia/Almaty")


def make_trip(trip_id: str, amount: int, payment: str, commission: int) -> Trip:
    return Trip(
        id=trip_id,
        start="2026-10-01T08:10:00+05:00",
        end="2026-10-01T08:32:00+05:00",
        amount=amount,
        payment=payment,
        commission=commission,
    )


def test_summary_of_example_day():
    trips = [
        make_trip("t1", 2400, "card", 360),
        make_trip("t2", 1500, "cash", 225),
    ]

    summary = summarize(trips)

    assert summary.model_dump() == {
        "trips_count": 2,
        "revenue": 3900,
        "commission": 585,
        "net": 3315,
        "cash": {"count": 1, "amount": 1500},
        "card": {"count": 1, "amount": 2400},
    }


def test_summary_of_empty_day_is_all_zeros():
    summary = summarize([])

    assert summary.model_dump() == {
        "trips_count": 0,
        "revenue": 0,
        "commission": 0,
        "net": 0,
        "cash": {"count": 0, "amount": 0},
        "card": {"count": 0, "amount": 0},
    }


def test_summary_sums_several_trips_of_one_payment_type():
    trips = [
        make_trip("a", 1000, "cash", 150),
        make_trip("b", 700, "cash", 105),
        make_trip("c", 3000, "card", 450),
    ]

    summary = summarize(trips)

    assert summary.cash.model_dump() == {"count": 2, "amount": 1700}
    assert summary.card.model_dump() == {"count": 1, "amount": 3000}
    assert summary.net == 4700 - 705


def test_local_day_uses_driver_timezone_not_utc():
    # 01:30 по Алматы это ещё 30 сентября по UTC
    start = datetime.fromisoformat("2026-10-01T01:30:00+05:00")

    assert local_day(start, ALMATY) == date(2026, 10, 1)


def test_local_day_converts_foreign_offset():
    start = datetime.fromisoformat("2026-09-30T20:00:00+00:00")

    assert local_day(start, ALMATY) == date(2026, 10, 1)
