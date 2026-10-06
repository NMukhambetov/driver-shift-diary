import os
from datetime import date
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter

from app.models import DayReport, DaysList, Trip
from app.repository import TripConflict, TripRepository
from app.summary import summarize

BACKEND_DIR = Path(__file__).resolve().parent.parent


def seed(repository: TripRepository, seed_path: Path) -> None:
    if not seed_path.exists() or not repository.is_empty():
        return
    trips = TypeAdapter(list[Trip]).validate_json(seed_path.read_bytes())
    for trip in trips:
        repository.add(trip)


def create_app(db_path: Path, seed_path: Path, timezone: str) -> FastAPI:
    tz = ZoneInfo(timezone)
    repository = TripRepository(db_path, tz)
    seed(repository, seed_path)

    app = FastAPI(title="Дневник смен водителя")

    @app.exception_handler(TripConflict)
    def conflict_handler(_: Request, exc: TripConflict) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})

    @app.get("/api/days")
    def list_days() -> DaysList:
        return DaysList(timezone=timezone, days=repository.days())

    @app.get("/api/days/{day}")
    def get_day(day: date) -> DayReport:
        trips = repository.trips_on(day)
        return DayReport(date=day, timezone=timezone, summary=summarize(trips), trips=trips)

    @app.post(
        "/api/trips",
        status_code=status.HTTP_201_CREATED,
        responses={200: {"description": "Повтор: поездка уже сохранена"}, 409: {"description": "Конфликт"}},
    )
    def add_trip(trip: Trip, response: Response) -> Trip:
        saved, created = repository.add(trip)
        if not created:
            response.status_code = status.HTTP_200_OK
        return saved

    return app


def app_from_env() -> FastAPI:
    data_dir = Path(os.environ.get("DATA_DIR", BACKEND_DIR / "data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return create_app(
        db_path=data_dir / "trips.db",
        seed_path=Path(os.environ.get("SEED_PATH", BACKEND_DIR / "data" / "trips.json")),
        timezone=os.environ.get("APP_TIMEZONE", "Asia/Almaty"),
    )
