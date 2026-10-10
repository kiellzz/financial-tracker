const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const PROFILE_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;
const MAX_PROFILE_IMAGE_LENGTH = 2 * 1024 * 1024;
const NAME_LOCALE = "pt-BR";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function normalizeName(name) {
  if (typeof name !== "string") {
    return "";
  }

  const trimmedName = name.trim().replace(/\s+/g, " ");

  if (!trimmedName) {
    return "";
  }

  return trimmedName
    .toLocaleLowerCase(NAME_LOCALE)
    .replace(/(^|\s)\S/g, (match) => match.toLocaleUpperCase(NAME_LOCALE));
}

function getNameValidationMessage(name) {
  const words = normalizeName(name)
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) {
    return "Informe um nome valido";
  }

  if (words.length === 1) {
    return "Digite um sobrenome";
  }

  const uniqueWords = new Set(
    words.map((word) => word.toLocaleLowerCase(NAME_LOCALE))
  );

  if (uniqueWords.size < 2) {
    return "Informe nome e sobrenome diferentes";
  }

  return "";
}

function normalizeEmail(email) {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
}

function getEmailValidationMessage(email, currentEmail = "") {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCurrentEmail = normalizeEmail(currentEmail);

  if (!normalizedEmail) {
    return "Digite um email";
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Digite um email valido";
  }

  if (normalizedCurrentEmail && normalizedEmail === normalizedCurrentEmail) {
    return "Digite um email diferente do atual";
  }

  return "";
}

function getPasswordValidationMessage(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  return "";
}

function normalizeProfileImage(profileImage) {
  if (typeof profileImage !== "string") {
    return "";
  }

  const trimmedProfileImage = profileImage.trim();

  if (!trimmedProfileImage) {
    return "";
  }

  if (trimmedProfileImage.length > MAX_PROFILE_IMAGE_LENGTH) {
    return "";
  }

  return PROFILE_IMAGE_PATTERN.test(trimmedProfileImage)
    ? trimmedProfileImage
    : "";
}

function rejectDemoAccountMutation(user, res) {
  if (!user?.isDemo) {
    return false;
  }

  res.status(403).json({
    message: "A conta de demonstração é somente para leitura"
  });
  return true;
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, profileImage } = req.body;
    const normalizedName = normalizeName(name);
    const nameValidationMessage = getNameValidationMessage(normalizedName);
    const passwordValidationMessage = getPasswordValidationMessage(password);

    if (nameValidationMessage) {
      return res.status(400).json({
        message: nameValidationMessage
      });
    }

    if (passwordValidationMessage) {
      return res.status(400).json({
        message: passwordValidationMessage
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: normalizedName,
      email,
      password: hashedPassword,
      profileImage: normalizeProfileImage(profileImage)
    });

    await user.save();

    return res.status(201).json({
      message: "Usuario criado com sucesso"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email ou senha inválidos"
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Email ou senha inválidos"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login realizado",
      token,
      name: normalizeName(user.name),
      profileImage: user.profileImage || "",
      isDemo: Boolean(user.isDemo)
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "name email profileImage createdAt isDemo"
    );

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado"
      });
    }

    return res.json({
      name: normalizeName(user.name),
      email: user.email || "",
      createdAt: user.createdAt || null,
      profileImage: user.profileImage || "",
      isDemo: Boolean(user.isDemo)
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const normalizedName = normalizeName(req.body?.name);
    const normalizedProfileImage = normalizeProfileImage(req.body?.profileImage);
    const nameValidationMessage = getNameValidationMessage(normalizedName);

    if (nameValidationMessage) {
      return res.status(400).json({
        message: nameValidationMessage
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado"
      });
    }

    if (rejectDemoAccountMutation(user, res)) {
      return;
    }

    user.name = normalizedName;
    user.profileImage = normalizedProfileImage;

    await user.save();

    return res.json({
      message: "Perfil atualizado com sucesso",
      name: user.name,
      profileImage: user.profileImage || ""
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

router.put("/me/email", authMiddleware, async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado"
      });
    }

    if (rejectDemoAccountMutation(user, res)) {
      return;
    }

    const emailValidationMessage = getEmailValidationMessage(
      normalizedEmail,
      user.email
    );

    if (emailValidationMessage) {
      return res.status(400).json({
        message: emailValidationMessage
      });
    }

    const userWithEmail = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id }
    });

    if (userWithEmail) {
      return res.status(400).json({
        message: "Email já cadastrado"
      });
    }

    user.email = normalizedEmail;
    await user.save();

    return res.json({
      message: "Email alterado com sucesso",
      email: user.email
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

router.put("/me/password", authMiddleware, async (req, res) => {
  try {
    const currentPassword = typeof req.body?.currentPassword === "string"
      ? req.body.currentPassword
      : "";
    const newPassword = typeof req.body?.newPassword === "string"
      ? req.body.newPassword
      : "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Informe a senha atual e a nova senha"
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado"
      });
    }

    if (rejectDemoAccountMutation(user, res)) {
      return;
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Senha atual incorreta"
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "A nova senha deve ser diferente da atual"
      });
    }

    const passwordValidationMessage = getPasswordValidationMessage(newPassword);

    if (passwordValidationMessage) {
      return res.status(400).json({
        message: passwordValidationMessage
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      message: "Senha alterada com sucesso"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

router.delete("/me", authMiddleware, async (req, res) => {
  try {
    const password = typeof req.body?.password === "string"
      ? req.body.password
      : "";

    if (!password) {
      return res.status(400).json({
        message: "Informe sua senha para confirmar a exclusão"
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado"
      });
    }

    if (rejectDemoAccountMutation(user, res)) {
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Senha incorreta!"
      });
    }

    await Transaction.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });

    return res.json({
      message: "Conta excluída com sucesso"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro no servidor"
    });
  }
});

module.exports = router;
