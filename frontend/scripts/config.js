(function (window) {
  const isLocalEnvironment = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );
  const backendApiBaseUrl = isLocalEnvironment
    ? "http://localhost:5000/api"
    : "https://ezsaldo-backend.onrender.com/api";

  window.EZSaldoConfig = Object.freeze({
    API_URL: `${backendApiBaseUrl}/transactions`,
    AUTH_API_URL: `${backendApiBaseUrl}/auth`,
    ANALYTICS_API_URL: `${backendApiBaseUrl}/analytics`,
    MIN_TRANSACTION_DATE: "2026-01-01",
    DEFAULT_AVATAR_SRC: "assets/avatar-default.png",
    USER_PROFILE_IMAGE_STORAGE_KEY: "userProfileImage",
    NAME_LOCALE: "pt-BR",
    MAX_DESCRIPTION_LENGTH: 40,
    DEFAULT_CHART_RANGE: "7"
  });
})(window);
