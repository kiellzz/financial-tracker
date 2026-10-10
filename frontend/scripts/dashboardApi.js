(function (window) {
  const { API_URL, AUTH_API_URL, ANALYTICS_API_URL } = window.EZSaldoConfig;

  function createDashboardApi(token) {
    function getRequestHeaders(withJson = false) {
      const headers = {
        Authorization: `Bearer ${token}`
      };

      if (withJson) {
        headers["Content-Type"] = "application/json";
      }

      return headers;
    }

    async function readJsonResponse(response, fallbackMessage) {
      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || fallbackMessage);
      }

      return data;
    }

    async function getCurrentUserProfile() {
      const response = await fetch(`${AUTH_API_URL}/me`, {
        headers: getRequestHeaders()
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    }

    async function getTransactions() {
      const response = await fetch(API_URL, {
        headers: getRequestHeaders()
      });
      const data = await readJsonResponse(
        response,
        "Erro ao carregar transa\u00e7\u00f5es"
      );

      return {
        balance: Number(data.balance) || 0,
        transactions: Array.isArray(data.transactions)
          ? data.transactions
          : []
      };
    }

    async function getAnalyticsSummary() {
      const response = await fetch(`${ANALYTICS_API_URL}/summary`, {
        headers: getRequestHeaders()
      });

      return readJsonResponse(
        response,
        "Erro ao carregar a análise financeira"
      );
    }

    async function downloadMonthlyReport(month, format) {
      const query = new URLSearchParams({ month, format });
      const response = await fetch(`${ANALYTICS_API_URL}/report?${query}`, {
        headers: getRequestHeaders()
      });

      if (!response.ok) {
        await readJsonResponse(response, "Erro ao exportar o relatório");
      }

      return response.blob();
    }

    async function saveTransaction(transaction, editingId = null) {
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? "PUT" : "POST",
        headers: getRequestHeaders(true),
        body: JSON.stringify(transaction)
      });

      return readJsonResponse(response, "Erro na opera\u00e7\u00e3o");
    }

    async function deleteTransaction(id) {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: getRequestHeaders()
      });

      return readJsonResponse(response, "Erro ao deletar");
    }

    return {
      deleteTransaction,
      downloadMonthlyReport,
      getAnalyticsSummary,
      getCurrentUserProfile,
      getTransactions,
      saveTransaction
    };
  }

  window.EZSaldoDashboardApi = {
    create: createDashboardApi
  };
})(window);
