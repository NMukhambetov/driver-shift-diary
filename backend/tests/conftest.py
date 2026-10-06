import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

SEED = [
    {"id": "t1", "start": "2026-10-01T08:10:00+05:00", "end": "2026-10-01T08:32:00+05:00",
     "amount": 2400, "payment": "card", "commission": 360},
    {"id": "t2", "start": "2026-10-01T09:05:00+05:00", "end": "2026-10-01T09:20:00+05:00",
     "amount": 1500, "payment": "cash", "commission": 225},
]


@pytest.fixture
def client(tmp_path):
    seed_path = tmp_path / "trips.json"
    seed_path.write_text(json.dumps(SEED), encoding="utf-8")
    app = create_app(db_path=tmp_path / "trips.db", seed_path=seed_path, timezone="Asia/Almaty")
    with TestClient(app) as test_client:
        yield test_client
