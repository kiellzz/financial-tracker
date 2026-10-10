from __future__ import annotations

from datetime import date

import pandas as pd

from .schemas import AnalyticsRequest, AnalyticsResponse


MIN_OUTLIER_SAMPLES = 4
PROJECTION_MONTHS = 3


def _money(value: float) -> float:
    return round(float(value), 2)


def _percentage(value: float) -> float:
    return round(float(value), 1)


def _to_dataframe(request: AnalyticsRequest) -> pd.DataFrame:
    rows = [transaction.model_dump() for transaction in request.transactions]

    if not rows:
        return pd.DataFrame(
            columns=["id", "type", "amount", "category", "description", "date"]
        )

    frame = pd.DataFrame(rows)
    frame["date"] = pd.to_datetime(frame["date"], utc=True).dt.tz_localize(None)
    frame["amount"] = pd.to_numeric(frame["amount"])
    frame["category"] = frame["category"].fillna("Outros")
    frame["description"] = frame["description"].fillna("")

    reference_end = pd.Timestamp(request.reference_date) + pd.Timedelta(days=1)
    return frame.loc[frame["date"] < reference_end].copy()


def _month_bounds(reference_date: date) -> tuple[pd.Period, pd.Period]:
    current_month = pd.Period(reference_date, freq="M")
    return current_month, current_month - 1


def _category_spending(
    frame: pd.DataFrame,
    current_month: pd.Period
) -> list[dict[str, object]]:
    if frame.empty:
        return []

    expenses = frame.loc[
        (frame["type"] == "expense")
        & (frame["date"].dt.to_period("M") == current_month)
    ]

    if expenses.empty:
        return []

    grouped = expenses.groupby("category", as_index=False)["amount"].sum()
    total = float(grouped["amount"].sum())
    grouped = grouped.sort_values("amount", ascending=False)

    return [
        {
            "category": row.category,
            "amount": _money(-row.amount),
            "percentage_of_expenses": _percentage((row.amount / total) * 100)
        }
        for row in grouped.itertuples(index=False)
    ]


def _monthly_evolution(frame: pd.DataFrame) -> list[dict[str, object]]:
    if frame.empty:
        return []

    working = frame.copy()
    working["month"] = working["date"].dt.to_period("M")
    grouped = working.pivot_table(
        index="month",
        columns="type",
        values="amount",
        aggfunc="sum",
        fill_value=0
    ).sort_index()

    first_month = grouped.index.min()
    last_month = grouped.index.max()
    grouped = grouped.reindex(
        pd.period_range(first_month, last_month, freq="M"),
        fill_value=0
    )

    return [
        {
            "month": str(month),
            "income": _money(row.get("income", 0)),
            "expense": _money(-row.get("expense", 0)),
            "net": _money(row.get("income", 0) - row.get("expense", 0))
        }
        for month, row in grouped.iterrows()
    ]


def _comparison_message(
    category: str,
    percentage_change: float | None,
    trend: str
) -> str:
    category_name = category.lower()

    if trend == "new_category":
        return f"{category} não teve gastos no mês anterior."

    if trend == "stable":
        return f"Os gastos em {category_name} permaneceram estáveis."

    direction = "a mais" if trend == "up" else "a menos"
    return f"Gastou {abs(percentage_change or 0):.1f}% {direction} em {category_name}."


def _category_comparisons(
    frame: pd.DataFrame,
    current_month: pd.Period,
    previous_month: pd.Period
) -> list[dict[str, object]]:
    expenses = frame.loc[frame["type"] == "expense"].copy()

    if expenses.empty:
        return []

    expenses["month"] = expenses["date"].dt.to_period("M")
    totals = expenses.loc[
        expenses["month"].isin([current_month, previous_month])
    ].groupby(["month", "category"])["amount"].sum()

    categories = sorted({category for _, category in totals.index})
    comparisons: list[dict[str, object]] = []

    for category in categories:
        current_amount = float(totals.get((current_month, category), 0))
        previous_amount = float(totals.get((previous_month, category), 0))

        if previous_amount == 0 and current_amount > 0:
            percentage_change = None
            trend = "new_category"
        elif previous_amount == 0:
            percentage_change = 0.0
            trend = "stable"
        else:
            percentage_change = _percentage(
                ((current_amount - previous_amount) / previous_amount) * 100
            )
            trend = (
                "up" if percentage_change > 0
                else "down" if percentage_change < 0
                else "stable"
            )

        comparisons.append({
            "category": category,
            "current_amount": _money(-current_amount),
            "previous_amount": _money(-previous_amount),
            "percentage_change": percentage_change,
            "trend": trend,
            "message": _comparison_message(category, percentage_change, trend)
        })

    return sorted(
        comparisons,
        key=lambda item: abs(item["current_amount"]),
        reverse=True
    )


def _outliers(frame: pd.DataFrame) -> tuple[list[dict[str, object]], list[str]]:
    expenses = frame.loc[frame["type"] == "expense"]
    outliers: list[dict[str, object]] = []
    warnings: list[str] = []

    for category, group in expenses.groupby("category"):
        if len(group) < MIN_OUTLIER_SAMPLES:
            warnings.append(
                f"{category}: são necessários pelo menos "
                f"{MIN_OUTLIER_SAMPLES} gastos para analisar valores atípicos."
            )
            continue

        # IQR foi escolhido por ser resistente a distribuições assimétricas.
        # Um gasto alto é atípico quando supera Q3 + 1,5 vezes o intervalo
        # interquartil. Detectamos apenas a cauda superior, que é a relevante
        # para alertas de gastos inesperadamente elevados.
        first_quartile = float(group["amount"].quantile(0.25))
        third_quartile = float(group["amount"].quantile(0.75))
        upper_bound = third_quartile + 1.5 * (third_quartile - first_quartile)

        flagged = group.loc[group["amount"] > upper_bound]

        for row in flagged.itertuples(index=False):
            outliers.append({
                "transaction_id": row.id,
                "category": category,
                "description": row.description,
                "amount": _money(-row.amount),
                "date": row.date.to_pydatetime(),
                "upper_bound": _money(upper_bound),
                "method": "iqr"
            })

    outliers.sort(
        key=lambda item: (item["date"], abs(item["amount"])),
        reverse=True
    )
    return outliers, warnings


def _projection(
    frame: pd.DataFrame,
    current_month: pd.Period
) -> tuple[dict[str, object], list[str]]:
    projected_month = str(current_month + 1)
    current_balance = 0.0

    if not frame.empty:
        signed_amounts = frame["amount"].where(
            frame["type"] == "income",
            -frame["amount"]
        )
        current_balance = float(signed_amounts.sum())

    if frame.empty:
        warning = (
            "Projeção indisponível: são necessários pelo menos "
            "3 meses completos com transações."
        )
        return {
            "is_estimate": True,
            "projected_month": projected_month,
            "value": None,
            "current_balance": 0.0,
            "average_monthly_net": None,
            "months_used": [],
            "method": "moving_average_3_complete_months",
            "warning": warning
        }, [warning]

    complete_history = frame.loc[
        frame["date"].dt.to_period("M") < current_month
    ].copy()

    if complete_history.empty:
        warning = (
            "Projeção indisponível: são necessários pelo menos "
            "3 meses completos com transações."
        )
        return {
            "is_estimate": True,
            "projected_month": projected_month,
            "value": None,
            "current_balance": _money(current_balance),
            "average_monthly_net": None,
            "months_used": [],
            "method": "moving_average_3_complete_months",
            "warning": warning
        }, [warning]

    complete_history["month"] = complete_history["date"].dt.to_period("M")
    complete_history["signed_amount"] = complete_history["amount"].where(
        complete_history["type"] == "income",
        -complete_history["amount"]
    )
    monthly_net = complete_history.groupby("month")["signed_amount"].sum().sort_index()

    if len(monthly_net) < PROJECTION_MONTHS:
        warning = (
            "Projeção indisponível: são necessários pelo menos "
            "3 meses completos com transações."
        )
        return {
            "is_estimate": True,
            "projected_month": projected_month,
            "value": None,
            "current_balance": _money(current_balance),
            "average_monthly_net": None,
            "months_used": [str(month) for month in monthly_net.index],
            "method": "moving_average_3_complete_months",
            "warning": warning
        }, [warning]

    recent_months = monthly_net.tail(PROJECTION_MONTHS)
    average_monthly_net = float(recent_months.mean())

    return {
        "is_estimate": True,
        "projected_month": projected_month,
        "value": _money(current_balance + average_monthly_net),
        "current_balance": _money(current_balance),
        "average_monthly_net": _money(average_monthly_net),
        "months_used": [str(month) for month in recent_months.index],
        "method": "moving_average_3_complete_months",
        "warning": None
    }, []


def analyze_finances(request: AnalyticsRequest) -> AnalyticsResponse:
    frame = _to_dataframe(request)
    current_month, previous_month = _month_bounds(request.reference_date)
    outliers, outlier_warnings = _outliers(frame)
    projection, projection_warnings = _projection(frame, current_month)

    return AnalyticsResponse(
        reference_month=str(current_month),
        category_spending=_category_spending(frame, current_month),
        monthly_evolution=_monthly_evolution(frame),
        category_comparisons=_category_comparisons(
            frame,
            current_month,
            previous_month
        ),
        outliers=outliers,
        projection=projection,
        warnings=[*outlier_warnings, *projection_warnings]
    )
