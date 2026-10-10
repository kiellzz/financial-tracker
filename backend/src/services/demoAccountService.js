const bcrypt = require("bcryptjs");

const { DEMO_ACCOUNT } = require("../constants/demoAccount");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const DEFAULT_RESET_INTERVAL_MINUTES = 30;

function transaction(type, amount, description, category, date) {
  return {
    type,
    amount,
    description,
    category,
    date: new Date(`${date}T12:00:00.000Z`)
  };
}

function buildSyntheticTransactions() {
  const months = [
    { key: "2026-01", salary: 5100, food: 590, transport: 260, leisure: 180 },
    { key: "2026-02", salary: 5100, food: 625, transport: 245, leisure: 220 },
    { key: "2026-03", salary: 5200, food: 610, transport: 275, leisure: 195 },
    { key: "2026-04", salary: 5200, food: 660, transport: 290, leisure: 250 },
    { key: "2026-05", salary: 5200, food: 640, transport: 280, leisure: 210 },
    { key: "2026-06", salary: 5300, food: 1850, transport: 310, leisure: 205 },
    { key: "2026-07", salary: 5300, food: 675, transport: 295, leisure: 280 },
    { key: "2026-08", salary: 5300, food: 690, transport: 305, leisure: 230 },
    { key: "2026-09", salary: 5400, food: 705, transport: 300, leisure: 260 }
  ];
  const transactions = [];

  months.forEach((month, index) => {
    transactions.push(
      transaction("income", month.salary, "Salário", "Receita", `${month.key}-05`),
      transaction("expense", 1650, "Aluguel", "Moradia", `${month.key}-07`),
      transaction("expense", month.food, "Mercado e refeições", "Alimentação", `${month.key}-12`),
      transaction("expense", month.transport, "Transporte do mês", "Transporte", `${month.key}-16`),
      transaction("expense", 99.9, "Streaming e música", "Assinaturas", `${month.key}-20`),
      transaction("expense", month.leisure, "Lazer", "Lazer", `${month.key}-24`)
    );

    if (index % 3 === 1) {
      transactions.push(
        transaction("income", 650, "Projeto freelance", "Receita", `${month.key}-18`)
      );
    }
  });

  // Outubro é parcial para demonstrar o mês de referência sem datas futuras.
  transactions.push(
    transaction("income", 5400, "Salário", "Receita", "2026-10-05"),
    transaction("expense", 1650, "Aluguel", "Moradia", "2026-10-06"),
    transaction("expense", 800, "Mercado e refeições", "Alimentação", "2026-10-07"),
    transaction("expense", 95, "Transporte parcial", "Transporte", "2026-10-08"),
    transaction("expense", 99.9, "Streaming e música", "Assinaturas", "2026-10-09")
  );

  // Valores altos propositais permitem demonstrar a detecção de outliers.
  transactions.push(
    transaction("expense", 3500, "Notebook para estudos", "Compras", "2026-04-22"),
    transaction("expense", 190, "Itens para casa", "Compras", "2026-01-27"),
    transaction("expense", 240, "Calçado", "Compras", "2026-02-26"),
    transaction("expense", 210, "Utensílios", "Compras", "2026-03-25"),
    transaction("expense", 1800, "Atendimento emergencial", "Saúde", "2026-08-14"),
    transaction("expense", 120, "Farmácia", "Saúde", "2026-01-14"),
    transaction("expense", 95, "Farmácia", "Saúde", "2026-03-14"),
    transaction("expense", 110, "Consulta de rotina", "Saúde", "2026-05-14")
  );

  return transactions;
}

function isDemoAccountEnabled() {
  return process.env.DEMO_ACCOUNT_ENABLED !== "false";
}

function getDemoResetIntervalMinutes() {
  const configuredInterval = Number(
    process.env.DEMO_ACCOUNT_RESET_INTERVAL_MINUTES
  );

  return Number.isFinite(configuredInterval) && configuredInterval > 0
    ? configuredInterval
    : DEFAULT_RESET_INTERVAL_MINUTES;
}

async function ensureDemoAccount({ resetTransactions = false, force = false } = {}) {
  if (!force && !isDemoAccountEnabled()) {
    return { enabled: false, created: false, transactionsInserted: 0 };
  }

  let user = await User.findOne({ email: DEMO_ACCOUNT.email });
  let created = false;

  if (!user) {
    user = await User.create({
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      password: await bcrypt.hash(DEMO_ACCOUNT.password, 10),
      profileImage: "",
      isDemo: true
    });
    created = true;
  } else {
    const passwordMatches = await bcrypt.compare(
      DEMO_ACCOUNT.password,
      user.password
    );

    user.name = DEMO_ACCOUNT.name;
    user.isDemo = true;

    if (!passwordMatches) {
      user.password = await bcrypt.hash(DEMO_ACCOUNT.password, 10);
    }

    if (user.isModified()) {
      await user.save();
    }
  }

  const existingTransactions = await Transaction.countDocuments({
    userId: user._id
  });

  if (resetTransactions) {
    await Transaction.deleteMany({ userId: user._id });
  }

  if (!resetTransactions && existingTransactions > 0) {
    return { enabled: true, created, transactionsInserted: 0 };
  }

  const syntheticTransactions = buildSyntheticTransactions().map((item) => ({
    ...item,
    userId: user._id
  }));

  await Transaction.insertMany(syntheticTransactions);

  return {
    enabled: true,
    created,
    transactionsInserted: syntheticTransactions.length
  };
}

function startDemoAccountResetSchedule() {
  if (!isDemoAccountEnabled()) {
    return null;
  }

  const intervalMinutes = getDemoResetIntervalMinutes();
  const intervalMilliseconds = intervalMinutes * 60 * 1000;
  let resetInProgress = false;

  const timer = setInterval(async () => {
    if (resetInProgress) return;

    resetInProgress = true;

    try {
      const result = await ensureDemoAccount({ resetTransactions: true });
      console.log(
        `Conta de demonstração restaurada (${result.transactionsInserted} transações do seed).`
      );
    } catch (error) {
      // O reset da demonstração nunca deve interromper as contas reais.
      console.error("Erro ao restaurar a conta de demonstração:", error);
    } finally {
      resetInProgress = false;
    }
  }, intervalMilliseconds);

  timer.unref?.();

  console.log(
    `Reset da conta de demonstração agendado a cada ${intervalMinutes} minutos.`
  );

  return timer;
}

module.exports = {
  buildSyntheticTransactions,
  ensureDemoAccount,
  isDemoAccountEnabled,
  startDemoAccountResetSchedule
};
