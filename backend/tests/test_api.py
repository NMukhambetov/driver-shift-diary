import threading
from datetime import date
from zoneinfo import ZoneInfo

import pytest

from app.models import Trip
from app.repository import TripRepository

NEW_TRIP = {
    "id": "t3",
    "start": "2026-10-01T10:00:00+05:00",
    "end": "2026-10-01T10:25:00+05:00",
    "amount": 1800,
    "payment": "cash",
    "commission": 270,
}


def day(client, value: str) -> dict:
    response = client.get(f"/api/days/{value}")
    assert response.status_code == 200
    return response.json()


def test_day_returns_seeded_trips_and_summary(client):
    body = day(client, "2026-10-01")

    assert [trip["id"] for trip in body["trips"]] == ["t1", "t2"]
    assert body["summary"] == {
        "trips_count": 2,
        "revenue": 3900,
        "commission": 585,
        "net": 3315,
        "cash": {"count": 1, "amount": 1500},
        "card": {"count": 1, "amount": 2400},
    }


def test_day_without_trips_is_empty(client):
    body = day(client, "2026-10-02")

    assert body["trips"] == []
    assert body["summary"]["trips_count"] == 0


def test_days_lists_dates_with_trips(client):
    response = client.get("/api/days")

    assert response.json() == {"timezone": "Asia/Almaty", "days": ["2026-10-01"]}


def test_add_trip_creates_it_and_updates_summary(client):
    response = client.post("/api/trips", json=NEW_TRIP)

    assert response.status_code == 201
    assert response.json()["id"] == "t3"
    summary = day(client, "2026-10-01")["summary"]
    assert summary["trips_count"] == 3
    assert summary["revenue"] == 5700
    assert summary["cash"] == {"count": 2, "amount": 3300}


def test_resending_same_trip_does_not_create_duplicate(client):
    first = client.post("/api/trips", json=NEW_TRIP)
    second = client.post("/api/trips", json=NEW_TRIP)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json() == first.json()
    assert day(client, "2026-10-01")["summary"]["trips_count"] == 3


def test_resend_with_same_instant_in_other_offset_is_same_trip(client):
    client.post("/api/trips", json=NEW_TRIP)
    in_utc = {**NEW_TRIP, "start": "2026-10-01T05:00:00Z", "end": "2026-10-01T05:25:00Z"}

    response = client.post("/api/trips", json=in_utc)

    assert response.status_code == 200
    assert day(client, "2026-10-01")["summary"]["trips_count"] == 3


def test_same_id_with_different_data_is_conflict(client):
    client.post("/api/trips", json=NEW_TRIP)

    response = client.post("/api/trips", json={**NEW_TRIP, "amount": 9999})

    assert response.status_code == 409
    assert day(client, "2026-10-01")["summary"]["revenue"] == 5700


def test_same_trip_under_new_id_is_rejected_as_overlap(client):
    resent = {**NEW_TRIP, "id": "t3-retry"}
    client.post("/api/trips", json=NEW_TRIP)

    response = client.post("/api/trips", json=resent)

    assert response.status_code == 409
    assert day(client, "2026-10-01")["summary"]["trips_count"] == 3


def test_overlapping_trip_is_rejected(client):
    overlapping = {**NEW_TRIP, "id": "t4", "start": "2026-10-01T09:15:00+05:00",
                   "end": "2026-10-01T09:40:00+05:00"}

    response = client.post("/api/trips", json=overlapping)

    assert response.status_code == 409


def test_trip_starting_when_previous_ends_is_allowed(client):
    back_to_back = {**NEW_TRIP, "id": "t4", "start": "2026-10-01T09:20:00+05:00",
                    "end": "2026-10-01T09:30:00+05:00"}

    response = client.post("/api/trips", json=back_to_back)

    assert response.status_code == 201


@pytest.mark.parametrize("round_no", range(5))
def test_parallel_resends_create_exactly_one_trip(tmp_path, round_no):
    repository = TripRepository(tmp_path / f"race-{round_no}.db", ZoneInfo("Asia/Almaty"))
    trip = Trip.model_validate(NEW_TRIP)
    workers = 12
    barrier = threading.Barrier(workers)
    results, errors = [], []

    def send():
        barrier.wait()
        try:
            results.append(repository.add(trip)[1])
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=send) for _ in range(workers)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
    assert sorted(results) == [False] * (workers - 1) + [True]
    assert len(repository.trips_on(date(2026, 10, 1))) == 1


def test_trip_after_midnight_belongs_to_start_day(client):
    night = {**NEW_TRIP, "id": "night", "start": "2026-10-01T23:50:00+05:00",
             "end": "2026-10-02T00:15:00+05:00"}
    client.post("/api/trips", json=night)

    assert "night" in [trip["id"] for trip in day(client, "2026-10-01")["trips"]]
    assert day(client, "2026-10-02")["trips"] == []


def test_trips_are_sorted_by_start(client):
    early = {**NEW_TRIP, "id": "early", "start": "2026-10-01T06:00:00+05:00",
             "end": "2026-10-01T06:20:00+05:00"}
    client.post("/api/trips", json=early)

    assert [trip["id"] for trip in day(client, "2026-10-01")["trips"]] == ["early", "t1", "t2"]
