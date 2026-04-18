import { renderNav } from "../utils/nav.js";
import { requireAuth } from "../utils/auth.js";
requireAuth();
import {
  escapeHtml,
  formatDateLong,
  getParam,
  isISODate,
  toISODateLocal,
  toast
} from "../utils/helpers.js";
import { getAllVideos } from "../services/videos.js";
import { buildCalendarEvents, getStageHref, getVideoDisplayTitle } from "../utils/video-meta.js";
import { PIPELINE_LABELS, TIPO_LABELS } from "../config/sagas.js";

renderNav();

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const state = {
  today: new Date(),
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  selectedDate: toISODateLocal(new Date()),
  events: []
};

const els = {
  monthLabel: document.getElementById("monthLabel"),
  grid: document.getElementById("calendarGrid"),
  stats: document.getElementById("calendarStats"),
  dayPanel: document.getElementById("dayPanel"),
  agenda: document.getElementById("agendaRoot"),
  btnPrev: document.getElementById("btnPrevMonth"),
  btnNext: document.getElementById("btnNextMonth"),
  btnToday: document.getElementById("btnTodayMonth")
};

initStateFromUrl();
bindToolbar();
loadCalendar();

function initStateFromUrl() {
  const dateParam = getParam("date");
  const monthParam = getParam("month");

  if (isISODate(dateParam)) {
    state.selectedDate = dateParam;
    const [year, month] = dateParam.split("-").map(Number);
    state.viewYear = year;
    state.viewMonth = month - 1;
    return;
  }

  if (/^\d{4}-\d{2}$/.test(monthParam || "")) {
    const [year, month] = monthParam.split("-").map(Number);
    state.viewYear = year;
    state.viewMonth = month - 1;
    state.selectedDate = `${monthParam}-01`;
  }
}

function bindToolbar() {
  els.btnPrev.addEventListener("click", () => {
    state.viewMonth -= 1;
    if (state.viewMonth < 0) {
      state.viewMonth = 11;
      state.viewYear -= 1;
    }
    syncSelectedDate();
    render();
  });

  els.btnNext.addEventListener("click", () => {
    state.viewMonth += 1;
    if (state.viewMonth > 11) {
      state.viewMonth = 0;
      state.viewYear += 1;
    }
    syncSelectedDate();
    render();
  });

  els.btnToday.addEventListener("click", () => {
    state.viewYear = state.today.getFullYear();
    state.viewMonth = state.today.getMonth();
    state.selectedDate = toISODateLocal(state.today);
    render();
  });
}

async function loadCalendar() {
  try {
    const videos = await getAllVideos();
    state.events = videos
      .flatMap(video => buildCalendarEvents(video))
      .filter(event => isISODate(event.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

    syncSelectedDate();
    render();
  } catch (error) {
    console.error(error);
    els.grid.innerHTML = `<div class="empty-state"><strong>No se pudo cargar el calendario</strong>Revisa la conexión con Firestore.</div>`;
    els.dayPanel.innerHTML = "";
    els.agenda.innerHTML = "";
    toast("Error al cargar el calendario.", "danger");
  }
}

function render() {
  const monthEvents = getMonthEvents();
  const eventMap = buildEventMap(state.events);
  const days = getCalendarDays(state.viewYear, state.viewMonth);
  const todayKey = toISODateLocal(state.today);

  els.monthLabel.textContent = `${MONTH_NAMES[state.viewMonth]} ${state.viewYear}`;
  renderStats(monthEvents);

  els.grid.innerHTML = `
    <div class="calendar-grid">
      ${WEEKDAYS.map(day => `<div class="calendar-weekday">${day}</div>`).join("")}
      ${days.map(day => {
        const key = toISODateLocal(day.date);
        const events = eventMap.get(key) || [];
        const classes = [
          "calendar-day",
          day.isCurrentMonth ? "" : "is-outside",
          key === state.selectedDate ? "is-selected" : "",
          key === todayKey ? "is-today" : ""
        ].filter(Boolean).join(" ");

        const visibleEvents = events.slice(0, 2);
        const extra = events.length - visibleEvents.length;

        return `
          <button class="${classes}" type="button" data-date="${key}">
            <div class="calendar-day-top">
              <span class="calendar-day-number">${day.date.getDate()}</span>
              ${events.length ? `<span class="calendar-day-count">${events.length}</span>` : ""}
            </div>
            <div class="calendar-day-events">
              ${visibleEvents.map(event => `
                <span class="calendar-chip ${event.kind}${event.tentative ? " is-tentative" : ""}" title="${escapeHtml(getVideoDisplayTitle(event.video))}">
                  ${event.kind === "grabacion" ? "Grab" : "Pub"} · ${escapeHtml(getVideoDisplayTitle(event.video))}
                </span>
              `).join("")}
              ${extra > 0 ? `<span class="calendar-more">+${extra} más</span>` : ""}
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  els.grid.querySelectorAll("[data-date]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.date;
      const [year, month] = key.split("-").map(Number);
      state.selectedDate = key;
      state.viewYear = year;
      state.viewMonth = month - 1;
      render();
    });
  });

  renderDayPanel();
  renderAgenda(monthEvents);
}

function renderStats(monthEvents) {
  const uniqueVideos = new Set(monthEvents.map(event => event.video.id)).size;
  const grabaciones = monthEvents.filter(event => event.kind === "grabacion").length;
  const publicaciones = monthEvents.filter(event => event.kind === "publicacion").length;
  const tentativos = monthEvents.filter(event => event.tentative).length;

  els.stats.innerHTML = `
    <div class="stat"><div class="n">${monthEvents.length}</div><div class="l">Eventos del mes</div></div>
    <div class="stat"><div class="n">${uniqueVideos}</div><div class="l">Vídeos con actividad</div></div>
    <div class="stat"><div class="n">${grabaciones}</div><div class="l">Grabaciones</div></div>
    <div class="stat"><div class="n">${publicaciones}</div><div class="l">Publicaciones</div></div>
    <div class="stat"><div class="n">${tentativos}</div><div class="l">Fechas tentativas</div></div>
  `;
}

function renderDayPanel() {
  const selectedEvents = state.events.filter(event => event.date === state.selectedDate);
  const formattedDate = formatDateLong(state.selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  els.dayPanel.innerHTML = `
    <div class="calendar-side-header">
      <div>
        <h2>Detalle del día</h2>
        <p class="calendar-selected-date">${escapeHtml(formattedDate)}</p>
      </div>
      <span class="badge muted">${selectedEvents.length} evento${selectedEvents.length === 1 ? "" : "s"}</span>
    </div>
    ${selectedEvents.length ? `
      <div class="day-events">
        ${selectedEvents.map(event => dayEventHtml(event)).join("")}
      </div>
    ` : `
      <div class="empty-state">
        <strong>Sin eventos ese día</strong>
        Puedes navegar por el mes o seleccionar otra fecha.
      </div>
    `}
  `;
}

function dayEventHtml(event) {
  const video = event.video;
  const href = getStageHref(video);
  const title = escapeHtml(getVideoDisplayTitle(video));
  const tipo = TIPO_LABELS[video.tipoVideo] || "";
  const pipeline = PIPELINE_LABELS[video.estadoPipeline] || video.estadoPipeline || "";

  return `
    <article class="day-event">
      <div class="day-event-top">
        <div>
          <span class="badge ${event.kind === "grabacion" ? "green" : "pink"}">${escapeHtml(event.label)}</span>
        </div>
        ${event.tentative ? `<span class="badge muted">Tentativa</span>` : ""}
      </div>
      <h3 class="day-event-title">${title}</h3>
      <div class="day-event-meta">
        ${video.saga ? `<span>${escapeHtml(video.saga)}</span>` : ""}
        ${video.arco ? `<span>· ${escapeHtml(video.arco)}</span>` : ""}
        ${tipo ? `<span>· ${escapeHtml(tipo)}</span>` : ""}
        ${pipeline ? `<span>· ${escapeHtml(pipeline)}</span>` : ""}
      </div>
      ${video.tesisCentral ? `<p class="day-event-copy">${escapeHtml(video.tesisCentral)}</p>` : ""}
      <div class="day-event-actions">
        ${href ? `<a class="btn-secondary btn-sm" href="${href}">Abrir ficha</a>` : ""}
        ${video.youtubeUrl ? `<a class="btn-secondary btn-sm" href="${video.youtubeUrl}" target="_blank" rel="noopener">YouTube</a>` : ""}
      </div>
    </article>
  `;
}

function renderAgenda(monthEvents) {
  if (!monthEvents.length) {
    els.agenda.innerHTML = `
      <section class="card agenda-panel">
        <div class="agenda-header">
          <h2 class="agenda-title">Agenda del mes</h2>
        </div>
        <div class="empty-state">
          <strong>Sin actividad en este mes</strong>
          Cambia de mes o añade fechas desde roadmap, guiones o publicados.
        </div>
      </section>
    `;
    return;
  }

  els.agenda.innerHTML = `
    <section class="card agenda-panel">
      <div class="agenda-header">
        <h2 class="agenda-title">Agenda de ${MONTH_NAMES[state.viewMonth]} ${state.viewYear}</h2>
        <span class="badge muted">${monthEvents.length} evento${monthEvents.length === 1 ? "" : "s"}</span>
      </div>
      <div class="agenda-list">
        ${monthEvents.map(event => agendaItemHtml(event)).join("")}
      </div>
    </section>
  `;

  els.agenda.querySelectorAll("[data-select-date]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.selectDate;
      render();
    });
  });
}

function agendaItemHtml(event) {
  const video = event.video;
  const [year, month, day] = event.date.split("-").map(Number);
  const weekday = WEEKDAY_SHORT[new Date(year, month - 1, day).getDay()];
  const href = getStageHref(video);
  const title = escapeHtml(getVideoDisplayTitle(video));

  return `
    <article class="agenda-item">
      <button class="agenda-date btn-secondary btn-sm" type="button" data-select-date="${event.date}">
        <span class="agenda-day" style="color:${event.kind === "grabacion" ? "var(--green)" : "var(--pink)"}">${day}</span>
        <span class="agenda-weekday">${weekday}</span>
      </button>
      <div>
        <h3 class="agenda-item-title">${title}</h3>
        <div class="agenda-meta">
          <span class="badge ${event.kind === "grabacion" ? "green" : "pink"}">${escapeHtml(event.label)}</span>
          ${event.tentative ? `<span class="badge muted">Tentativa</span>` : ""}
          ${video.saga ? `<span>${escapeHtml(video.saga)}</span>` : ""}
          ${video.arco ? `<span>· ${escapeHtml(video.arco)}</span>` : ""}
        </div>
      </div>
      <div class="agenda-link-row">
        ${href ? `<a class="btn-secondary btn-sm" href="${href}">Abrir</a>` : ""}
      </div>
    </article>
  `;
}

function getMonthEvents() {
  const monthKey = `${state.viewYear}-${String(state.viewMonth + 1).padStart(2, "0")}`;
  return state.events.filter(event => event.date.startsWith(monthKey));
}

function buildEventMap(events) {
  const map = new Map();
  for (const event of events) {
    const bucket = map.get(event.date) || [];
    bucket.push(event);
    map.set(event.date, bucket);
  }
  return map;
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let offset = startPadding - 1; offset >= 0; offset -= 1) {
    days.push({ date: new Date(year, month, -offset), isCurrentMonth: false });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }

  let trailingDay = 1;
  while (days.length % 7 !== 0) {
    days.push({ date: new Date(year, month + 1, trailingDay), isCurrentMonth: false });
    trailingDay += 1;
  }

  return days;
}

function syncSelectedDate() {
  const monthKey = `${state.viewYear}-${String(state.viewMonth + 1).padStart(2, "0")}`;

  if (state.selectedDate.startsWith(monthKey)) {
    return;
  }

  const monthEvents = state.events.filter(event => event.date.startsWith(monthKey));
  state.selectedDate = monthEvents[0]?.date || `${monthKey}-01`;
}
