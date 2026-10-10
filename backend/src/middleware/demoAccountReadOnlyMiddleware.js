const User = require("../models/User");

module.exports = async function demoAccountReadOnlyMiddleware(req, res, next) {
  try {
    const isDemoAccount = await User.exists({
      _id: req.userId,
      isDemo: true
    });

    if (isDemoAccount) {
      return res.status(403).json({
        message: "A conta de demonstração é somente para leitura"
      });
    }

    return next();
  } catch (error) {
    console.error("Erro ao validar a conta de demonstração:", error);

    return res.status(500).json({
      message: "Erro ao validar permissões da conta"
    });
  }
};
