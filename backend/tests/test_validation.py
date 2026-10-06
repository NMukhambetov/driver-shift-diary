import pytest

from tests.test_api import NEW_TRIP


@pytest.mark.parametrize(
    "patch",
    [
        {"amount": 0},
        {"amount": -100},
        {"amount": 10.5},
        {"commission": -1},
        {"commission": 1801},
        {"payment": "crypto"},
        {"end": NEW_TRIP["start"]},
        {"end": "2026-10-01T09:59:00+05:00"},
        {"start": "2026-10-01T10:00:00"},
        {"start": "not a date"},
        {"id": ""},
    ],
    ids=[
        "zero-amount",
        "negative-amount",
        "fractional-amount",
        "negative-commission",
        "commission-above-amount",
        "unknown-payment",
        "end-equals-start",
        "end-before-start",
        "start-without-offset",
        "garbage-start",
        "empty-id",
    ],
)
def test_invalid_trip_is_rejected_and_not_saved(client, patch):
    response = client.post("/api/trips", json={**NEW_TRIP, **patch})

    assert response.status_code == 422
    assert client.get("/api/days/2026-10-01").json()["summary"]["trips_count"] == 2


@pytest.mark.parametrize("missing", ["id", "start", "end", "amount", "payment", "commission"])
def test_trip_without_required_field_is_rejected(client, missing):
    payload = {key: value for key, value in NEW_TRIP.items() if key != missing}

    assert client.post("/api/trips", json=payload).status_code == 422


def test_invalid_day_in_url_is_rejected(client):
    assert client.get("/api/days/2026-13-45").status_code == 422
