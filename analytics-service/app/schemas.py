from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class TransactionInput(BaseModel):
    id: str | None = None
    type: Literal["income", "expense"]
    amount: float = Field(gt=0)
    category: str = Field(default="Outros", min_length=1, max_length=50)
    description: str = Field(default="", max_length=120)
    date: datetime

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        return value.strip() or "Outros"


class AnalyticsRequest(BaseModel):
    transactions: list[TransactionInput] = Field(default_factory=list)
    reference_date: date = Field(default_factory=date.today)


class MonthlyReportRequest(AnalyticsRequest):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class CategorySpending(BaseModel):
    category: str
    amount: float
    percentage_of_expenses: float


class MonthlyEvolution(BaseModel):
    month: str
    income: float
    expense: float
    net: float


class CategoryComparison(BaseModel):
    category: str
    current_amount: float
    previous_amount: float
    percentage_change: float | None
    trend: Literal["up", "down", "stable", "new_category"]
    message: str


class OutlierExpense(BaseModel):
    transaction_id: str | None
    category: str
    description: str
    amount: float
    date: datetime
    upper_bound: float
    method: Literal["iqr"] = "iqr"


class BalanceProjection(BaseModel):
    is_estimate: Literal[True] = True
    projected_month: str
    value: float | None
    current_balance: float
    average_monthly_net: float | None
    months_used: list[str]
    method: Literal["moving_average_3_complete_months"] = (
        "moving_average_3_complete_months"
    )
    warning: str | None


class AnalyticsResponse(BaseModel):
    reference_month: str
    category_spending: list[CategorySpending]
    monthly_evolution: list[MonthlyEvolution]
    category_comparisons: list[CategoryComparison]
    outliers: list[OutlierExpense]
    projection: BalanceProjection
    warnings: list[str]
