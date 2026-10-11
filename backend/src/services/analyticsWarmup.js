const WARMUP_INTERVAL_MS = 5 * 60 * 1000;

let lastWarmupAt = 0;

function warmAnalyticsService() {
  const now = Date.now();

  if (now - lastWarmupAt < WARMUP_INTERVAL_MS) {
    return;
  }

  const baseUrl = String(process.env.ANALYTICS_SERVICE_URL || "")
    .replace(/\/+$/, "");

  if (!baseUrl) {
    return;
  }

  lastWarmupAt = now;

  void fetch(`${baseUrl}/health`)
    .then((response) => {
      if (!response.ok) {
        console.warn("Warm-up do serviço de análise retornou:", response.status);
      }
    })
    .catch((error) => {
      console.warn("Warm-up do serviço de análise falhou:", {
        code: error?.cause?.code || error?.code,
        message: error.message
      });
    });
}

module.exports = { warmAnalyticsService };
