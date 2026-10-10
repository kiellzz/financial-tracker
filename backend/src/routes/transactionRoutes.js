const express = require("express");
const router = express.Router();

const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/authMiddleware");
const demoAccountReadOnlyMiddleware = require("../middleware/demoAccountReadOnlyMiddleware");
const {
  DEFAULT_TRANSACTION_CATEGORY,
  TRANSACTION_CATEGORIES
} = require("../constants/transactionCategories");
const MIN_TRANSACTION_DATE = new Date("2026-01-01T00:00:00.000Z");

function normalizeTransactionDate(rawDate) {
  if (!rawDate) {
    return new Date();
  }

  if (typeof rawDate === "string") {
    const trimmedDate = rawDate.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return new Date(`${trimmedDate}T12:00:00.000Z`);
    }

    const parsedDate = new Date(trimmedDate);

    if (!Number.isNaN(parsedDate.getTime())) {
      const isMidnightUtc =
        parsedDate.getUTCHours() === 0 &&
        parsedDate.getUTCMinutes() === 0 &&
        parsedDate.getUTCSeconds() === 0 &&
        parsedDate.getUTCMilliseconds() === 0;

      if (isMidnightUtc) {
        const dateKey = trimmedDate.slice(0, 10);

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          return new Date(`${dateKey}T12:00:00.000Z`);
        }
      }

      return parsedDate;
    }
  }

  return new Date();
}

function isAllowedTransactionDate(date) {
  return date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date >= MIN_TRANSACTION_DATE;
}

function isAllowedTransactionAmount(amount) {
  return Number.isFinite(amount) && amount > 0;
}

function normalizeTransactionCategory(rawCategory) {
  if (rawCategory === undefined || rawCategory === null || rawCategory === "") {
    return DEFAULT_TRANSACTION_CATEGORY;
  }

  if (typeof rawCategory !== "string") {
    return null;
  }

  const trimmedCategory = rawCategory.trim();

  return TRANSACTION_CATEGORIES.find((category) => (
    category.localeCompare(trimmedCategory, "pt-BR", { sensitivity: "base" }) === 0
  )) || null;
}

router.post("/", authMiddleware, demoAccountReadOnlyMiddleware, async (req, res) => {
  try {
    const { type, amount, description, category, date } = req.body;
    const normalizedDate = normalizeTransactionDate(date);
    const normalizedAmount = Number(amount);
    const normalizedCategory = normalizeTransactionCategory(category);

    if (!isAllowedTransactionDate(normalizedDate)) {
      return res.status(400).json({
        message: "A data da transação não pode ser anterior a 01/01/2026"
      });
    }

    if (!isAllowedTransactionAmount(normalizedAmount)) {
      return res.status(400).json({
        message: "O valor da transação deve ser maior que 0"
      });
    }

    if (!normalizedCategory) {
      return res.status(400).json({
        message: "Categoria de transação inválida"
      });
    }

    const transaction = new Transaction({
      userId: req.userId,
      type,
      amount: normalizedAmount,
      description,
      category: normalizedCategory,
      date: normalizedDate
    });

    await transaction.save();

    res.status(201).json({
      message: "Transação adicionada",
      transaction
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erro ao criar transação"
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.userId
    }).sort({ date: -1 });

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    const balance = income - expense;

    res.json({
      balance,
      income,
      expense,
      transactions
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao buscar transações"
    });
  }
});

router.delete("/:id", authMiddleware, demoAccountReadOnlyMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transação não encontrada"
      });
    }

    res.json({
      message: "Transação removida com sucesso"
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao deletar transação"
    });
  }
});

router.put("/:id", authMiddleware, demoAccountReadOnlyMiddleware, async (req, res) => {
  try {
    const { type, amount, description, category, date } = req.body;
    const normalizedDate = normalizeTransactionDate(date);
    const normalizedAmount = Number(amount);
    const normalizedCategory = normalizeTransactionCategory(category);

    if (!isAllowedTransactionDate(normalizedDate)) {
      return res.status(400).json({
        message: "A data da transação não pode ser anterior a 01/01/2026"
      });
    }

    if (!isAllowedTransactionAmount(normalizedAmount)) {
      return res.status(400).json({
        message: "O valor da transação deve ser maior que 0"
      });
    }

    if (!normalizedCategory) {
      return res.status(400).json({
        message: "Categoria de transação inválida"
      });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId
      },
      {
        type,
        amount: normalizedAmount,
        description,
        category: normalizedCategory,
        date: normalizedDate
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transação não encontrada"
      });
    }

    res.json({
      message: "Transação atualizada",
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao atualizar transação"
    });
  }
});

module.exports = router;
