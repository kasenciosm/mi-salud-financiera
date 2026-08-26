const LEGACY_KEY = "mi-salud-financiera-movimientos-v1";
const DISMISSED_KEY = "mi-salud-financiera-importacion-omitida-v2";

export function loadLegacyTransactions() {
  if (localStorage.getItem(DISMISSED_KEY) === "true") return [];
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function finishLegacyImport() {
  localStorage.removeItem(LEGACY_KEY);
  localStorage.setItem(DISMISSED_KEY, "true");
}

export function dismissLegacyImport() {
  localStorage.setItem(DISMISSED_KEY, "true");
}
