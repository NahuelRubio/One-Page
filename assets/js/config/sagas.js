/**
 * sagas.js — Configuración de sagas, arcos, tipos de vídeo y estados.
 * Fuente única de verdad para todos los selectores del proyecto.
 */

export const SAGAS = {
  "East Blue": [
    "Romance Dawn",
    "Orange Town",
    "Syrup Village",
    "Baratie",
    "Arlong Park",
    "Loguetown"
  ],
  "Arabasta": [
    "Reverse Mountain",
    "Whisky Peak",
    "Little Garden",
    "Drum Island",
    "Arabasta"
  ],
  "Skypiea / Isla del Cielo": [
    "Jaya",
    "Skypiea"
  ],
  "Water 7": [
    "Long Ring Long Land",
    "Water 7",
    "Enies Lobby",
    "Post-Enies Lobby"
  ],
  "Thriller Bark": [
    "Thriller Bark"
  ],
  "Summit War / Guerra en la Cumbre": [
    "Sabaody Archipelago",
    "Amazon Lily",
    "Impel Down",
    "Marineford",
    "Post-War"
  ],
  "Isla Gyojin": [
    "Return to Sabaody",
    "Fish-Man Island / Isla Gyojin"
  ],
  "Dressrosa": [
    "Punk Hazard",
    "Dressrosa"
  ],
  "Whole Cake Island": [
    "Zou",
    "Whole Cake Island",
    "Levely / Reverie"
  ],
  "Wano": [
    "Wano Country / País de Wano"
  ],
  "Saga Final": [
    "Egghead",
    "Elbaph"
  ]
};

export const SAGA_NAMES = Object.keys(SAGAS);

// ── Tipos de vídeo ───────────────────────────────────────────────────────────
export const TIPOS_VIDEO = ["arco", "personaje", "tema", "conexion"];

export const TIPO_LABELS = {
  arco:      "Arco",
  personaje: "Personaje",
  tema:      "Tema",
  conexion:  "Conexión"
};

// ── Estados pipeline ─────────────────────────────────────────────────────────
export const ESTADOS_PIPELINE = ["idea", "roadmap", "guion", "calendario", "publicado"];

export const PIPELINE_LABELS = {
  idea:       "Idea",
  roadmap:    "Roadmap",
  guion:      "Guion",
  calendario: "Calendario",
  publicado:  "Publicado"
};

// ── Subestados roadmap ───────────────────────────────────────────────────────
export const ESTADOS_ROADMAP = ["pendiente", "priorizado", "guionizar", "aparcado"];

export const ROADMAP_LABELS = {
  pendiente:  "Pendiente",
  priorizado: "Priorizado",
  guionizar:  "Para guionizar",
  aparcado:   "Aparcado"
};

// ── Subestados guion ─────────────────────────────────────────────────────────
export const ESTADOS_GUION = ["sin_empezar", "en_progreso", "listo"];

export const GUION_LABELS = {
  sin_empezar: "Sin empezar",
  en_progreso: "En progreso",
  listo:       "Listo"
};

// ── Subestados calendario ────────────────────────────────────────────────────
export const ESTADOS_CALENDARIO = [
  "pendiente_grabacion",
  "grabado",
  "programado",
  "publicado"
];

export const CALENDARIO_LABELS = {
  pendiente_grabacion: "Pendiente grabación",
  grabado:             "Grabado",
  programado:          "Programado",
  publicado:           "Publicado"
};

// ── Prioridades ──────────────────────────────────────────────────────────────
export const PRIORIDADES = ["Alta", "Media", "Baja"];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Devuelve los arcos de una saga */
export function getArcosBySaga(saga) {
  return SAGAS[saga] ?? [];
}

/**
 * Rellena un <select> de sagas y, si se pasa arcoEl, lo enlaza para
 * que se actualice automáticamente cuando cambia la saga.
 *
 * @param {HTMLSelectElement} sagaEl
 * @param {HTMLSelectElement|null} arcoEl
 * @param {string} currentSaga
 * @param {string} currentArco
 */
export function populateSagaSelect(sagaEl, arcoEl, currentSaga = "", currentArco = "") {
  sagaEl.innerHTML =
    '<option value="">— Saga —</option>' +
    SAGA_NAMES.map(s =>
      `<option value="${s}"${s === currentSaga ? " selected" : ""}>${s}</option>`
    ).join("");

  if (arcoEl) {
    populateArcoSelect(arcoEl, currentSaga, currentArco);
    sagaEl.addEventListener("change", () => {
      populateArcoSelect(arcoEl, sagaEl.value, "");
    });
  }
}

/**
 * Rellena un <select> de arcos según la saga dada.
 *
 * @param {HTMLSelectElement} arcoEl
 * @param {string} saga
 * @param {string} currentArco
 */
export function populateArcoSelect(arcoEl, saga, currentArco = "") {
  const arcos = getArcosBySaga(saga);
  arcoEl.innerHTML =
    '<option value="">— Arco —</option>' +
    arcos.map(a =>
      `<option value="${a}"${a === currentArco ? " selected" : ""}>${a}</option>`
    ).join("");
}
