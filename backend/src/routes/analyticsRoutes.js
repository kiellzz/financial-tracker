const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const Transaction = require("../models/Transaction");
const {
  AnalyticsServiceError,
  getAnalyticsSummary,
  getMonthlyReport
} = require("../services/analyticsClient");

const router = express.Router();
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const REPORT_FORMATS = new Set(["pdf"]);

function getReferenceDate() {
  const timeZone = process.env.APP_TIME_ZONE || "America/Sao_Paulo";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  } catch (error) {
    return new Date().toISOString().slice(0, 10);
  }
}

function getCurrentMonth() {
  return getReferenceDate().slice(0, 7);
}

function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

function serializeTransaction(transaction) {
  return {
    id: String(transaction._id),
    type: transaction.type,
    amount: Number(transaction.amount),
    category: transaction.category || "Outros",
    description: String(transaction.description || "").slice(0, 120),
    date: transaction.date
  };
}

function handleAnalyticsError(error, res) {
  if (error instanceof AnalyticsServiceError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error("Erro inesperado na integração de análise:", error);
  return res.status(500).json({
    message: "Erro ao preparar a análise financeira."
  });
}

router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId })
      .select("_id type amount category description date")
      .sort({ date: 1 })
      .lean();

    const summary = await getAnalyticsSummary({
      transactions: transactions.map(serializeTransaction),
      reference_date: getReferenceDate()
    });

    return res.json(summary);
  } catch (error) {
    return handleAnalyticsError(error, res);
  }
});

router.get("/report", authMiddleware, async (req, res) => {
  const month = typeof req.query.month === "string"
    ? req.query.month
    : getCurrentMonth();
  const format = typeof req.query.format === "string"
    ? req.query.format.toLowerCase()
    : "pdf";

  if (!MONTH_PATTERN.test(month)) {
    return res.status(400).json({
      message: "Mês inválido. Use o formato AAAA-MM."
    });
  }

  if (!REPORT_FORMATS.has(format)) {
    return res.status(400).json({
      message: "Formato inválido. Apenas PDF é aceito."
    });
  }

  try {
    const { start, end } = getMonthRange(month);
    const transactions = await Transaction.find({
      userId: req.userId,
      date: { $gte: start, $lt: end }
    })
      .select("_id type amount category description date")
      .sort({ date: 1 })
      .lean();

    const report = await getMonthlyReport({
      transactions: transactions.map(serializeTransaction),
      reference_date: getReferenceDate(),
      month
    }, format);

    res.set({
      "Content-Disposition": `attachment; filename="ezsaldo-relatorio-${month}.${format}"`,
      "Content-Type": "application/pdf"
    });

    return res.send(report);
  } catch (error) {
    return handleAnalyticsError(error, res);
  }
});

module.exports = router;
