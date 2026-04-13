/**
 * videos.js — Capa de datos central para la colección `videos` de Firestore.
 *
 * Toda la app debe leer y escribir vídeos exclusivamente a través de este módulo.
 * Esto garantiza que el modelo de datos sea consistente en todas las páginas.
 *
 * Estrategia de queries:
 *  - getAllVideos() carga los documentos ordenados por createdAt desc.
 *  - El filtrado por stage/estado se hace en el cliente con los helpers
 *    filterBy*() para evitar índices compuestos en Firestore y mantener
 *    el código simple (< 200 vídeos es perfectamente manejable en memoria).
 *  - getVideo(id) hace una lectura directa por documento.
 */

import { db }      from "../config/firebase.js";
import { slugify } from "../utils/helpers.js";
import { ESTADOS_PIPELINE } from "../config/sagas.js";

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── Constantes ───────────────────────────────────────────────────────────────

const COL = "videos";
const videosRef = collection(db, COL);

/**
 * Metadatos de la última lectura de getAllVideos().
 * Útil para mostrar info de depuración en UI.
 * @type {{ source: 'server'|'cache'|'error'|null, error: Error|null, ts: number|null }}
 */
export const lastReadMeta = { source: null, error: null, ts: null };

/**
 * Estructura completa de un documento de vídeo con valores por defecto.
 * Toda lectura de Firestore se "rellena" con estos defaults via normalizeVideo().
 */
const DEFAULTS = {
  // Bloque base
  titulo:         "",
  slug:           "",
  estadoPipeline: "idea",   // idea | roadmap | guion | calendario | publicado

  // Bloque editorial
  tipoVideo:      "",        // arco | personaje | tema | conexion
  saga:           "",
  arco:           "",
  prioridad:      "Media",   // Alta | Media | Baja
  tesisCentral:   "",
  conexionFuturo: "",
  tags:           [],

  // Bloque idea
  ideaTexto: "",
  ideaHook:  "",
  ideaNotas: "",

  // Bloque roadmap
  roadmapEstado:             "pendiente", // pendiente | priorizado | guionizar | aparcado
  roadmapOrden:              0,
  roadmapNotas:              "",
  fechaGrabacionTentativa:   "",
  fechaPublicacionTentativa: "",

  // Bloque guion
  guionEstado:        "sin_empezar", // sin_empezar | en_progreso | listo
  guionPlantillaTipo: "",
  guionMarkdown:      "",
  guionNotas:         "",
  guionPromptGenerado:"",
  guionVersion:       1,
  guionUltimaEdicion: null,

  // Bloque calendario
  fechaGrabacion: "",
  fechaPublicacion: "",
  calendarEstado: "pendiente_grabacion", // pendiente_grabacion | grabado | programado | publicado

  // Bloque publicado
  youtubeUrl:          "",
  thumbnailUrl:        "",
  fechaPublicacionReal:"",
  tituloPublicado:     ""
};

// ── Normalización ─────────────────────────────────────────────────────────────

/**
 * Recibe los datos crudos de un documento Firestore y devuelve un objeto
 * limpio con todos los campos garantizados + migración de campos legacy.
 *
 * Migración de campos del index.html original:
 *   estado        → estadoPipeline  (+ listo→calendario, guionizar→guion)
 *   idea          → ideaTexto
 *   tipo          → tipoVideo
 *   conexion      → conexionFuturo
 *   urlPublicada  → youtubeUrl
 *   etapa         → roadmapEstado (aproximado)
 *
 * @param {Object} data — datos crudos de Firestore
 * @param {string} id   — ID del documento
 * @returns {Object}    — vídeo normalizado
 */
export function normalizeVideo(data = {}, id = "") {
  const d = { ...data };

  // ── Migración legacy ─────────────────────────────────────────────────────
  if (!d.estadoPipeline && d.estado) {
    const MAP = { listo: "calendario", guionizar: "guion" };
    d.estadoPipeline = MAP[d.estado] ?? d.estado;
  }
  if (!d.ideaTexto  && d.idea)       d.ideaTexto  = d.idea;
  if (!d.tipoVideo  && d.tipo)       d.tipoVideo  = d.tipo;
  if (!d.conexionFuturo && d.conexion) d.conexionFuturo = d.conexion;
  if (!d.youtubeUrl && d.urlPublicada) d.youtubeUrl = d.urlPublicada;
  if (!d.roadmapEstado && d.etapa) {
    // Mapeo aproximado de la etapa libre del sistema anterior
    const etapa = (d.etapa || "").toLowerCase();
    if (etapa.includes("priorizado"))    d.roadmapEstado = "priorizado";
    else if (etapa.includes("guionizar")) d.roadmapEstado = "guionizar";
    else if (etapa.includes("aparcado"))  d.roadmapEstado = "aparcado";
    else                                  d.roadmapEstado = "pendiente";
  }

  // ── Mezcla con defaults ──────────────────────────────────────────────────
  const result = { ...DEFAULTS, ...d, id };

  // Asegurar que estadoPipeline es un valor válido
  if (!ESTADOS_PIPELINE.includes(result.estadoPipeline)) {
    result.estadoPipeline = "idea";
  }

  // tags siempre debe ser un array
  if (!Array.isArray(result.tags)) result.tags = [];

  // guionVersion siempre número
  if (typeof result.guionVersion !== "number") result.guionVersion = 1;

  return result;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Crea un nuevo vídeo en Firestore.
 * Genera el slug automáticamente si no se proporciona.
 *
 * @param {Object} data — campos del vídeo (no hace falta pasar todos)
 * @returns {string} id del documento creado
 */
export async function createVideo(data = {}) {
  const now = serverTimestamp();
  const payload = {
    ...DEFAULTS,
    ...data,
    slug:      data.slug || slugify(data.titulo || ""),
    createdAt: now,
    updatedAt: now
  };
  // Eliminar el campo `id` si se pasó por error (Firestore lo gestiona)
  delete payload.id;

  const ref = await addDoc(videosRef, payload);
  return ref.id;
}

/**
 * Lee un vídeo por su ID.
 * @returns {Object|null} vídeo normalizado o null si no existe
 */
export async function getVideo(id) {
  let snap;
  try {
    snap = await getDocFromServer(doc(db, COL, id));
  } catch (serverError) {
    console.warn("[videos] getVideo: no se pudo leer desde servidor, usando caché/local si existe.", serverError);
    snap = await getDoc(doc(db, COL, id));
  }
  if (!snap.exists()) return null;
  return normalizeVideo(snap.data(), snap.id);
}

/**
 * Lee todos los vídeos.
 *
 * Aquí usamos getDocs() sobre la colección completa y ordenamos en cliente:
 * - todas las páginas consumen esta función como una lectura puntual
 * - evita errores silenciosos si la respuesta llega de caché al instante
 * - incluye documentos legacy que no tengan `createdAt`
 * - simplifica el flujo tras los cambios de vista
 *
 * @returns {Promise<Object[]>} array de vídeos normalizados
 */
export async function getAllVideos() {
  let snap;
  lastReadMeta.ts = Date.now();
  try {
    snap = await getDocsFromServer(videosRef);
    lastReadMeta.source = "server";
    lastReadMeta.error  = null;
  } catch (serverError) {
    lastReadMeta.source = "cache";
    lastReadMeta.error  = serverError;
    console.warn("[videos] getAllVideos: no se pudo leer desde servidor, usando caché/local si existe.", serverError);
    try {
      snap = await getDocs(videosRef);
    } catch {
      lastReadMeta.source = "error";
      throw serverError;
    }
  }
  const videos = snap.docs.map(d => normalizeVideo(d.data(), d.id));
  return [...videos].sort((a, b) => {
    const left  = a.createdAt || a.updatedAt || null;
    const right = b.createdAt || b.updatedAt || null;

    const leftDate  = left?.toDate ? left.toDate() : left;
    const rightDate = right?.toDate ? right.toDate() : right;

    if (!leftDate && !rightDate) return 0;
    if (!leftDate) return 1;
    if (!rightDate) return -1;
    if (leftDate < rightDate) return 1;
    if (leftDate > rightDate) return -1;
    return 0;
  });
}

/**
 * Actualiza campos específicos de un vídeo.
 * Siempre actualiza `updatedAt`.
 *
 * @param {string} id
 * @param {Object} data — solo los campos que cambien
 */
export async function updateVideo(id, data = {}) {
  const payload = { ...data, updatedAt: serverTimestamp() };
  delete payload.id; // nunca guardar el id como campo
  await updateDoc(doc(db, COL, id), payload);
}

/**
 * Borra un vídeo permanentemente.
 * @param {string} id
 */
export async function deleteVideo(id) {
  await deleteDoc(doc(db, COL, id));
}

/**
 * Mueve un vídeo a otra fase del pipeline.
 * Aplica sub-estados por defecto cuando se entra en una fase nueva.
 *
 * @param {string} id
 * @param {string} newStage — valor de ESTADOS_PIPELINE
 */
export async function moveToStage(id, newStage) {
  // Sub-estados por defecto al entrar en una fase
  const stageDefaults = {
    roadmap:    { roadmapEstado: "pendiente" },
    guion:      { guionEstado:   "sin_empezar" },
    calendario: { calendarEstado: "pendiente_grabacion" }
  };

  await updateVideo(id, {
    estadoPipeline: newStage,
    ...(stageDefaults[newStage] ?? {})
  });
}

/**
 * Actualiza solo el guion markdown y marca la fecha de edición.
 * Incrementa guionVersion.
 *
 * @param {string} id
 * @param {string} markdown
 * @param {Object} video — objeto vídeo actual (para leer guionVersion)
 */
export async function saveGuionMarkdown(id, markdown, video = {}) {
  await updateVideo(id, {
    guionMarkdown:      markdown,
    guionVersion:       (video.guionVersion || 1) + 1,
    guionUltimaEdicion: serverTimestamp()
  });
}

// ── Filtros client-side ───────────────────────────────────────────────────────
// Todos operan sobre arrays ya cargados con getAllVideos().
// Evitan índices compuestos en Firestore y mantienen el código simple.

/** Filtra vídeos por fase del pipeline */
export function filterByStage(videos, stage) {
  return videos.filter(v => v.estadoPipeline === stage);
}

/** Filtra vídeos por estado de guion */
export function filterByGuionEstado(videos, estado) {
  return videos.filter(v => v.estadoPipeline === "guion" && v.guionEstado === estado);
}

/** Filtra vídeos que tienen al menos una fecha de calendario */
export function filterWithDates(videos) {
  return videos.filter(v =>
    v.fechaGrabacion          ||
    v.fechaPublicacion        ||
    v.fechaGrabacionTentativa ||
    v.fechaPublicacionTentativa ||
    v.fechaPublicacionReal
  );
}

/** Filtra vídeos publicados */
export function filterPublished(videos) {
  return videos.filter(v => v.estadoPipeline === "publicado");
}

/**
 * Ordena un array de vídeos por el campo dado.
 * @param {Object[]} videos
 * @param {'createdAt'|'updatedAt'|'roadmapOrden'|'prioridad'} field
 * @param {'asc'|'desc'} dir
 */
export function sortVideos(videos, field = "createdAt", dir = "desc") {
  const PRIORIDAD_ORDER = { Alta: 0, Media: 1, Baja: 2 };

  return [...videos].sort((a, b) => {
    let va = a[field];
    let vb = b[field];

    // Prioridad: ordenar por peso definido
    if (field === "prioridad") {
      va = PRIORIDAD_ORDER[va] ?? 9;
      vb = PRIORIDAD_ORDER[vb] ?? 9;
      return dir === "asc" ? va - vb : vb - va;
    }

    // Firestore Timestamps
    if (va?.toDate) va = va.toDate();
    if (vb?.toDate) vb = vb.toDate();

    // Fechas string YYYY-MM-DD
    if (typeof va === "string" && va.match(/^\d{4}-\d{2}-\d{2}/)) va = new Date(va);
    if (typeof vb === "string" && vb.match(/^\d{4}-\d{2}-\d{2}/)) vb = new Date(vb);

    // Números
    if (typeof va === "number" && typeof vb === "number") {
      return dir === "asc" ? va - vb : vb - va;
    }

    // Comparación general
    if (va < vb) return dir === "asc" ? -1 :  1;
    if (va > vb) return dir === "asc" ?  1 : -1;
    return 0;
  });
}

// ── Helpers de presentación ───────────────────────────────────────────────────

/**
 * Devuelve el color de badge CSS para un estadoPipeline.
 * Usado en múltiples vistas para consistencia visual.
 */
export function stageBadgeClass(stage) {
  return {
    idea:       "",           // azul (default badge)
    roadmap:    "muted",
    guion:      "yellow",
    calendario: "green",
    publicado:  "pink"
  }[stage] ?? "muted";
}

/**
 * Devuelve el color de badge CSS para un guionEstado.
 */
export function guionBadgeClass(estado) {
  return {
    sin_empezar: "muted",
    en_progreso: "yellow",
    listo:       "green"
  }[estado] ?? "muted";
}
