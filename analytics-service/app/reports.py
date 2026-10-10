from __future__ import annotations

from io import BytesIO

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .schemas import MonthlyReportRequest


def _monthly_frame(request: MonthlyReportRequest) -> pd.DataFrame:
    rows = [transaction.model_dump() for transaction in request.transactions]

    if not rows:
        return pd.DataFrame(
            columns=["date", "description", "category", "type", "amount"]
        )

    frame = pd.DataFrame(rows)
    frame["date"] = pd.to_datetime(frame["date"], utc=True).dt.tz_localize(None)
    frame = frame.loc[frame["date"].dt.to_period("M") == pd.Period(request.month)]
    frame = frame.sort_values("date")
    return frame[["date", "description", "category", "type", "amount"]].copy()


def _currency(value: float) -> str:
    numeric_value = float(value)
    formatted = f"{abs(numeric_value):,.2f}"
    localized = formatted.replace(",", "_").replace(".", ",").replace("_", ".")
    sign = "- " if numeric_value < 0 else ""
    return f"{sign}R$ {localized}"


def create_pdf_report(request: MonthlyReportRequest) -> bytes:
    frame = _monthly_frame(request)
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Relatório mensal EZSaldo - {request.month}"
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("EZSaldo - Relatório financeiro mensal", styles["Title"]),
        Paragraph(f"Período: {request.month}", styles["Heading2"]),
        Paragraph(
            "Este relatório utiliza exclusivamente dados sintéticos ou "
            "transações fornecidas pelo backend autenticado.",
            styles["BodyText"]
        ),
        Spacer(1, 8 * mm)
    ]

    income = float(frame.loc[frame["type"] == "income", "amount"].sum())
    expense = float(frame.loc[frame["type"] == "expense", "amount"].sum())
    summary_data = [
        ["Receitas", "Despesas", "Resultado"],
        [_currency(income), _currency(-expense), _currency(income - expense)]
    ]
    summary_table = Table(summary_data, colWidths=[56 * mm] * 3)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10213a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9aa8ba")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7)
    ]))
    story.extend([summary_table, Spacer(1, 8 * mm)])

    transaction_data = [["Data", "Descrição", "Categoria", "Tipo", "Valor"]]

    for row in frame.itertuples(index=False):
        transaction_data.append([
            row.date.strftime("%d/%m/%Y"),
            row.description or "Sem descrição",
            row.category,
            "Receita" if row.type == "income" else "Despesa",
            _currency(row.amount if row.type == "income" else -row.amount)
        ])

    if len(transaction_data) == 1:
        transaction_data.append(["-", "Nenhuma transação no período", "-", "-", "-"])

    transaction_table = Table(
        transaction_data,
        repeatRows=1,
        colWidths=[24 * mm, 58 * mm, 35 * mm, 24 * mm, 30 * mm]
    )
    transaction_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f8cc9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (4, 1), (4, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#b7c2cf")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#edf5fb")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5)
    ]))
    story.append(transaction_table)
    document.build(story)
    return buffer.getvalue()
