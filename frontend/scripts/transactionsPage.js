(function (window, document) {
  const config = window.EZSaldoConfig;
  const dateUtils = window.EZSaldoDateUtils;
  const formatters = window.EZSaldoFormatters;
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const api = window.EZSaldoDashboardApi.create(token);
  const elements = {
    loader: document.getElementById("transactionsLoader"),
    filterForm: document.getElementById("transactionsFilterForm"),
    dateFrom: document.getElementById("dateFromFilter"),
    dateTo: document.getElementById("dateToFilter"),
    type: document.getElementById("typeFilter"),
    minValue: document.getElementById("minValueFilter"),
    maxValue: document.getElementById("maxValueFilter"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    feedback: document.getElementById("filterFeedback"),
    list: document.getElementById("transactionsPageList"),
    resultsCount: document.getElementById("resultsCount"),
    resultsDescription: document.getElementById("resultsDescription"),
    error: document.getElementById("transactionsError"),
    errorMessage: document.getElementById("transactionsErrorMessage"),
    retryBtn: document.getElementById("retryTransactionsBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    logoutModal: document.getElementById("logoutModal"),
    confirmLogoutBtn: document.getElementById("confirmLogout"),
    cancelLogoutBtn: document.getElementById("cancelLogout")
  };
  const state = {
    transactions: []
  };

  function createElement(tagName, className, textContent = "") {
    const element = document.createElement(tagName);

    if (className) element.className = className;
    if (textContent) element.textContent = textContent;

    return element;
  }

  function setLoading(isLoading) {
    elements.loader?.classList.toggle("hidden", !isLoading);
  }

  function clearFeedback() {
    elements.feedback.textContent = "";
    elements.feedback.classList.add("hidden");
  }

  function showFeedback(message) {
    elements.feedback.textContent = message;
    elements.feedback.classList.remove("hidden");
  }

  function setDateLimits() {
    const today = dateUtils.getTodayDateKey();

    [elements.dateFrom, elements.dateTo].forEach((input) => {
      input.min = config.MIN_TRANSACTION_DATE;
      input.max = today;
    });
  }

  function getTransactionLabel(description) {
    return String(description || "").trim() || "Sem descrição";
  }

  function getSignedValue(transaction) {
    const amount = Math.abs(Number(transaction.amount) || 0);
    const signal = transaction.type === "expense" ? "-" : "+";
    return `${signal} ${formatters.formatCurrency(amount)}`;
  }

  function createTransactionItem(transaction) {
    const isExpense = transaction.type === "expense";
    const amountClass = isExpense ? "negative" : "positive";
    const typeLabel = isExpense ? "Saída" : "Entrada";
    const iconSymbol = isExpense ? "↘" : "↗";
    const dateKey = dateUtils.getTransactionDateKey(transaction.date);

    const item = createElement("li", "transaction-item");
    const left = createElement("div", "transaction-left");
    const icon = createElement("div", `transaction-icon ${amountClass}`, iconSymbol);
    const content = createElement("div", "transaction-content");
    const title = createElement(
      "strong",
      "transaction-title",
      getTransactionLabel(transaction.description)
    );
    const subtitle = createElement(
      "span",
      `transaction-subtitle ${amountClass}`,
      `${typeLabel} • ${transaction.category || "Outros"}`
    );
    const date = createElement(
      "span",
      "transaction-date",
      dateUtils.formatDateKeyBR(dateKey) || "Data não informada"
    );
    const right = createElement("div", "transaction-right");
    const value = createElement(
      "strong",
      `transaction-value ${amountClass}`,
      getSignedValue(transaction)
    );

    content.append(title, subtitle, date);
    left.append(icon, content);
    right.appendChild(value);
    item.append(left, right);

    return item;
  }

  function updateResultsCount(total) {
    elements.resultsCount.textContent = total === 1
      ? "1 transação"
      : `${total} transações`;
  }

  function renderTransactions(transactions, isFiltered = false) {
    elements.list.innerHTML = "";
    updateResultsCount(transactions.length);
    elements.resultsDescription.textContent = isFiltered
      ? "Resultado dos filtros, da mais recente para a mais antiga."
      : "Ordenadas da mais recente para a mais antiga.";

    if (!transactions.length) {
      const emptyItem = createElement("li", "transactions-page-empty");
      const message = createElement(
        "p",
        "",
        isFiltered
          ? "Nenhuma transação corresponde aos filtros selecionados."
          : "Você ainda não possui transações cadastradas."
      );

      emptyItem.appendChild(message);
      elements.list.appendChild(emptyItem);
      return;
    }

    transactions.forEach((transaction) => {
      elements.list.appendChild(createTransactionItem(transaction));
    });
  }

  function readOptionalAmount(input) {
    if (!input.value.trim()) return null;

    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  }

  function applyFilters(event) {
    event?.preventDefault();
    clearFeedback();

    const dateFrom = elements.dateFrom.value;
    const dateTo = elements.dateTo.value;
    const type = elements.type.value;
    const minValue = readOptionalAmount(elements.minValue);
    const maxValue = readOptionalAmount(elements.maxValue);

    if (dateFrom && dateTo && dateFrom > dateTo) {
      showFeedback("A data inicial não pode ser posterior à data final.");
      return;
    }

    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      showFeedback("O valor mínimo não pode ser maior que o valor máximo.");
      return;
    }

    const filtered = state.transactions.filter((transaction) => {
      const dateKey = dateUtils.getTransactionDateKey(transaction.date);
      const amount = Math.abs(Number(transaction.amount) || 0);

      if (dateFrom && (!dateKey || dateKey < dateFrom)) return false;
      if (dateTo && (!dateKey || dateKey > dateTo)) return false;
      if (type !== "all" && transaction.type !== type) return false;
      if (minValue !== null && amount < minValue) return false;
      if (maxValue !== null && amount > maxValue) return false;

      return true;
    });

    renderTransactions(filtered, true);
  }

  function clearFilters() {
    elements.filterForm.reset();
    clearFeedback();
    renderTransactions(state.transactions);
  }

  function setError(message = "") {
    const hasError = Boolean(message);
    elements.error.classList.toggle("hidden", !hasError);
    elements.list.classList.toggle("hidden", hasError);

    if (hasError) {
      elements.errorMessage.textContent = message;
      updateResultsCount(0);
    }
  }

  async function loadTransactions() {
    setLoading(true);
    setError();

    try {
      const data = await api.getTransactions();
      state.transactions = data.transactions;
      renderTransactions(state.transactions);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      setError(error.message || "Não foi possível carregar as transações.");
    } finally {
      setLoading(false);
    }
  }

  function confirmLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem(config.USER_PROFILE_IMAGE_STORAGE_KEY);
    window.location.href = "login.html";
  }

  function setupEvents() {
    elements.filterForm.addEventListener("submit", applyFilters);
    elements.clearFiltersBtn.addEventListener("click", clearFilters);
    elements.retryBtn.addEventListener("click", loadTransactions);
    elements.logoutBtn.addEventListener("click", () => {
      elements.logoutModal.classList.remove("hidden");
    });
    elements.cancelLogoutBtn.addEventListener("click", () => {
      elements.logoutModal.classList.add("hidden");
    });
    elements.confirmLogoutBtn.addEventListener("click", confirmLogout);
  }

  function init() {
    setDateLimits();
    setupEvents();
    loadTransactions();
  }

  init();
})(window, document);
