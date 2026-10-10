const TRANSACTION_CATEGORIES = Object.freeze([
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Compras",
  "Receita",
  "Outros"
]);

const DEFAULT_TRANSACTION_CATEGORY = "Outros";

module.exports = {
  DEFAULT_TRANSACTION_CATEGORY,
  TRANSACTION_CATEGORIES
};
