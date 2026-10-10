const DEFAULT_TIMEOUT_MS = 5000;

class AnalyticsServiceError extends Error {
  constructor(message, statusCode, cause = null) {
    super(message);
    this.name = "AnalyticsServiceError";
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

function getAnalyticsConfig() {
  const baseUrl = String(process.env.ANALYTICS_SERVICE_URL || "").replace(/\/+$/, "");
  const apiKey = String(process.env.ANALYTICS_API_KEY || "");
  const configuredTimeout = Number(process.env.ANALYTICS_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS;

  if (!baseUrl || !apiKey) {
    throw new AnalyticsServiceError(
      "Serviço de análise financeira não configurado.",
      503
    );
  }

  return { apiKey, baseUrl, timeoutMs };
}

async function callAnalyticsService(path, payload, readResponse) {
  const { apiKey, baseUrl, timeoutMs } = getAnalyticsConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      let detail = "";

      try {
        const errorBody = await response.json();
        detail = typeof errorBody.detail === "string" ? errorBody.detail : "";
      } catch (error) {
        detail = "";
      }

      throw new AnalyticsServiceError(
        detail || "O serviço de análise recusou a solicitação.",
        502
      );
    }

    try {
      return await readResponse(response);
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }

      throw new AnalyticsServiceError(
        "O serviço de análise retornou uma resposta inválida.",
        502,
        error
      );
    }
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new AnalyticsServiceError(
        "O serviço de análise demorou mais que o esperado. Tente novamente.",
        504,
        error
      );
    }

    throw new AnalyticsServiceError(
      "O serviço de análise está indisponível no momento. O restante do EZSaldo continua funcionando.",
      503,
      error
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getAnalyticsSummary(payload) {
  return callAnalyticsService(
    "/v1/analytics/summary",
    payload,
    (response) => response.json()
  );
}

async function getMonthlyReport(payload, format) {
  return callAnalyticsService(
    `/v1/reports/monthly?format=${encodeURIComponent(format)}`,
    payload,
    async (response) => Buffer.from(await response.arrayBuffer())
  );
}

module.exports = {
  AnalyticsServiceError,
  getAnalyticsSummary,
  getMonthlyReport
};
