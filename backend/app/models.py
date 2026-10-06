from datetime import date
from typing import Literal, Self

from pydantic import AwareDatetime, BaseModel, Field, StrictInt, model_validator

Payment = Literal["cash", "card"]


class Trip(BaseModel):
    """Поездка. Суммы в тенге, целые числа."""

    id: str = Field(min_length=1, max_length=64)
    start: AwareDatetime
    end: AwareDatetime
    amount: StrictInt = Field(gt=0)
    payment: Payment
    commission: StrictInt = Field(ge=0)

    @model_validator(mode="after")
    def check_consistency(self) -> Self:
        if self.end <= self.start:
            raise ValueError("Окончание поездки должно быть позже начала")
        if self.commission > self.amount:
            raise ValueError("Комиссия не может превышать сумму поездки")
        return self


class PaymentTotal(BaseModel):
    count: int
    amount: int


class DaySummary(BaseModel):
    trips_count: int
    revenue: int
    commission: int
    net: int
    cash: PaymentTotal
    card: PaymentTotal


class DayReport(BaseModel):
    date: date
    timezone: str
    summary: DaySummary
    trips: list[Trip]


class DaysList(BaseModel):
    timezone: str
    days: list[date]
