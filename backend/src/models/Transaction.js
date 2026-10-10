const mongoose = require("mongoose");
const {
  DEFAULT_TRANSACTION_CATEGORY,
  TRANSACTION_CATEGORIES
} = require("../constants/transactionCategories");

const transactionSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  type: {
    type: String,
    enum: ["income", "expense"],
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  description: {
    type: String,
    default: ""
  },

  category: {
    type: String,
    enum: TRANSACTION_CATEGORIES,
    default: DEFAULT_TRANSACTION_CATEGORY
  },

  date: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Transaction", transactionSchema);
