/**
 * helpers.js — Utilidades puras reutilizables en toda la app.
 */

// ── Strings ──────────────────────────────────────────────────────────────────

/** Escapa HTML para evitar XSS */
export function escapeHtml(text = "") {
  const d = document.createElement("div");
  d.textContent = String(text);
  return d.innerHTML;
}

/**
 * Genera un slug URL-seguro desde un texto.
 * Ej: "¿Por qué Luffy?" → "por-que-luffy"
 */
export function slugify(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Trunca texto a maxLen caracteres */
export function truncate(text = "", maxLen = 120) {
  const s = String(text);
  return s.length <= maxLen ? s : s.slice(0, maxLen).trimEnd() + "…";
}

// ── Fechas ───────────────────────────────────────────────────────────────────

/**
 * Formatea "YYYY-MM-DD" → "DD/MM/YYYY"
 * Devuelve "—" si no hay valor.
 */
export function formatDate(value) {
  if (!value) return "—";
  try {
    const [y, m, d] = String(value).split("-");
    if (!y || !m || !d) return String(value);
    return `${d}/${m}/${y}`;
  } catch {
    return String(value);
  }
}

/**
 * Formatea "YYYY-MM-DD" a una fecha larga en español.
 * Ej: 2026-04-13 -> 13 abr 2026
 */
export function formatDateLong(value, options = {}) {
  if (!value) return "—";
  try {
    const [year, month, day] = String(value).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options
    });
  } catch {
    return String(value);
  }
}

/**
 * Formatea un Firestore Timestamp o Date a fecha legible en español.
 * Devuelve "—" si no hay valor.
 */
export function formatTimestamp(ts) {
  if (!ts) return "—";
  if (ts?.toDate) return ts.toDate().toLocaleDateString("es-ES");
  if (ts instanceof Date) return ts.toLocaleDateString("es-ES");
  return String(ts);
}

/** Hoy en formato YYYY-MM-DD (para inputs date) */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Devuelve true si el valor es una fecha YYYY-MM-DD válida */
export function isISODate(value = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

/** Devuelve las partes numéricas de una fecha YYYY-MM-DD o null */
export function parseISODate(value = "") {
  if (!isISODate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** Convierte Date local a YYYY-MM-DD */
export function toISODateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── URL / Navegación ─────────────────────────────────────────────────────────

/** Lee un query param de la URL actual */
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── DOM ──────────────────────────────────────────────────────────────────────

/**
 * Shorthand para querySelector con throw si no encuentra el elemento.
 * Útil para detectar errores de estructura rápido.
 */
export function qs(selector, parent = document) {
  const el = parent.querySelector(selector);
  if (!el) throw new Error(`No se encontró: "${selector}"`);
  return el;
}

/** Shorthand para querySelectorAll (devuelve Array) */
export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/** Elimina todos los hijos de un elemento */
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ── Rendimiento ──────────────────────────────────────────────────────────────

/** Debounce clásico */
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ── Toast ────────────────────────────────────────────────────────────────────

let _toastEl = null;

function getToastContainer() {
  if (_toastEl) return _toastEl;
  _toastEl = document.createElement("div");
  _toastEl.id = "toast-container";
  document.body.appendChild(_toastEl);
  return _toastEl;
}

/**
 * Muestra una notificación toast.
 * @param {string} message  — HTML permitido (usar con cuidado)
 * @param {'ok'|'danger'|'warn'|''} type
 * @param {number} duration — ms antes de que desaparezca
 */
export function toast(message, type = "", duration = 3200) {
  const container = getToastContainer();
  const el = document.createElement("div");
  const normalizedType = type === "error" ? "danger" : type;
  el.className = `toast${normalizedType ? " " + normalizedType : ""}`;
  el.innerHTML = message;
  container.appendChild(el);

  setTimeout(() => {
    el.style.transition = "opacity .28s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, duration);
}
