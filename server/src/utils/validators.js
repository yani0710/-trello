const { AppError } = require("./errors");

const PRIORITIES = ["Low", "Medium", "High"];

function ensureString(value, fieldName, max = 255) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new AppError(`${fieldName} is required.`);
  }
  if (normalized.length > max) {
    throw new AppError(`${fieldName} is too long.`);
  }
  return normalized;
}

function ensureOptionalText(value, max = 2000) {
  const normalized = String(value || "").trim();
  if (normalized.length > max) {
    throw new AppError("Text is too long.");
  }
  return normalized;
}

function ensureEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    throw new AppError("Invalid email address.");
  }
  return email;
}

function ensurePassword(value) {
  const password = String(value || "");
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters.");
  }
  return password;
}

function ensureDueDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid due date.");
  }
  return date.toISOString();
}

function ensurePriority(value) {
  const normalized = value || "Medium";
  if (!PRIORITIES.includes(normalized)) {
    throw new AppError("Invalid priority.");
  }
  return normalized;
}

module.exports = {
  PRIORITIES,
  ensureDueDate,
  ensureEmail,
  ensureOptionalText,
  ensurePassword,
  ensurePriority,
  ensureString
};
