(function (window) {
  const dateUtils = window.EZSaldoDateUtils;

  function getChartTransactions(transactions = []) {
    return [...transactions]
      .map((transaction, index) => {
        const parsedTimestamp = new Date(transaction.date || 0).getTime();
        const amount = Number(transaction.amount) || 0;

        return {
          ...transaction,
          amount,
          signedAmount: transaction.type === "expense" ? -amount : amount,
          dateKey: dateUtils.getTransactionDateKey(transaction.date),
          timestamp: Number.isNaN(parsedTimestamp)
            ? Number.MAX_SAFE_INTEGER
            : parsedTimestamp,
          originalIndex: index
        };
      })
      .filter((transaction) => transaction.dateKey)
      .sort((a, b) =>
        a.timestamp - b.timestamp || a.originalIndex - b.originalIndex
      );
  }

  function buildDailyBalancePoints(transactions = []) {
    const dailyPoints = new Map();

    transactions.forEach((transaction) => {
      const existingPoint = dailyPoints.get(transaction.dateKey) || {
        dateKey: transaction.dateKey,
        netChange: 0,
        transactionCount: 0
      };

      existingPoint.netChange += transaction.signedAmount;
      existingPoint.transactionCount += 1;

      dailyPoints.set(transaction.dateKey, existingPoint);
    });

    return [...dailyPoints.values()].sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );
  }

  function createPeriodResult(startKey, endKey, changeAmount = 0) {
    const safeChangeAmount = Number(changeAmount) || 0;
    const tone = safeChangeAmount > 0
      ? "positive"
      : safeChangeAmount < 0
        ? "negative"
        : "neutral";

    return {
      startKey,
      endKey,
      changeAmount: safeChangeAmount,
      tone
    };
  }

  function buildCompleteSeries(normalizedTransactions = []) {
    const dailyPoints = buildDailyBalancePoints(normalizedTransactions);
    let runningBalance = 0;
    let periodChange = 0;

    const points = dailyPoints.map((point) => {
      runningBalance += point.netChange;
      periodChange += point.netChange;

      return {
        ...point,
        balance: runningBalance,
        label: dateUtils.formatDateKeyBR(point.dateKey),
        marker: "activity"
      };
    });

    return {
      labels: points.map((point) => point.label),
      data: points.map((point) => point.balance),
      points,
      period: {
        startKey: points[0].dateKey,
        endKey: points[points.length - 1].dateKey
      },
      periodResult: createPeriodResult(
        points[0].dateKey,
        points[points.length - 1].dateKey,
        periodChange
      )
    };
  }

  function buildBoundedChartSeries(
    normalizedTransactions = [],
    startKey,
    endKey,
    options = {}
  ) {
    const {
      startLabelPrefix = "In\u00edcio",
      endLabelPrefix = "Hoje",
      activityLabelFormatter = (dateKey) => dateUtils.formatDateKeyBR(dateKey)
    } = options;

    const openingBalance = normalizedTransactions.reduce((total, transaction) => (
      transaction.dateKey < startKey
        ? total + transaction.signedAmount
        : total
    ), 0);

    const transactionsInRange = normalizedTransactions.filter((transaction) => (
      transaction.dateKey >= startKey && transaction.dateKey <= endKey
    ));

    const dailyPoints = buildDailyBalancePoints(transactionsInRange);
    const points = [];
    let runningBalance = openingBalance;
    let periodChange = 0;

    points.push({
      dateKey: startKey,
      netChange: 0,
      transactionCount: 0,
      balance: openingBalance,
      label: `${startLabelPrefix} \u2022 ${dateUtils.formatDateKeyBR(startKey)}`,
      marker: "start"
    });

    dailyPoints.forEach((point) => {
      runningBalance += point.netChange;
      periodChange += point.netChange;

      points.push({
        ...point,
        balance: runningBalance,
        label: activityLabelFormatter(point.dateKey, endKey),
        marker: "activity"
      });
    });

    const lastPoint = points[points.length - 1];
    const finalBalance = lastPoint ? lastPoint.balance : openingBalance;
    const shouldForceEndPoint = startKey === endKey && dailyPoints.length === 0;

    if (shouldForceEndPoint || !lastPoint || lastPoint.dateKey !== endKey) {
      points.push({
        dateKey: endKey,
        netChange: 0,
        transactionCount: 0,
        balance: finalBalance,
        label: `${endLabelPrefix} \u2022 ${dateUtils.formatDateKeyBR(endKey)}`,
        marker: "end"
      });
    }

    return {
      labels: points.map((point) => point.label),
      data: points.map((point) => point.balance),
      points,
      period: {
        startKey,
        endKey
      },
      periodResult: createPeriodResult(startKey, endKey, periodChange)
    };
  }

  function buildChartSeries(transactions = [], range = "7", options = {}) {
    const normalizedTransactions = getChartTransactions(transactions);
    const todayKey = dateUtils.getTodayDateKey();

    if (!normalizedTransactions.length) {
      const startKey = getEmptyPeriodStartKey(range, options, todayKey);

      return {
        labels: [],
        data: [],
        points: [],
        period: {
          startKey,
          endKey: todayKey
        },
        periodResult: createPeriodResult(startKey, todayKey, 0)
      };
    }

    if (range === "all") {
      return buildCompleteSeries(normalizedTransactions);
    }

    if (range === "today") {
      return buildBoundedChartSeries(
        normalizedTransactions,
        todayKey,
        todayKey,
        {
          startLabelPrefix: "00:00",
          endLabelPrefix: "Hoje",
          activityLabelFormatter: (dateKey) =>
            `Hoje \u2022 ${dateUtils.formatDateKeyBR(dateKey)}`
        }
      );
    }

    if (range === "account") {
      const startKey = normalizedTransactions[0].dateKey;

      return buildBoundedChartSeries(
        normalizedTransactions,
        startKey,
        todayKey,
        {
          startLabelPrefix: "Primeira transa\u00e7\u00e3o",
          endLabelPrefix: "Hoje"
        }
      );
    }

    const days = Number(range);

    if (!Number.isFinite(days) || days <= 0) {
      return buildChartSeries(transactions, "all", options);
    }

    const startKey = dateUtils.getClampedChartDateKey(
      dateUtils.shiftDateKey(todayKey, -(days - 1)),
      todayKey
    );

    return buildBoundedChartSeries(
      normalizedTransactions,
      startKey,
      todayKey
    );
  }

  function getEmptyPeriodStartKey(range = "7", options = {}, todayKey) {
    if (range === "today") {
      return todayKey;
    }

    if (range === "account") {
      return todayKey;
    }

    const days = Number(range);

    if (!Number.isFinite(days) || days <= 0) {
      return todayKey;
    }

    return dateUtils.getClampedChartDateKey(
      dateUtils.shiftDateKey(todayKey, -(days - 1)),
      todayKey
    );
  }

  window.EZSaldoChartData = {
    buildChartSeries
  };
})(window);
