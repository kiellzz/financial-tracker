import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response, status

from .analysis import analyze_finances
from .config import get_settings
from .reports import create_pdf_report
from .schemas import AnalyticsRequest, AnalyticsResponse, MonthlyReportRequest


app = FastAPI(
    title="EZSaldo Analytics Service",
    version="1.0.0",
    description=(
        "Serviço interno de análise financeira. Projeções retornadas "
        "por esta API são estimativas, não garantias de resultado futuro."
    )
)


def require_internal_api_key(
    x_internal_api_key: Annotated[str | None, Header()] = None
) -> None:
    configured_key = get_settings().internal_api_key

    if not configured_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chave interna não configurada no serviço de análise."
        )

    if not x_internal_api_key or not secrets.compare_digest(
        x_internal_api_key,
        configured_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave interna inválida."
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/v1/analytics/summary",
    response_model=AnalyticsResponse,
    dependencies=[Depends(require_internal_api_key)]
)
def analytics_summary(request: AnalyticsRequest) -> AnalyticsResponse:
    return analyze_finances(request)


@app.post(
    "/v1/reports/monthly",
    dependencies=[Depends(require_internal_api_key)]
)
def monthly_report(
    request: MonthlyReportRequest,
    report_format: Annotated[str, Query(alias="format")] = "pdf"
) -> Response:
    if report_format != "pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato inválido. Apenas PDF é aceito."
        )

    content = create_pdf_report(request)
    media_type = "application/pdf"

    filename = f"ezsaldo-relatorio-{request.month}.{report_format}"
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
