import { renderNav } from "../utils/nav.js";
import { requireAuth } from "../utils/auth.js";
requireAuth();
import {
  debounce,
  escapeHtml,
  formatDateLong,
  qs,
  qsa,
  toast
} from "../utils/helpers.js";
import { deleteVideo, filterPublished, getAllVideos, updateVideo } from "../services/videos.js";
import { TIPO_LABELS } from "../config/sagas.js";
import { getVideoDisplayTitle, getVideoPublicationDate, getYoutubeThumbnail } from "../utils/video-meta.js";

renderNav();

const state = {
  videos: [],
  tipo: "",
  search: "",
  sort: "fecha_desc",
  pendingDeleteId: "",
  currentVideo: null
};

const els = {
  count: qs("#publishedCount"),
  grid: qs("#publishedGrid"),
  pills: qs("#filterPills"),
  search: qs("#searchInput"),
  sort: qs("#sortSelect"),
  modal: qs("#modalOverlay"),
  modalForm: qs("#modalForm"),
  modalTitle: qs("#modalTitle"),
  modalSave: qs("#modalSave"),
  thumbPreview: qs("#thumbPreview"),
  thumbPreviewImg: qs("#thumbPreviewImg"),
  fields: {
    id: qs("#fId"),
    tituloPublicado: qs("#fTituloPublicado"),
    youtubeUrl: qs("#fYoutubeUrl"),
    thumbnailUrl: qs("#fThumbnailUrl"),
    fechaPublicacionReal: qs("#fFechaPublicacionReal"),
    tipoVideo: qs("#fTipoVideo"),
    saga: qs("#fSaga"),
    arco: qs("#fArco"),
    tesisCentral: qs("#fTesisCentral")
  }
};

bindGlobalEvents();
loadPublishedVideos();

async function loadPublishedVideos() {
  try {
    const allVideos = await getAllVideos();
    state.videos = filterPublished(allVideos);
    renderStats();
    renderGrid();
  } catch (error) {
    console.error(error);
    els.grid.innerHTML = `
      <div class="card published-empty empty-state">
        <strong>No se pudieron cargar los publicados</strong>
        Revisa la conexión con Firestore.
      </div>
    `;
    toast("Error al cargar publicados.", "danger");
  }
}

function bindGlobalEvents() {
  els.pills.addEventListener("click", event => {
    const button = event.target.closest("[data-tipo]");
    if (!button) return;

    state.tipo = button.dataset.tipo || "";
    qsa("[data-tipo]", els.pills).forEach(pill => pill.classList.toggle("active", pill === button));
    renderGrid();
  });

  els.search.addEventListener("input", debounce(event => {
    state.search = event.target.value.trim().toLowerCase();
    renderGrid();
  }, 120));

  els.sort.addEventListener("change", event => {
    state.sort = event.target.value;
    renderGrid();
  });

  els.modalForm.addEventListener("submit", saveModal);
  qs("#modalClose").addEventListener("click", closeModal);
  qs("#modalCancel").addEventListener("click", closeModal);
  els.modal.addEventListener("click", event => {
    if (event.target === els.modal) closeModal();
  });

  els.fields.thumbnailUrl.addEventListener("input", refreshThumbPreview);
  els.fields.youtubeUrl.addEventListener("input", refreshThumbPreview);
}

function renderStats() {
  const thisYear = String(new Date().getFullYear());
  const withUrl = state.videos.filter(video => Boolean(video.youtubeUrl)).length;
  const withThumb = state.videos.filter(video => Boolean(getYoutubeThumbnail(video))).length;
  const publishedThisYear = state.videos.filter(video => getVideoPublicationDate(video).startsWith(thisYear)).length;

  qs("#statTotal").textContent = state.videos.length;
  qs("#statThisYear").textContent = publishedThisYear;
  qs("#statWithUrl").textContent = withUrl;
  qs("#statWithThumb").textContent = withThumb;
}

function getFilteredVideos() {
  let list = [...state.videos];

  if (state.tipo) {
    list = list.filter(video => video.tipoVideo === state.tipo);
  }

  if (state.search) {
    list = list.filter(video => {
      const haystack = [
        getVideoDisplayTitle(video),
        video.saga,
        video.arco,
        video.tesisCentral,
        video.youtubeUrl
      ].join(" ").toLowerCase();

      return haystack.includes(state.search);
    });
  }

  list.sort((a, b) => sortVideos(a, b, state.sort));
  return list;
}

function sortVideos(a, b, mode) {
  if (mode === "titulo_asc") {
    return getVideoDisplayTitle(a).localeCompare(getVideoDisplayTitle(b), "es");
  }

  if (mode === "saga_asc") {
    return (a.saga || "").localeCompare(b.saga || "", "es");
  }

  const aDate = getVideoPublicationDate(a);
  const bDate = getVideoPublicationDate(b);
  return mode === "fecha_asc" ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
}

function renderGrid() {
  const videos = getFilteredVideos();
  els.count.textContent = `${videos.length} vídeo${videos.length === 1 ? "" : "s"} publicado${videos.length === 1 ? "" : "s"}`;

  if (!videos.length) {
    els.grid.innerHTML = `
      <div class="card published-empty empty-state">
        <strong>Sin resultados</strong>
        Ajusta los filtros o publica nuevos vídeos para verlos aquí.
      </div>
    `;
    return;
  }

  els.grid.innerHTML = videos.map(video => publishedCardHtml(video)).join("");

  qsa(".js-edit-published", els.grid).forEach(button => {
    button.addEventListener("click", () => openModal(button.dataset.id));
  });

  qsa(".js-delete-published", els.grid).forEach(button => {
    button.addEventListener("click", () => handleDelete(button));
  });

  qsa(".published-thumb img", els.grid).forEach(img => {
    img.addEventListener("error", () => {
      const fallback = document.createElement("div");
      fallback.className = "published-thumb-fallback";
      fallback.innerHTML = fallbackMarkup(img.dataset.title || "Sin miniatura");
      img.replaceWith(fallback);
    });
  });
}

function publishedCardHtml(video) {
  const title = escapeHtml(getVideoDisplayTitle(video));
  const summary = escapeHtml(video.tesisCentral || "");
  const thumb = getYoutubeThumbnail(video);
  const date = getVideoPublicationDate(video);
  const dateDisplay = date ? formatDateLong(date) : "Sin fecha";
  const tipoLabel = TIPO_LABELS[video.tipoVideo] || "";
  const calendarHref = buildCalendarHref(video);

  return `
    <article class="card published-card">
      <div class="published-thumb">
        ${thumb
          ? `<img src="${thumb}" alt="${title}" loading="lazy" data-title="${title}">`
          : `<div class="published-thumb-fallback">${fallbackMarkup(title)}</div>`}
        <div class="published-thumb-overlay">
          ${video.youtubeUrl ? `
            <a class="published-overlay-link" href="${video.youtubeUrl}" target="_blank" rel="noopener">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Ver en YouTube
            </a>
          ` : ""}
          ${calendarHref ? `<a class="published-calendar-link" href="${calendarHref}">Ver en calendario</a>` : ""}
        </div>
      </div>
      <div class="published-body">
        <div class="published-badges">
          ${tipoLabel ? `<span class="badge tipo-${video.tipoVideo}">${escapeHtml(tipoLabel)}</span>` : ""}
          ${video.saga ? `<span class="badge muted">${escapeHtml(video.saga)}</span>` : ""}
        </div>
        <h3 class="published-title">${title}</h3>
        <div class="published-meta">
          <span>📅 ${escapeHtml(dateDisplay)}</span>
          ${video.arco ? `<span>· ${escapeHtml(video.arco)}</span>` : ""}
        </div>
        ${summary ? `<p class="published-summary">${summary}</p>` : ""}
      </div>
      <div class="published-footer">
        ${video.youtubeUrl ? `<a class="btn-secondary btn-sm" href="${video.youtubeUrl}" target="_blank" rel="noopener">YouTube</a>` : `<span class="badge muted">Sin URL</span>`}
        <span class="published-actions-spacer"></span>
        <button class="btn-secondary btn-sm js-edit-published" type="button" data-id="${video.id}">Editar</button>
        <button class="btn-danger btn-sm js-delete-published" type="button" data-id="${video.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function fallbackMarkup(title) {
  return `
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
    <strong>${title}</strong>
    <span>Miniatura no disponible</span>
  `;
}

function buildCalendarHref(video) {
  const date = getVideoPublicationDate(video);
  if (!date) return "";
  return `calendario.html?month=${date.slice(0, 7)}&date=${date}`;
}

function handleDelete(button) {
  const id = button.dataset.id;

  if (state.pendingDeleteId === id) {
    confirmDelete(id, button);
    return;
  }

  if (state.pendingDeleteId) {
    const previous = els.grid.querySelector(`.js-delete-published[data-id="${state.pendingDeleteId}"]`);
    if (previous) previous.textContent = "Eliminar";
  }

  state.pendingDeleteId = id;
  button.textContent = "Confirmar";

  setTimeout(() => {
    if (state.pendingDeleteId === id) {
      state.pendingDeleteId = "";
      button.textContent = "Eliminar";
    }
  }, 2800);
}

async function confirmDelete(id, button) {
  button.disabled = true;

  try {
    await deleteVideo(id);
    state.videos = state.videos.filter(video => video.id !== id);
    state.pendingDeleteId = "";
    renderStats();
    renderGrid();
    toast("Vídeo eliminado.", "ok");
  } catch (error) {
    console.error(error);
    state.pendingDeleteId = "";
    button.disabled = false;
    button.textContent = "Eliminar";
    toast("No se pudo eliminar el vídeo.", "danger");
  }
}

function openModal(id) {
  const video = state.videos.find(item => item.id === id);
  if (!video) return;

  state.currentVideo = video;
  els.modalTitle.textContent = getVideoDisplayTitle(video);
  els.fields.id.value = video.id;
  els.fields.tituloPublicado.value = video.tituloPublicado || video.titulo || "";
  els.fields.youtubeUrl.value = video.youtubeUrl || "";
  els.fields.thumbnailUrl.value = video.thumbnailUrl || "";
  els.fields.fechaPublicacionReal.value = video.fechaPublicacionReal || "";
  els.fields.tipoVideo.value = TIPO_LABELS[video.tipoVideo] || video.tipoVideo || "—";
  els.fields.saga.value = video.saga || "—";
  els.fields.arco.value = video.arco || "—";
  els.fields.tesisCentral.value = video.tesisCentral || "";

  refreshThumbPreview();
  els.modal.style.display = "flex";
}

function closeModal() {
  els.modal.style.display = "none";
  state.currentVideo = null;
  els.modalForm.reset();
  els.thumbPreview.style.display = "none";
}

function refreshThumbPreview() {
  const source = els.fields.thumbnailUrl.value.trim() || getYoutubeThumbnail({
    youtubeUrl: els.fields.youtubeUrl.value.trim()
  });

  if (!source) {
    els.thumbPreview.style.display = "none";
    els.thumbPreviewImg.removeAttribute("src");
    return;
  }

  els.thumbPreviewImg.src = source;
  els.thumbPreview.style.display = "block";
}

async function saveModal(event) {
  event.preventDefault();

  const id = els.fields.id.value;
  if (!id || !state.currentVideo) return;

  els.modalSave.disabled = true;
  els.modalSave.textContent = "Guardando…";

  const patch = {
    tituloPublicado: els.fields.tituloPublicado.value.trim(),
    youtubeUrl: els.fields.youtubeUrl.value.trim(),
    thumbnailUrl: els.fields.thumbnailUrl.value.trim(),
    fechaPublicacionReal: els.fields.fechaPublicacionReal.value,
    estadoPipeline: "publicado"
  };

  if (els.fields.fechaPublicacionReal.value || state.currentVideo.calendarEstado) {
    patch.calendarEstado = els.fields.fechaPublicacionReal.value
      ? "publicado"
      : state.currentVideo.calendarEstado;
  }

  try {
    await updateVideo(id, patch);

    const index = state.videos.findIndex(video => video.id === id);
    if (index !== -1) {
      state.videos[index] = { ...state.videos[index], ...patch };
    }

    renderStats();
    renderGrid();
    closeModal();
    toast("Publicado actualizado.", "ok");
  } catch (error) {
    console.error(error);
    toast("No se pudo guardar el publicado.", "danger");
  } finally {
    els.modalSave.disabled = false;
    els.modalSave.textContent = "Guardar";
  }
}
