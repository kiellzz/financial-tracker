require("dotenv").config();

const mongoose = require("mongoose");

const { DEMO_ACCOUNT } = require("../src/constants/demoAccount");
const { ensureDemoAccount } = require("../src/services/demoAccountService");

async function seed() {
  if (process.env.ALLOW_SYNTHETIC_SEED !== "true") {
    throw new Error(
      "Seed bloqueado. Defina ALLOW_SYNTHETIC_SEED=true para inserir os dados sintéticos."
    );
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI não configurada.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const result = await ensureDemoAccount({
    resetTransactions: true,
    force: true
  });

  console.log(
    `${result.transactionsInserted} transações sintéticas inseridas para ${DEMO_ACCOUNT.email}.`
  );
}

seed()
  .catch((error) => {
    console.error("Erro ao executar o seed sintético:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
