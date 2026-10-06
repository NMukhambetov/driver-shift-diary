from collections.abc import Iterable
from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.models import DaySummary, PaymentTotal, Trip


def local_day(moment: datetime, tz: ZoneInfo) -> date:
    """День смены, к которому относится момент, в часовом поясе водителя."""
    return moment.astimezone(tz).date()


def summarize(trips: Iterable[Trip]) -> DaySummary:
    totals = {"cash": PaymentTotal(count=0, amount=0), "card": PaymentTotal(count=0, amount=0)}
    commission = 0
    for trip in trips:
        total = totals[trip.payment]
        total.count += 1
        total.amount += trip.amount
        commission += trip.commission

    revenue = totals["cash"].amount + totals["card"].amount
    return DaySummary(
        trips_count=totals["cash"].count + totals["card"].count,
        revenue=revenue,
        commission=commission,
        net=revenue - commission,
        cash=totals["cash"],
        card=totals["card"],
    )
