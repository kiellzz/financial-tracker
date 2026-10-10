require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const {
  ensureDemoAccount,
  startDemoAccountResetSchedule
} = require("./services/demoAccountService");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB conectado 🚀");

    try {
      const demoResult = await ensureDemoAccount({ resetTransactions: true });

      if (demoResult.enabled) {
        console.log(
          `Conta de demonstração pronta (${demoResult.transactionsInserted} transações inseridas).`
        );
      }
    } catch (error) {
      // Uma falha na preparação da conta pública não deve derrubar as contas reais.
      console.error("Não foi possível preparar a conta de demonstração:", error);
    }

    startDemoAccountResetSchedule();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
  });
