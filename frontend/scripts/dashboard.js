(function (window, document) {
  const config = window.EZSaldoConfig;
  const dateUtils = window.EZSaldoDateUtils;
  const formatters = window.EZSaldoFormatters;
  const chartData = window.EZSaldoChartData;
  const balanceChart = window.EZSaldoBalanceChart;
  const analyticsCharts = window.EZSaldoAnalyticsCharts;

  const {
    DEFAULT_AVATAR_SRC,
    DEFAULT_CHART_RANGE,
    MAX_DESCRIPTION_LENGTH,
    MIN_TRANSACTION_DATE,
    USER_PROFILE_IMAGE_STORAGE_KEY
  } = config;

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const api = window.EZSaldoDashboardApi.create(token);
  const elements = window.EZSaldoDashboardDom.getElements();

  const state = {
    editingId: null,
    transactionToDelete: null,
    allTransactions: [],
    chartRange: DEFAULT_CHART_RANGE,
    accountCreatedAt: null,
    subtractFirstIncome: false,
    toastTimeoutId: null,
    analyticsRequestId: 0,
    transactionPreviewFrameId: null,
    transactionPreviewCardHeight: 0,
    transactionPreviewResizeObserver: null,
    reportPreviewUrl: null,
    reportPreviewFileName: ""
  };

  function showLoader() {
    elements.globalLoader?.classList.remove("hidden");
  }

  function hideLoader() {
    elements.globalLoader?.classList.add("hidden");
  }

  function updateWelcomeMessage(name = "") {
    const firstName = formatters.getFirstName(name);

    if (elements.introDisplay) {
      elements.introDisplay.textContent = firstName
        ? "Seja bem-vindo(a),"
        : "Seja bem-vindo(a)!";
    }

    if (elements.nameDisplay) {
      elements.nameDisplay.textContent = firstName ? `${firstName}!` : "";
    }

    if (elements.avatarDisplay) {
      elements.avatarDisplay.alt = firstName
        ? `Foto de perfil de ${firstName}`
        : "Foto de perfil";
    }
  }

  function updateProfileAvatar(profileImage = "") {
    if (!elements.avatarDisplay) return;

    const nextAvatar = profileImage || DEFAULT_AVATAR_SRC;

    elements.avatarDisplay.dataset.isFallback = String(
      nextAvatar === DEFAULT_AVATAR_SRC
    );
    elements.avatarDisplay.src = nextAvatar;
  }

  function persistCurrentUser(name = "", profileImage = "") {
    const formattedName = formatters.capitalizeFullName(name);

    if (formattedName) {
      localStorage.setItem("userName", formattedName);
    }

    if (profileImage) {
      localStorage.setItem(USER_PROFILE_IMAGE_STORAGE_KEY, profileImage);
    } else {
      localStorage.removeItem(USER_PROFILE_IMAGE_STORAGE_KEY);
    }

    updateWelcomeMessage(formattedName);
    updateProfileAvatar(profileImage || "");
  }

  function loadCachedUserProfile() {
    updateWelcomeMessage(localStorage.getItem("userName") || "");
    updateProfileAvatar(
      localStorage.getItem(USER_PROFILE_IMAGE_STORAGE_KEY) || ""
    );
  }

  function setupAvatarFallback() {
    if (!elements.avatarDisplay) return;

    elements.avatarDisplay.addEventListener("error", () => {
      if (elements.avatarDisplay.dataset.isFallback === "true") {
        return;
      }

      elements.avatarDisplay.dataset.isFallback = "true";
      elements.avatarDisplay.src = DEFAULT_AVATAR_SRC;
    });
  }

  function clearFormFeedback() {
    if (!elements.formFeedback) return;

    elements.formFeedback.textContent = "";
    elements.formFeedback.classList.add("hidden");
    elements.formFeedback.classList.remove("error", "success", "info");
  }

  function showFormFeedback(message, type = "error") {
    if (!elements.formFeedback) return;

    elements.formFeedback.textContent = message;
    elements.formFeedback.classList.remove("hidden", "error", "success", "info");
    elements.formFeedback.classList.add(type);
  }

  function hideToast() {
    if (!elements.appToast) return;

    elements.appToast.classList.remove("visible", "error", "success", "info");

    if (state.toastTimeoutId) {
      clearTimeout(state.toastTimeoutId);
      state.toastTimeoutId = null;
    }

    window.setTimeout(() => {
      if (!elements.appToast.classList.contains("visible")) {
        elements.appToast.classList.add("hidden");
        elements.appToast.textContent = "";
      }
    }, 250);
  }

  function showToast(message, type = "error", duration = 3600) {
    if (!elements.appToast) return;

    if (state.toastTimeoutId) {
      clearTimeout(state.toastTimeoutId);
    }

    elements.appToast.textContent = message;
    elements.appToast.classList.remove("hidden", "error", "success", "info");
    elements.appToast.classList.add(type);

    window.requestAnimationFrame(() => {
      elements.appToast.classList.add("visible");
    });

    state.toastTimeoutId = window.setTimeout(hideToast, duration);
  }

  function getSubmitButton() {
    return elements.form?.querySelector('button[type="submit"]') || null;
  }

  function setSubmitButtonState({ text, disabled }) {
    const button = getSubmitButton();
    if (!button) return;

    button.innerText = text;
    button.disabled = disabled;
  }

  function setTransactionDateValue(dateKey) {
    if (!elements.dateInput) return;

    let nextDateKey = dateKey || dateUtils.getDefaultTransactionDateKey();

    if (nextDateKey < MIN_TRANSACTION_DATE) {
      nextDateKey = MIN_TRANSACTION_DATE;
    }

    elements.dateInput.value = nextDateKey;
  }

  function getSelectedTransactionDateKey() {
    const selectedDate = elements.dateInput?.value;

    return selectedDate && selectedDate >= MIN_TRANSACTION_DATE
      ? selectedDate
      : dateUtils.getDefaultTransactionDateKey();
  }

  function resetFormState() {
    elements.form?.reset();
    state.editingId = null;
    clearFormFeedback();

    if (elements.categoryInput) {
      elements.categoryInput.value = "Outros";
    }

    if (elements.charCount) {
      elements.charCount.textContent = `0/${MAX_DESCRIPTION_LENGTH}`;
    }

    if (elements.dateInput) {
      elements.dateInput.min = MIN_TRANSACTION_DATE;
      elements.dateInput.max = dateUtils.getTodayDateKey();
      setTransactionDateValue(dateUtils.getDefaultTransactionDateKey());
    }

    setSubmitButtonState({
      text: "Adicionar",
      disabled: false
    });
  }

  function getInputStepValue(input, fallback = 1) {
    const parsedStep = Number(input?.step);

    return Number.isFinite(parsedStep) && parsedStep > 0
      ? parsedStep
      : fallback;
  }

  function getStepPrecision(stepValue) {
    const [, decimalPart = ""] = String(stepValue).split(".");
    return decimalPart.length;
  }

  function adjustAmountValue(direction) {
    if (!elements.amountInput) return;

    const stepValue = getInputStepValue(elements.amountInput, 0.01);
    const precision = getStepPrecision(stepValue);
    const multiplier = 10 ** precision;
    const currentValue = Number(elements.amountInput.value);
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0;
    const currentUnits = Math.round(safeCurrentValue * multiplier);
    const stepUnits = Math.round(stepValue * multiplier);
    const nextValue = (currentUnits + direction * stepUnits) / multiplier;

    elements.amountInput.value = nextValue.toFixed(precision);
  }

  function adjustTransactionDate(offsetDays) {
    const baseDateKey = getSelectedTransactionDateKey();
    let nextDateKey = dateUtils.shiftDateKey(baseDateKey, offsetDays);

    if (nextDateKey < MIN_TRANSACTION_DATE) {
      nextDateKey = MIN_TRANSACTION_DATE;
    }

    if (nextDateKey > dateUtils.getTodayDateKey()) {
      nextDateKey = dateUtils.getTodayDateKey();
    }

    setTransactionDateValue(nextDateKey);
  }

  function setBalanceStyle(balance) {
    if (!elements.balanceDisplay) return;

    elements.balanceDisplay.classList.remove("positive", "negative", "neutral");

    if (balance === 0) {
      elements.balanceDisplay.classList.add("neutral");
    } else if (balance > 0) {
      elements.balanceDisplay.classList.add("positive");
    } else {
      elements.balanceDisplay.classList.add("negative");
    }
  }

  function getTransactionLabel(description) {
    const text = String(description || "").trim();
    return text || "Sem descri\u00e7\u00e3o";
  }

  function getTransactionAmountClass(type) {
    return type === "expense" ? "negative" : "positive";
  }

  function getTransactionSignedValue(type, amount) {
    const signal = type === "expense" ? "-" : "+";
    return `${signal} ${formatters.formatCurrency(amount)}`;
  }

  function updateToggleTransactionsButton(totalTransactions) {
    if (!elements.toggleTransactionsBtn) return;

    if (totalTransactions <= 3) {
      elements.toggleTransactionsBtn.classList.add("hidden");
      return;
    }

    elements.toggleTransactionsBtn.classList.remove("hidden");
    elements.toggleTransactionsBtn.textContent = "(+) Exibir mais";
  }

  function updateChartFilterButtons() {
    elements.chartFilterButtons?.forEach((button) => {
      const isActive = button.dataset.range === state.chartRange;
      button.classList.toggle("active", isActive);
    });
  }

  function updateChartPeriod(period = null) {
    if (!elements.chartPeriod) return;

    if (!period?.startKey || !period?.endKey) {
      elements.chartPeriod.textContent = "Per\u00edodo: sem dados";
      return;
    }

    const firstDate = dateUtils.formatDateKeyBR(period.startKey);
    const lastDate = dateUtils.formatDateKeyBR(period.endKey);

    if (!firstDate || !lastDate) {
      elements.chartPeriod.textContent = "Per\u00edodo: sem datas v\u00e1lidas";
      return;
    }

    if (firstDate === lastDate) {
      elements.chartPeriod.textContent = `Per\u00edodo: ${firstDate}`;
      return;
    }

    elements.chartPeriod.textContent = `Per\u00edodo: ${firstDate} \u2192 ${lastDate}`;
  }

  function formatPeriodResultRange(startKey, endKey) {
    const startDate = dateUtils.formatDateKeyBR(startKey);
    const endDate = endKey === dateUtils.getTodayDateKey()
      ? "Hoje"
      : dateUtils.formatDateKeyBR(endKey);

    if (!startDate || !endDate) {
      return "\u2014";
    }

    return `${startDate} \u2192 ${endDate}`;
  }

  function getPeriodResultMessage(periodResult) {
    const changeAmount = Number(periodResult?.changeAmount) || 0;

    if (changeAmount > 0) {
      return `Seu saldo aumentou em ${formatters.formatCurrency(changeAmount)}`;
    }

    if (changeAmount < 0) {
      return `Seu saldo diminuiu em ${formatters.formatCurrency(Math.abs(changeAmount))}`;
    }

    return "Seu saldo permaneceu igual";
  }

  function getFirstIncomeAmount() {
    const firstIncome = state.allTransactions
      .filter((transaction) => transaction.type === "income")
      .map((transaction) => ({
        amount: Number(transaction.amount) || 0,
        dateKey: dateUtils.getTransactionDateKey(transaction.date)
      }))
      .filter((transaction) => transaction.dateKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];

    return firstIncome?.amount || 0;
  }

  function getDisplayedPeriodResult(periodResult = null) {
    if (
      !periodResult ||
      state.chartRange !== "account" ||
      !state.subtractFirstIncome
    ) {
      return periodResult;
    }

    const changeAmount = (Number(periodResult.changeAmount) || 0)
      - getFirstIncomeAmount();

    return {
      ...periodResult,
      changeAmount,
      tone: changeAmount > 0
        ? "positive"
        : changeAmount < 0
          ? "negative"
          : "neutral"
    };
  }

  function updateSubtractFirstIncomeControl() {
    const isAccountRange = state.chartRange === "account";

    elements.subtractFirstIncomeControl?.classList.toggle(
      "hidden",
      !isAccountRange
    );

    if (elements.subtractFirstIncomeCheckbox) {
      elements.subtractFirstIncomeCheckbox.checked = state.subtractFirstIncome;
    }
  }

  function updatePeriodResult(periodResult = null) {
    if (!elements.periodResultCard || !elements.periodResultMessage) return;

    const tone = periodResult?.tone || "neutral";

    elements.periodResultCard.classList.remove("positive", "negative", "neutral");
    elements.periodResultCard.classList.add(tone);

    if (elements.periodResultRange) {
      elements.periodResultRange.textContent = periodResult
        ? formatPeriodResultRange(periodResult.startKey, periodResult.endKey)
        : "\u2014";
    }

    elements.periodResultMessage.textContent = getPeriodResultMessage(periodResult);
  }

  function setAnalyticsView(view, errorMessage = "") {
    const views = {
      loading: elements.analyticsLoading,
      error: elements.analyticsError,
      empty: elements.analyticsEmpty,
      content: elements.analyticsContent
    };

    Object.entries(views).forEach(([name, element]) => {
      element?.classList.toggle("hidden", name !== view);
    });

    if (elements.analyticsErrorMessage && errorMessage) {
      elements.analyticsErrorMessage.textContent = errorMessage;
    }
  }

  function formatReferenceMonth(monthKey) {
    if (!/^\d{4}-\d{2}$/.test(monthKey || "")) return "—";

    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
  }

  function renderComparisons(comparisons = []) {
    if (!elements.comparisonCards) return;

    elements.comparisonCards.innerHTML = "";

    if (!comparisons.length) {
      elements.comparisonCards.appendChild(createElement(
        "p",
        "analytics-inline-empty",
        "Ainda não há dois meses com despesas para comparar."
      ));
      return;
    }

    comparisons.forEach((comparison) => {
      const card = createElement(
        "article",
        `comparison-card ${comparison.trend || "stable"}`
      );
      const header = createElement("div", "comparison-card-header");
      const category = createElement("span", "comparison-category", comparison.category);
      let changeLabel = "0,0%";

      if (comparison.trend === "new_category") {
        changeLabel = "Nova categoria";
      } else if (Number.isFinite(Number(comparison.percentage_change))) {
        const percentage = Number(comparison.percentage_change);
        const signal = percentage > 0 ? "+" : "";
        changeLabel = `${signal}${percentage.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        })}%`;
      }

      const change = createElement("strong", "comparison-change", changeLabel);
      const message = createElement("p", "comparison-message", comparison.message);

      header.append(category, change);
      card.append(header, message);
      elements.comparisonCards.appendChild(card);
    });
  }

  function renderOutliers(outliers = []) {
    if (!elements.outlierList) return;

    elements.outlierList.innerHTML = "";

    if (!outliers.length) {
      elements.outlierList.appendChild(createElement(
        "li",
        "analytics-inline-empty",
        "Nenhum gasto atípico foi detectado com os dados disponíveis."
      ));
      return;
    }

    outliers.forEach((outlier) => {
      const item = createElement("li", "outlier-item");
      const details = createElement("div", "outlier-details");
      const title = createElement(
        "strong",
        "outlier-title",
        outlier.description || "Gasto sem descrição"
      );
      const dateKey = dateUtils.getTransactionDateKey(outlier.date);
      const meta = createElement(
        "span",
        "outlier-meta",
        `${outlier.category} • ${dateUtils.formatDateKeyBR(dateKey) || "Data indisponível"}`
      );
      const amount = createElement(
        "strong",
        "outlier-amount",
        formatters.formatCurrency(outlier.amount)
      );

      details.append(title, meta);
      item.append(details, amount);
      elements.outlierList.appendChild(item);
    });
  }

  function renderProjection(projection = {}) {
    if (!elements.projectionValue) return;

    elements.projectionValue.classList.remove("positive", "negative", "neutral");

    if (projection.value === null || projection.value === undefined) {
      elements.projectionValue.textContent = "Indisponível";
      elements.projectionValue.classList.add("neutral");
    } else {
      const value = Number(projection.value) || 0;
      elements.projectionValue.textContent = formatters.formatCurrency(value);
      elements.projectionValue.classList.add(
        value > 0 ? "positive" : value < 0 ? "negative" : "neutral"
      );
    }

    if (elements.projectionMethod) {
      elements.projectionMethod.textContent =
        "Estimativa por média móvel dos últimos 3 meses completos.";
    }

    if (elements.projectionWarning) {
      elements.projectionWarning.textContent = projection.warning || "";
      elements.projectionWarning.classList.toggle("hidden", !projection.warning);
    }
  }

  function renderAnalytics(data = {}) {
    const monthlyEvolution = Array.isArray(data.monthly_evolution)
      ? data.monthly_evolution
      : [];

    if (!monthlyEvolution.length) {
      analyticsCharts.destroy();
      setAnalyticsView("empty");
      return;
    }

    const categorySpending = Array.isArray(data.category_spending)
      ? data.category_spending
      : [];
    const referenceMonth = data.reference_month || "";

    setAnalyticsView("content");

    if (elements.analyticsReferenceMonth) {
      elements.analyticsReferenceMonth.textContent =
        `Mês de referência: ${formatReferenceMonth(referenceMonth)}`;
    }

    elements.categoryChartWrapper?.classList.toggle(
      "hidden",
      !categorySpending.length
    );
    elements.categoryChartEmpty?.classList.toggle(
      "hidden",
      Boolean(categorySpending.length)
    );

    analyticsCharts.renderCategorySpending(categorySpending);
    analyticsCharts.renderMonthlyEvolution(monthlyEvolution);
    renderComparisons(data.category_comparisons || []);
    renderOutliers(data.outliers || []);
    renderProjection(data.projection || {});

    if (elements.reportMonth && !elements.reportMonth.value) {
      elements.reportMonth.value = referenceMonth;
    }
  }

  async function loadAnalytics() {
    const requestId = ++state.analyticsRequestId;

    if (!state.allTransactions.length) {
      analyticsCharts.destroy();
      setAnalyticsView("empty");
      scheduleTransactionPreviewRender();
      return;
    }

    setAnalyticsView("loading");

    try {
      const data = await api.getAnalyticsSummary();

      if (requestId !== state.analyticsRequestId) return;
      renderAnalytics(data);
    } catch (error) {
      if (requestId !== state.analyticsRequestId) return;

      console.error("Erro ao carregar analise financeira:", error);
      analyticsCharts.destroy();
      setAnalyticsView(
        "error",
        error.message || "Não foi possível carregar a análise financeira."
      );
    } finally {
      if (requestId === state.analyticsRequestId) {
        scheduleTransactionPreviewRender();
      }
    }
  }

  function showReportFeedback(message, type = "info") {
    if (!elements.reportFeedback) return;

    elements.reportFeedback.textContent = message;
    elements.reportFeedback.classList.remove("hidden", "error", "success", "info");
    elements.reportFeedback.classList.add(type);
  }

  function closePdfPreview() {
    elements.pdfPreviewModal?.classList.add("hidden");

    if (elements.pdfPreviewFrame) {
      elements.pdfPreviewFrame.removeAttribute("src");
    }

    if (state.reportPreviewUrl) {
      URL.revokeObjectURL(state.reportPreviewUrl);
    }

    state.reportPreviewUrl = null;
    state.reportPreviewFileName = "";
  }

  function openPdfPreview(reportBlob, month) {
    closePdfPreview();

    state.reportPreviewUrl = URL.createObjectURL(reportBlob);
    state.reportPreviewFileName = `ezsaldo-relatorio-${month}.pdf`;

    if (elements.pdfPreviewFrame) {
      elements.pdfPreviewFrame.src = state.reportPreviewUrl;
    }

    elements.pdfPreviewModal?.classList.remove("hidden");
    elements.closePdfPreviewBtn?.focus();
  }

  function downloadPreviewedPdf() {
    if (!state.reportPreviewUrl || !state.reportPreviewFileName) return;

    const link = document.createElement("a");
    link.href = state.reportPreviewUrl;
    link.download = state.reportPreviewFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    showReportFeedback("Relatório baixado com sucesso.", "success");
  }

  async function previewReport(button) {
    const month = elements.reportMonth?.value;
    const format = button?.dataset.format;

    if (!month || !format) {
      showReportFeedback("Escolha o mês do relatório.", "error");
      return;
    }

    button.disabled = true;
    showReportFeedback("Preparando o relatório...", "info");

    try {
      const reportBlob = await api.downloadMonthlyReport(month, format);
      openPdfPreview(reportBlob, month);
      showReportFeedback("Prévia do relatório pronta.", "success");
    } catch (error) {
      console.error("Erro ao exportar relatorio:", error);
      showReportFeedback(error.message || "Erro ao exportar o relatório.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function createElement(tagName, className, textContent = "") {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }

  function createTransactionItem(transaction) {
    const amountClass = getTransactionAmountClass(transaction.type);
    const typeLabel = transaction.type === "expense" ? "Sa\u00edda" : "Entrada";
    const categoryLabel = transaction.category || "Outros";
    const iconSymbol = transaction.type === "expense" ? "\u2198" : "\u2197";

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
      `${typeLabel} \u2022 ${categoryLabel}`
    );
    const right = createElement("div", "transaction-right");
    const value = createElement(
      "strong",
      `transaction-value ${amountClass}`,
      getTransactionSignedValue(transaction.type, transaction.amount)
    );
    const actions = createElement("div", "transaction-actions");
    const editButton = createElement("button", "edit-btn", "\uD83D\uDD8A");
    const deleteButton = createElement("button", "delete-btn", "\uD83D\uDDD1");

    editButton.type = "button";
    deleteButton.type = "button";

    editButton.addEventListener("click", () => {
      editTransaction(transaction);
    });

    deleteButton.addEventListener("click", () => {
      openDeleteModal(transaction._id);
    });

    content.append(title, subtitle);
    left.append(icon, content);
    actions.append(editButton, deleteButton);
    right.append(value, actions);
    item.append(left, right);

    return item;
  }

  function renderTransactions(transactions = []) {
    if (!elements.list) return;

    elements.list.innerHTML = "";

    if (transactions.length === 0) {
      const emptyItem = createElement(
        "li",
        "empty-state",
        "Nenhuma transa\u00e7\u00e3o ainda"
      );

      elements.list.appendChild(emptyItem);
      updateToggleTransactionsButton(0);
      return;
    }

    updateToggleTransactionsButton(transactions.length);

    const isDesktop = window.matchMedia("(min-width: 1101px)").matches;

    if (!isDesktop) {
      transactions.slice(0, 3).forEach((transaction) => {
        elements.list.appendChild(createTransactionItem(transaction));
      });
      return;
    }

    const transactionsCard = elements.list.closest(".transactions-card");
    const cardStyles = transactionsCard
      ? window.getComputedStyle(transactionsCard)
      : null;
    const cardBottom = transactionsCard && cardStyles
      ? transactionsCard.getBoundingClientRect().bottom -
        (parseFloat(cardStyles.paddingBottom) || 0)
      : Number.POSITIVE_INFINITY;

    for (const transaction of transactions) {
      const item = createTransactionItem(transaction);
      elements.list.appendChild(item);

      const contentBottom = elements.toggleTransactionsBtn?.classList.contains("hidden")
        ? elements.list.getBoundingClientRect().bottom
        : elements.toggleTransactionsBtn.getBoundingClientRect().bottom;

      if (contentBottom > cardBottom + 0.5 && elements.list.children.length > 1) {
        item.remove();
        break;
      }
    }
  }

  function scheduleTransactionPreviewRender() {
    if (state.transactionPreviewFrameId) {
      window.cancelAnimationFrame(state.transactionPreviewFrameId);
    }

    state.transactionPreviewFrameId = window.requestAnimationFrame(() => {
      state.transactionPreviewFrameId = window.requestAnimationFrame(() => {
        state.transactionPreviewFrameId = null;
        renderTransactions(state.allTransactions);
      });
    });
  }

  function setupTransactionPreviewResizeObserver() {
    if (!window.ResizeObserver || !elements.list) return;

    const transactionsCard = elements.list.closest(".transactions-card");
    if (!transactionsCard) return;

    state.transactionPreviewResizeObserver = new ResizeObserver((entries) => {
      const cardEntry = entries[0];
      const nextHeight = Math.round(cardEntry?.contentRect.height || 0);

      if (!nextHeight || nextHeight === state.transactionPreviewCardHeight) {
        return;
      }

      state.transactionPreviewCardHeight = nextHeight;
      scheduleTransactionPreviewRender();
    });
    state.transactionPreviewResizeObserver.observe(transactionsCard);
  }

  function renderDashboardData() {
    renderTransactions(state.allTransactions);

    const series = chartData.buildChartSeries(
      state.allTransactions,
      state.chartRange,
      {
        accountCreatedAt: state.accountCreatedAt
      }
    );

    balanceChart.render(series);
    updateChartPeriod(series.period);
    updatePeriodResult(getDisplayedPeriodResult(series.periodResult));
    updateSubtractFirstIncomeControl();
    updateChartFilterButtons();
  }

  async function loadCurrentUserProfile() {
    try {
      const profile = await api.getCurrentUserProfile();

      if (profile) {
        state.accountCreatedAt = profile.createdAt || null;
        persistCurrentUser(profile.name || "", profile.profileImage || "");

        if (state.chartRange === "account") {
          renderDashboardData();
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil do usuario:", error);
    }
  }

  async function loadTransactions() {
    showLoader();

    try {
      const data = await api.getTransactions();

      state.allTransactions = data.transactions;

      if (elements.balanceDisplay) {
        elements.balanceDisplay.innerText = formatters.formatCurrency(data.balance);
      }

      setBalanceStyle(data.balance);
      renderDashboardData();
      loadAnalytics();
    } catch (error) {
      console.error("Erro ao carregar transacoes:", error);
      showToast(error.message || "Erro ao carregar transa\u00e7\u00f5es");
    } finally {
      hideLoader();
    }
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    clearFormFeedback();

    const description = elements.descriptionInput?.value.trim() || "";
    const category = elements.categoryInput?.value || "Outros";
    const amountValue = parseFloat(elements.amountInput?.value);
    const selectedDate = getSelectedTransactionDateKey();

    if (!Number.isFinite(amountValue) || amountValue === 0) {
      showFormFeedback("O valor da transa\u00e7\u00e3o deve ser diferente de 0.");
      return;
    }

    if (selectedDate && selectedDate < MIN_TRANSACTION_DATE) {
      showFormFeedback(
        "A data da transa\u00e7\u00e3o n\u00e3o pode ser anterior a 01/01/2026."
      );
      setTransactionDateValue(dateUtils.getDefaultTransactionDateKey());
      return;
    }

    const editingId = state.editingId;
    const wasEditing = Boolean(editingId);
    const transaction = {
      type: amountValue < 0 ? "expense" : "income",
      amount: Math.abs(amountValue),
      description,
      category,
      date: selectedDate || null
    };

    showLoader();
    setSubmitButtonState({
      text: wasEditing ? "Salvando..." : "Adicionando...",
      disabled: true
    });

    try {
      await api.saveTransaction(transaction, editingId);
      resetFormState();
      showToast(
        wasEditing
          ? "Transa\u00e7\u00e3o atualizada com sucesso."
          : "Transa\u00e7\u00e3o adicionada com sucesso.",
        "success"
      );
      await loadTransactions();
    } catch (error) {
      console.error("Erro ao salvar transacao:", error);
      showFormFeedback(error.message || "Erro na opera\u00e7\u00e3o");
    } finally {
      hideLoader();
      setSubmitButtonState({
        text: state.editingId ? "Atualizar" : "Adicionar",
        disabled: false
      });
    }
  }

  function editTransaction(transaction) {
    state.editingId = transaction._id;
    clearFormFeedback();

    if (elements.descriptionInput) {
      elements.descriptionInput.value = transaction.description || "";
    }

    if (elements.categoryInput) {
      elements.categoryInput.value = transaction.category || "Outros";

      if (!elements.categoryInput.value) {
        elements.categoryInput.value = "Outros";
      }
    }

    if (elements.amountInput) {
      elements.amountInput.value =
        transaction.type === "expense"
          ? -Number(transaction.amount)
          : Number(transaction.amount);
    }

    if (elements.dateInput && transaction.date) {
      const dateKey = dateUtils.getTransactionDateKey(transaction.date);

      if (dateKey) {
        setTransactionDateValue(dateKey);
      }
    }

    if (elements.charCount && elements.descriptionInput) {
      elements.charCount.textContent =
        `${elements.descriptionInput.value.length}/${MAX_DESCRIPTION_LENGTH}`;
    }

    setSubmitButtonState({
      text: "Atualizar",
      disabled: false
    });
  }

  function openDeleteModal(id) {
    state.transactionToDelete = id;
    elements.deleteModal?.classList.remove("hidden");
  }

  function closeDeleteModal() {
    state.transactionToDelete = null;
    elements.deleteModal?.classList.add("hidden");
  }

  async function confirmDeleteTransaction() {
    if (!state.transactionToDelete) return;

    showLoader();

    try {
      await api.deleteTransaction(state.transactionToDelete);
      showToast("Transa\u00e7\u00e3o removida com sucesso.", "success");
      await loadTransactions();
    } catch (error) {
      console.error("Erro ao deletar transacao:", error);
      showToast(error.message || "Erro ao deletar");
    } finally {
      hideLoader();
      closeDeleteModal();
    }
  }

  function setupCharCount() {
    if (!elements.descriptionInput || !elements.charCount) return;

    elements.descriptionInput.addEventListener("input", () => {
      if (elements.descriptionInput.value.length > MAX_DESCRIPTION_LENGTH) {
        elements.descriptionInput.value = elements.descriptionInput.value.slice(
          0,
          MAX_DESCRIPTION_LENGTH
        );
      }

      elements.charCount.textContent =
        `${elements.descriptionInput.value.length}/${MAX_DESCRIPTION_LENGTH}`;
    });
  }

  function openLogoutModal() {
    elements.logoutModal?.classList.remove("hidden");
  }

  function closeLogoutModal() {
    elements.logoutModal?.classList.add("hidden");
  }

  function confirmLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem(USER_PROFILE_IMAGE_STORAGE_KEY);
    window.location.href = "login.html";
  }

  function setupEvents() {
    elements.form?.addEventListener("submit", handleTransactionSubmit);
    elements.logoutBtn?.addEventListener("click", openLogoutModal);
    elements.cancelLogoutBtn?.addEventListener("click", closeLogoutModal);
    elements.confirmLogoutBtn?.addEventListener("click", confirmLogout);
    elements.cancelDeleteBtn?.addEventListener("click", closeDeleteModal);
    elements.confirmDeleteBtn?.addEventListener("click", confirmDeleteTransaction);
    elements.amountInput?.addEventListener("input", clearFormFeedback);
    elements.descriptionInput?.addEventListener("input", clearFormFeedback);
    elements.categoryInput?.addEventListener("change", clearFormFeedback);
    elements.dateInput?.addEventListener("input", clearFormFeedback);
    elements.retryAnalyticsBtn?.addEventListener("click", loadAnalytics);

    elements.reportDownloadButtons?.forEach((button) => {
      button.addEventListener("click", () => previewReport(button));
    });

    elements.closePdfPreviewBtn?.addEventListener("click", closePdfPreview);
    elements.cancelPdfPreviewBtn?.addEventListener("click", closePdfPreview);
    elements.downloadPreviewedPdfBtn?.addEventListener("click", downloadPreviewedPdf);

    elements.pdfPreviewModal?.addEventListener("click", (event) => {
      if (event.target === elements.pdfPreviewModal) {
        closePdfPreview();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.pdfPreviewModal?.classList.contains("hidden")) {
        closePdfPreview();
      }
    });

    elements.editProfileBtn?.addEventListener("click", () => {
      window.location.href = "editUser.html";
    });

    elements.dateStepUpBtn?.addEventListener("click", () => {
      adjustTransactionDate(1);
    });

    elements.dateStepDownBtn?.addEventListener("click", () => {
      adjustTransactionDate(-1);
    });

    elements.amountStepUpBtn?.addEventListener("click", () => {
      clearFormFeedback();
      adjustAmountValue(1);
    });

    elements.amountStepDownBtn?.addEventListener("click", () => {
      clearFormFeedback();
      adjustAmountValue(-1);
    });

    elements.toggleTransactionsBtn?.addEventListener("click", () => {
      window.location.href = "transactions.html";
    });

    window.addEventListener("resize", scheduleTransactionPreviewRender);

    elements.chartFilterButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        state.chartRange = button.dataset.range;
        renderDashboardData();
      });
    });

    elements.subtractFirstIncomeCheckbox?.addEventListener("change", (event) => {
      state.subtractFirstIncome = event.currentTarget.checked;
      renderDashboardData();
    });

    setupCharCount();
  }

  function setupInitialDateLimits() {
    if (!elements.dateInput) return;

    elements.dateInput.min = MIN_TRANSACTION_DATE;
    elements.dateInput.max = dateUtils.getTodayDateKey();
    setTransactionDateValue(dateUtils.getDefaultTransactionDateKey());

    if (elements.reportMonth) {
      elements.reportMonth.min = MIN_TRANSACTION_DATE.slice(0, 7);
      elements.reportMonth.max = dateUtils.getTodayDateKey().slice(0, 7);
    }
  }

  function init() {
    setupAvatarFallback();
    loadCachedUserProfile();
    setupInitialDateLimits();
    setupEvents();
    setupTransactionPreviewResizeObserver();
    loadCurrentUserProfile();
    loadTransactions();
  }

  init();
})(window, document);
