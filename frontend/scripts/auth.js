// ==============================
// CONFIG
// ==============================

const IS_LOCAL_ENVIRONMENT = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);
const API_URL = IS_LOCAL_ENVIRONMENT
  ? "http://localhost:5000/api/auth"
  : "https://ezsaldo-backend.onrender.com/api/auth";
const USER_PROFILE_IMAGE_STORAGE_KEY = "userProfileImage";
const NAME_LOCALE = "pt-BR";
const MIN_PASSWORD_LENGTH = 6;

// ==============================
// HELPERS
// ==============================

function showLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.add("hidden");
}

function setMessage(element, message = "") {
  if (element) element.textContent = message;
}

function resetInputBorder(input) {
  if (input) input.style.borderColor = "rgba(255, 255, 255, 0.08)";
}

function setInputBorderSuccess(input) {
  if (input) input.style.borderColor = "#22c55e";
}

function setInputBorderError(input) {
  if (input) input.style.borderColor = "#ef4444";
}

function normalizeNameValue(name = "") {
  return typeof name === "string"
    ? name.trim().replace(/\s+/g, " ")
    : "";
}

function capitalizeFullName(name = "") {
  const normalizedName = normalizeNameValue(name);

  if (!normalizedName) {
    return "";
  }

  return normalizedName
    .toLocaleLowerCase(NAME_LOCALE)
    .replace(/(^|\s)\S/g, (match) => match.toLocaleUpperCase(NAME_LOCALE));
}

function getNameValidationMessage(name = "") {
  const words = normalizeNameValue(name)
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

function getPasswordValidationMessage(password = "") {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  return "";
}

function normalizeNameInputValue(input) {
  if (!input) return "";

  const capitalizedName = capitalizeFullName(input.value);
  input.value = capitalizedName;
  return capitalizedName;
}

function persistAuthenticatedUser({ token, name, profileImage = "" }) {
  const formattedName = capitalizeFullName(name);

  localStorage.setItem("token", token);
  localStorage.setItem("userName", formattedName);

  if (profileImage) {
    localStorage.setItem(USER_PROFILE_IMAGE_STORAGE_KEY, profileImage);
    return;
  }

  localStorage.removeItem(USER_PROFILE_IMAGE_STORAGE_KEY);
}

// ==============================
// LOGIN
// ==============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const errorText = document.getElementById("loginError");
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    setMessage(errorText);

    showLoader();

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        hideLoader();
        setMessage(errorText, data.message || "Erro ao fazer login");
        return;
      }

      persistAuthenticatedUser({
        token: data.token,
        name: data.name,
        profileImage: data.profileImage || ""
      });

      window.location.href = "dashboard.html";
    } catch (error) {
      hideLoader();
      setMessage(errorText, "Erro de conexão com servidor");
    }
  });
}

const demoAccountCard = document.getElementById("demoAccountCard");
const useDemoAccountBtn = document.getElementById("useDemoAccountBtn");

if (demoAccountCard) {
  useDemoAccountBtn?.addEventListener("click", () => {
    const emailInput = document.getElementById("email");
    const loginPasswordInput = document.getElementById("password");

    if (emailInput) {
      emailInput.value = "demo.ezsaldo@example.test";
      resetInputBorder(emailInput);
    }

    if (loginPasswordInput) {
      loginPasswordInput.value = "EZSaldo-Demo-2026";
      resetInputBorder(loginPasswordInput);
    }

    setMessage(document.getElementById("loginError"));
    loginForm?.querySelector('button[type="submit"]')?.focus();
  });
}

// ==============================
// REGISTER
// ==============================

const registerForm = document.getElementById("registerForm");
const registerNameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

function validatePasswords() {
  if (!passwordInput || !confirmPasswordInput) return true;

  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const passwordValidationMessage = getPasswordValidationMessage(password);

  if (!password) {
    resetInputBorder(passwordInput);
  } else if (passwordValidationMessage) {
    setInputBorderError(passwordInput);
  } else {
    setInputBorderSuccess(passwordInput);
  }

  if (!confirmPassword) {
    resetInputBorder(confirmPasswordInput);
    return false;
  }

  if (passwordValidationMessage) {
    setInputBorderError(confirmPasswordInput);
    return false;
  }

  if (password === confirmPassword) {
    setInputBorderSuccess(confirmPasswordInput);
    return true;
  }

  setInputBorderError(confirmPasswordInput);
  return false;
}

if (passwordInput && confirmPasswordInput) {
  passwordInput.addEventListener("input", validatePasswords);
  confirmPasswordInput.addEventListener("input", validatePasswords);
}

if (registerNameInput) {
  registerNameInput.addEventListener("blur", () => {
    normalizeNameInputValue(registerNameInput);
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const errorText = document.getElementById("registerError");
    const name = normalizeNameInputValue(registerNameInput);
    const email = document.getElementById("email")?.value.trim();
    const password = passwordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";
    const nameValidationMessage = getNameValidationMessage(name);
    const passwordValidationMessage = getPasswordValidationMessage(password);

    setMessage(errorText);

    if (nameValidationMessage) {
      setMessage(errorText, nameValidationMessage);
      return;
    }

    if (passwordValidationMessage) {
      setInputBorderError(passwordInput);
      setMessage(errorText, passwordValidationMessage);
      return;
    }

    if (password !== confirmPassword) {
      setInputBorderError(confirmPasswordInput);
      setMessage(errorText, "As senhas não coincidem");
      return;
    }

    showLoader();

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password,
          profileImage: croppedAvatarBase64 || ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        hideLoader();
        setMessage(errorText, data.message || "Erro ao cadastrar");
        return;
      }

      window.location.href = "login.html";
    } catch (error) {
      hideLoader();
      setMessage(errorText, "Erro ao conectar com servidor");
    }
  });
}

// ==============================
// TOGGLE PASSWORD
// ==============================

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.previousElementSibling;
    if (!input) return;

    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";
    button.classList.toggle("is-visible", isHidden);
    button.setAttribute(
      "aria-label",
      isHidden ? "Ocultar senha" : "Mostrar senha"
    );
    button.setAttribute(
      "aria-pressed",
      isHidden ? "true" : "false"
    );
  });
});

// ==============================
// AVATAR + CROP
// ==============================

const profileImageInput = document.getElementById("profileImage");
const avatarPickerBtn = document.getElementById("avatarPickerBtn");
const avatarPreview = document.getElementById("avatarPreview");
const avatarTip = document.getElementById("avatarTip");
const removeImageBtn = document.getElementById("removeImageBtn");
const cropModal = document.getElementById("cropModal");
const cropperImage = document.getElementById("cropperImage");
const zoomRange = document.getElementById("zoomRange");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const confirmCropBtn = document.getElementById("confirmCropBtn");
const DEFAULT_AVATAR_SRC = "assets/avatar-default.png";

let cropperInstance = null;
let currentImageSrc = "";
let croppedAvatarBase64 = "";
let initialZoomRatio = 1;

function openCropModal() {
  if (cropModal) cropModal.classList.remove("hidden");
}

function closeCropModal() {
  if (cropModal) cropModal.classList.add("hidden");

  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }

  if (zoomRange) {
    zoomRange.value = "1";
  }

  initialZoomRatio = 1;
}

function getCurrentCropperZoomRatio() {
  if (!cropperInstance) return 1;

  const imageData = cropperInstance.getImageData();

  if (!imageData.naturalWidth) {
    return 1;
  }

  return imageData.width / imageData.naturalWidth;
}

function syncAvatarPreview() {
  const hasAvatar = Boolean(croppedAvatarBase64);

  if (avatarPreview) {
    avatarPreview.src = hasAvatar ? croppedAvatarBase64 : DEFAULT_AVATAR_SRC;
    avatarPreview.classList.remove("hidden");
  }

  if (avatarTip) {
    avatarTip.classList.toggle("hidden", hasAvatar);
  }

  if (avatarPickerBtn) {
    const avatarActionLabel = hasAvatar
      ? "Alterar imagem de perfil"
      : "Adicionar imagem de perfil";

    avatarPickerBtn.setAttribute("aria-label", avatarActionLabel);
    avatarPickerBtn.setAttribute("title", avatarActionLabel);
  }

  if (removeImageBtn) {
    removeImageBtn.classList.toggle("hidden", !hasAvatar);
  }
}

function resetAvatarSelection() {
  croppedAvatarBase64 = "";
  currentImageSrc = "";

  if (profileImageInput) {
    profileImageInput.value = "";
  }

  syncAvatarPreview();
}

if (avatarPickerBtn && profileImageInput) {
  avatarPickerBtn.addEventListener("click", () => {
    profileImageInput.click();
  });
}

syncAvatarPreview();

if (profileImageInput) {
  profileImageInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      currentImageSrc = await readFileAsDataURL(file);

      // registra o onload ANTES
      cropperImage.onload = () => {
        openCropModal();

        if (cropperInstance) {
          cropperInstance.destroy();
          cropperInstance = null;
        }

        cropperInstance = new Cropper(cropperImage, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          background: false,
          guides: false,
          center: true,
          autoCropArea: 1,
          movable: true,
          zoomable: true,
          scalable: false,
          rotatable: false,
          ready() {
            initialZoomRatio = getCurrentCropperZoomRatio();

            if (zoomRange) {
              zoomRange.value = "1";
            }
          },
          zoom(event) {
            if (!zoomRange || !initialZoomRatio) return;

            const minRatio = initialZoomRatio * Number(zoomRange.min);
            const maxRatio = initialZoomRatio * Number(zoomRange.max);
            const zoomTolerance = 0.001;

            if (
              event.detail.ratio < minRatio - zoomTolerance ||
              event.detail.ratio > maxRatio + zoomTolerance
            ) {
              event.preventDefault();
              return;
            }

            const relativeZoom = event.detail.ratio / initialZoomRatio;

            zoomRange.value = relativeZoom.toFixed(2);
          }
        });
      };

      cropperImage.src = currentImageSrc;
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
    }
  });
}

if (zoomRange) {
  zoomRange.addEventListener("input", (e) => {
    if (!cropperInstance || !initialZoomRatio) return;

    const minZoom = Number(zoomRange.min);
    const maxZoom = Number(zoomRange.max);
    const zoomValue = Math.min(
      maxZoom,
      Math.max(minZoom, Number(e.target.value))
    );

    cropperInstance.zoomTo(initialZoomRatio * zoomValue);
  });
}

if (cancelCropBtn) {
  cancelCropBtn.addEventListener("click", () => {
    closeCropModal();
    currentImageSrc = croppedAvatarBase64 || "";

    if (profileImageInput) {
      profileImageInput.value = "";
    }
  });
}

if (confirmCropBtn) {
  confirmCropBtn.addEventListener("click", async () => {
    if (!cropperInstance || !currentImageSrc) return;

    const cropData = cropperInstance.getData(true);

    try {
      croppedAvatarBase64 = await getCroppedImage(
        currentImageSrc,
        {
          x: cropData.x,
          y: cropData.y,
          width: cropData.width,
          height: cropData.height
        },
        256
      );

      currentImageSrc = croppedAvatarBase64;

      if (profileImageInput) {
        profileImageInput.value = "";
      }

      syncAvatarPreview();
      closeCropModal();
    } catch (error) {
      console.error("Erro ao recortar imagem:", error);
    }
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    closeCropModal();
    resetAvatarSelection();
  });
}
