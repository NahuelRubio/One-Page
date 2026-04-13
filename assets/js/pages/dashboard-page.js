import { renderNav } from "../utils/nav.js";
import {
  escapeHtml,
  formatDateLong,
  formatTimestamp,
  toast,
  truncate
} from "../utils/helpers.js";
import {
  CALENDARIO_LABELS,
  GUION_LABELS,
  PIPELINE_LABELS,
  ROADMAP_LABELS,
  TIPO_LABELS
} from "../config/sagas.js";
import {
  filterByGuionEstado,
  filterByStage,
  getAllVideos,
  stageBadgeClass
} from "../services/videos.js";
import {
  buildCalendarEvents,
  getStageHref,
  getVideoDisplayTitle,
  getVideoPublicationDate,
  getYoutubeThumbnail
} from "../utils/video-meta.js";

renderNav();

const PRIORITY_WEIGHT = { Alta: 3, Media: 2, Baja: 1 };
const ROADMAP_WEIGHT = { priorizado: 3, guionizar: 2, pendiente: 1, aparcado: 0 };

const els = {
  badge: document.getElementById("connectionBadge"),
  focusRoot: document.getElementById("focusRoot"),
  summaryRoot: document.getElementById("summaryRoot"),
  ideasPreview: document.getElementById("ideasPreview"),
  roadmapPreview: document.getElementById("roadmapPreview"),
  scriptsPreview: document.getElementById("scriptsPreview"),
  datesPreview: document.getElementById("datesPreview"),
  activityRoot: document.getElementById("activityRoot"),
  alertsRoot: document.getElementById("alertsRoot"),
  publishedRoot: document.getElementById("publishedRoot"),
  nextScriptAction: document.getElementById("nextScriptAction"),
  heroMetricFocus: document.getElementById("heroMetricFocus"),
  heroMetricUrgent: document.getElementById("heroMetricUrgent"),
  heroMetricBlocked: document.getElementById("heroMetricBlocked"),
  heroMetricPublished: document.getElementById("heroMetricPublished")
};

loadDashboard();

async function loadDashboard() {
  try {
    const videos = await getAllVideos();
    const today = getTodayIso();
    const upcomingEvents = getUpcomingEvents(videos, today);
    const focus = pickNextFocus(videos, upcomingEvents, today);
    const alerts = buildAlerts(videos, today);
    const activity = buildRecentActivity(videos);
    const published = getRecentPublished(videos);

    renderHeroMetrics(focus, upcomingEvents, alerts, published);
    renderFocus(focus);
    renderSummary(videos, upcomingEvents);
    renderIdeas(filterByStage(videos, "idea"));
    renderRoadmap(filterByStage(videos, "roadmap"));
    renderScripts(filterByStage(videos, "guion"));
    renderDates(upcomingEvents);
    renderActivity(activity);
    renderAlerts(alerts);
    renderPublished(published);
    wireQuickAction(focus, videos);

    els.badge.textContent = "Firebase conectado";
    els.badge.className = "badge green";
  } catch (error) {
    console.error(error);
    els.badge.textContent = "Error de conexión";
    els.badge.className = "badge red";

    [
      els.focusRoot,
      els.summaryRoot,
      els.ideasPreview,
      els.roadmapPreview,
      els.scriptsPreview,
      els.datesPreview,
      els.activityRoot,
      els.alertsRoot,
      els.publishedRoot
    ].forEach(el => {
      el.innerHTML = `
        <div class="empty-state">
          <strong>No se pudieron cargar los datos</strong>
          Revisa la conexión con Firestore y vuelve a intentarlo.
        </div>
      `;
    });

    toast("No se pudieron cargar los datos del dashboard.", "danger");
  }
}

function renderHeroMetrics(focus, upcomingEvents, alerts, published) {
  els.heroMetricFocus.textContent = focus ? PIPELINE_LABELS[focus.video.estadoPipeline] || "Activo" : "Sin foco";
  els.heroMetricUrgent.textContent = String(upcomingEvents.filter(event => daysUntil(event.date) <= 7).length);
  els.heroMetricBlocked.textContent = String(alerts.length);
  els.heroMetricPublished.textContent = String(published.filter(video => daysSince(getVideoPublicationDate(video)) <= 30).length);
}

function renderFocus(focus) {
  if (!focus) {
    els.focusRoot.innerHTML = `
      <article class="card focus-card">
        <div>
          <div class="focus-kicker">Qué toca ahora</div>
          <h3 class="focus-title">No hay un foco claro todavía</h3>
          <p class="focus-subtitle">Empieza creando una idea o priorizando el roadmap para que el dashboard pueda proponerte el siguiente movimiento.</p>
        </div>
        <div class="focus-footer">
          <a class="btn-primary" href="ideas.html">Crear idea</a>
        </div>
      </article>
    `;
    return;
  }

  const { video, reason, actionLabel, href, urgencyText, urgencyTone } = focus;
  const stageLabel = PIPELINE_LABELS[video.estadoPipeline] || video.estadoPipeline;
  const substateLabel = getSubstateLabel(video);
  const thesis = video.tesisCentral ? truncate(video.tesisCentral, 180) : "Sin tesis central definida todavía.";

  els.focusRoot.innerHTML = `
    <article class="card focus-card">
      <div class="focus-head">
        <div>
          <div class="focus-kicker">${escapeHtml(reason)}</div>
          <h3 class="focus-title">${escapeHtml(getVideoDisplayTitle(video))}</h3>
          <p class="focus-subtitle">${escapeHtml(getSuggestedAction(video))}</p>
        </div>
        <div class="focus-meta">
          <span class="badge ${stageBadgeClass(video.estadoPipeline)}">${escapeHtml(stageLabel)}</span>
          ${substateLabel ? `<span class="badge muted">${escapeHtml(substateLabel)}</span>` : ""}
          ${video.prioridad ? `<span class="badge ${priorityClass(video.prioridad)}">${escapeHtml(video.prioridad)}</span>` : ""}
        </div>
      </div>

      <div class="focus-grid">
        <div class="focus-detail">
          <div class="focus-detail-label">Contexto editorial</div>
          <div class="focus-detail-value">${escapeHtml(composeContext(video))}</div>
        </div>
        <div class="focus-detail">
          <div class="focus-detail-label">Tesis</div>
          <div class="focus-detail-value">${escapeHtml(thesis)}</div>
        </div>
        <div class="focus-detail">
          <div class="focus-detail-label">Siguiente acción sugerida</div>
          <div class="focus-detail-value">${escapeHtml(getSuggestedAction(video))}</div>
        </div>
        <div class="focus-detail">
          <div class="focus-detail-label">Estado de fechas</div>
          <div class="focus-detail-value">${escapeHtml(describeDates(video))}</div>
        </div>
      </div>

      <div class="focus-footer">
        <div class="focus-urgency">
          ${urgencyText ? `<span class="badge ${urgencyTone}">${escapeHtml(urgencyText)}</span>` : ""}
          <span>${escapeHtml(describeLastTouch(video))}</span>
        </div>
        <a class="btn-primary" href="${escapeHtml(href)}"${isExternalUrl(href) ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(actionLabel)}</a>
      </div>
    </article>
  `;
}

function renderSummary(videos, upcomingEvents) {
  const activeVideos = videos.filter(video => ["roadmap", "guion", "calendario"].includes(video.estadoPipeline));
  const scriptsInProgress = filterByGuionEstado(videos, "en_progreso");
  const upcomingRecordings = upcomingEvents.filter(event => event.kind === "grabacion");
  const upcomingPublications = upcomingEvents.filter(event => event.kind === "publicacion");

  const cards = [
    {
      value: activeVideos.length,
      label: "Vídeos activos",
      note: activeVideos.length ? `${activeVideos.slice(0, 2).map(video => getVideoDisplayTitle(video)).join(" · ")}` : "No hay piezas activas fuera de ideas o publicados."
    },
    {
      value: scriptsInProgress.length,
      label: "Guiones en progreso",
      note: scriptsInProgress.length ? `${scriptsInProgress.slice(0, 2).map(video => getVideoDisplayTitle(video)).join(" · ")}` : "No hay ningún guion en escritura ahora mismo."
    },
    {
      value: upcomingRecordings.length,
      label: "Próximas grabaciones",
      note: upcomingRecordings[0] ? `${formatDateLong(upcomingRecordings[0].date)} · ${getVideoDisplayTitle(upcomingRecordings[0].video)}` : "No hay grabaciones próximas definidas."
    },
    {
      value: upcomingPublications.length,
      label: "Próximas publicaciones",
      note: upcomingPublications[0] ? `${formatDateLong(upcomingPublications[0].date)} · ${getVideoDisplayTitle(upcomingPublications[0].video)}` : "No hay publicaciones próximas definidas."
    }
  ];

  els.summaryRoot.innerHTML = cards.map(card => `
    <article class="card summary-card">
      <div class="summary-value">${card.value}</div>
      <div class="summary-label">${escapeHtml(card.label)}</div>
      <div class="summary-note">${escapeHtml(card.note)}</div>
    </article>
  `).join("");
}

function renderIdeas(ideas) {
  const recentIdeas = [...ideas]
    .sort((a, b) => compareRecentDates(a.updatedAt || a.createdAt, b.updatedAt || b.createdAt))
    .slice(0, 3);

  if (!recentIdeas.length) {
    els.ideasPreview.innerHTML = emptyBlock("Sin ideas recientes", "Crea nuevas ideas para alimentar el pipeline editorial.");
    return;
  }

  els.ideasPreview.innerHTML = `
    <div class="mini-list">
      ${recentIdeas.map(video => `
        <article class="mini-item">
          <div class="mini-item-top">
            <h4 class="mini-item-title">${escapeHtml(getVideoDisplayTitle(video))}</h4>
            <span class="badge ${priorityClass(video.prioridad)}">${escapeHtml(video.prioridad || "Media")}</span>
          </div>
          <div class="mini-item-tags">
            ${video.saga ? `<span class="tag">${escapeHtml(video.saga)}</span>` : ""}
            ${video.arco ? `<span class="tag">${escapeHtml(video.arco)}</span>` : ""}
            ${video.tipoVideo ? `<span class="tag">${escapeHtml(TIPO_LABELS[video.tipoVideo] || video.tipoVideo)}</span>` : ""}
          </div>
          <p class="mini-item-copy">${escapeHtml(describeRecent(video.updatedAt || video.createdAt))}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderRoadmap(roadmapVideos) {
  const items = [...roadmapVideos]
    .sort(compareRoadmap)
    .slice(0, 4);

  if (!items.length) {
    els.roadmapPreview.innerHTML = emptyBlock("Roadmap vacío", "Prioriza algunas piezas para ver aquí lo más importante.");
    return;
  }

  els.roadmapPreview.innerHTML = `
    <div class="mini-list">
      ${items.map(video => `
        <article class="mini-item">
          <div class="mini-item-top">
            <h4 class="mini-item-title">${escapeHtml(getVideoDisplayTitle(video))}</h4>
            <div class="mini-item-meta">
              <span class="badge muted">${escapeHtml(ROADMAP_LABELS[video.roadmapEstado] || "Pendiente")}</span>
              <span class="badge ${priorityClass(video.prioridad)}">${escapeHtml(video.prioridad || "Media")}</span>
            </div>
          </div>
          ${video.tesisCentral ? `<p class="mini-item-copy">${escapeHtml(truncate(video.tesisCentral, 110))}</p>` : `<p class="mini-item-copy">Sin tesis central definida.</p>`}
          <div class="mini-item-tags">
            ${video.fechaGrabacionTentativa ? `<span class="tag">Grab: ${escapeHtml(formatDateLong(video.fechaGrabacionTentativa))}</span>` : ""}
            ${video.fechaPublicacionTentativa ? `<span class="tag">Pub: ${escapeHtml(formatDateLong(video.fechaPublicacionTentativa))}</span>` : ""}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderScripts(scriptVideos) {
  const groups = {
    en_progreso: filterByGuionEstado(scriptVideos, "en_progreso"),
    listo: filterByGuionEstado(scriptVideos, "listo"),
    sin_empezar: filterByGuionEstado(scriptVideos, "sin_empezar")
  };

  els.scriptsPreview.innerHTML = `
    <div class="guion-glance-stats">
      ${Object.entries(groups).map(([key, list]) => `
        <div class="guion-glance-stat">
          <div class="n">${list.length}</div>
          <div class="l">${escapeHtml(GUION_LABELS[key] || key)}</div>
        </div>
      `).join("")}
    </div>
    <div class="guion-column-list">
      ${Object.entries(groups).map(([key, list]) => `
        <section class="guion-column">
          <div class="guion-column-head">
            <h4>${escapeHtml(GUION_LABELS[key] || key)}</h4>
            <span class="badge ${guionTone(key)}">${list.length}</span>
          </div>
          <div class="guion-title-list">
            ${list.length
              ? list
                .slice()
                .sort(compareScriptFocus)
                .slice(0, 3)
                .map(video => `<a href="guion.html?id=${encodeURIComponent(video.id)}">${escapeHtml(getVideoDisplayTitle(video))}</a>`)
                .join("")
              : `<span class="soft-link">Sin elementos en esta columna.</span>`}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function renderDates(upcomingEvents) {
  const events = upcomingEvents.slice(0, 5);

  if (!events.length) {
    els.datesPreview.innerHTML = emptyBlock("Agenda despejada", "Añade fechas de grabación o publicación para ver la mini agenda aquí.");
    return;
  }

  els.datesPreview.innerHTML = `
    <div class="agenda-list-mini">
      ${events.map(event => `
        <article class="agenda-item-mini">
          <div class="agenda-item-date">
            <strong>${escapeHtml(formatDateLong(event.date, { day: "numeric", month: "short" }))}</strong>
            <span>${escapeHtml(relativeDayLabel(event.date))}</span>
          </div>
          <div class="agenda-item-main">
            <div class="mini-item-meta">
              <span class="badge ${event.kind === "grabacion" ? "green" : "pink"}">${escapeHtml(event.label)}</span>
              ${event.tentative ? `<span class="badge muted">Tentativa</span>` : ""}
            </div>
            <h4>${escapeHtml(getVideoDisplayTitle(event.video))}</h4>
            <p>${escapeHtml(composeContext(event.video))}</p>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderActivity(activity) {
  if (!activity.length) {
    els.activityRoot.innerHTML = emptyBlock("Sin actividad reciente", "Cuando edites guiones, muevas estados o publiques, aparecerá aquí.");
    return;
  }

  els.activityRoot.innerHTML = `
    <div class="activity-list">
      ${activity.slice(0, 5).map(item => `
        <article class="activity-item">
          <div class="activity-item-top">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="badge muted">${escapeHtml(item.when)}</span>
          </div>
          <p>${escapeHtml(item.copy)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAlerts(alerts) {
  if (!alerts.length) {
    els.alertsRoot.innerHTML = `
      <div class="empty-state">
        <strong>Sin alertas detectadas</strong>
        No he encontrado bloqueos obvios en ideas, roadmap, guiones o publicados.
      </div>
    `;
    return;
  }

  els.alertsRoot.innerHTML = `
    <div class="alerts-list">
      ${alerts.slice(0, 5).map(alert => `
        <article class="alert-item ${alert.tone}">
          <div class="alert-item-top">
            <h3>${escapeHtml(alert.title)}</h3>
            <span class="badge ${alert.tone === "danger" ? "red" : "yellow"}">${escapeHtml(alert.label)}</span>
          </div>
          <p>${escapeHtml(alert.copy)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderPublished(publishedVideos) {
  if (!publishedVideos.length) {
    els.publishedRoot.innerHTML = emptyBlock("Sin publicados todavía", "Cuando un vídeo llegue a publicado, aparecerá aquí con miniatura y acceso directo.");
    return;
  }

  els.publishedRoot.innerHTML = `
    <div class="published-mini-grid">
      ${publishedVideos.slice(0, 3).map(video => {
        const thumb = getYoutubeThumbnail(video);
        const title = escapeHtml(getVideoDisplayTitle(video));
        const publishedDate = getVideoPublicationDate(video);
        return `
          <article class="card published-mini-card">
            <div class="published-mini-thumb">
              ${thumb
                ? `<img src="${thumb}" alt="${title}" loading="lazy">`
                : `
                  <div class="published-mini-fallback">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                    <span>${title}</span>
                  </div>
                `}
            </div>
            <div class="published-mini-body">
              <div class="mini-item-meta">
                <span class="badge pink">Publicado</span>
                ${video.saga ? `<span class="badge muted">${escapeHtml(video.saga)}</span>` : ""}
              </div>
              <h3>${title}</h3>
              <div class="published-mini-meta">${publishedDate ? escapeHtml(formatDateLong(publishedDate)) : "Fecha pendiente"}</div>
              <div class="actions">
                ${video.youtubeUrl ? `<a class="btn-primary btn-sm" href="${escapeHtml(video.youtubeUrl)}" target="_blank" rel="noopener">Abrir vídeo</a>` : `<a class="btn-secondary btn-sm" href="publicados.html">Completar ficha</a>`}
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function wireQuickAction(focus, videos) {
  const nextScript = pickNextScriptCandidate(focus?.video, videos);
  if (nextScript) {
    els.nextScriptAction.href = `guion.html?id=${encodeURIComponent(nextScript.id)}`;
    return;
  }

  els.nextScriptAction.href = "guiones.html";
}

function pickNextFocus(videos, upcomingEvents) {
  const urgentEvent = upcomingEvents.find(event => daysUntil(event.date) <= 7);
  const scriptsInProgress = filterByGuionEstado(videos, "en_progreso").sort(compareScriptFocus);

  if (scriptsInProgress.length) {
    const video = scriptsInProgress[0];
    return buildFocus(video, "Guion activo", urgentEvent);
  }

  const roadmap = filterByStage(videos, "roadmap").sort(compareRoadmap);
  if (roadmap.length) {
    return buildFocus(roadmap[0], "Roadmap prioritario", urgentEvent);
  }

  const highIdeas = filterByStage(videos, "idea")
    .filter(video => (video.prioridad || "Media") === "Alta")
    .sort((a, b) => compareRecentDates(a.updatedAt || a.createdAt, b.updatedAt || b.createdAt));

  if (highIdeas.length) {
    return buildFocus(highIdeas[0], "Idea reciente con prioridad alta", urgentEvent);
  }

  const nextEvent = upcomingEvents[0];
  if (nextEvent) {
    return buildFocus(nextEvent.video, nextEvent.kind === "grabacion" ? "Grabación cercana" : "Publicación cercana", nextEvent);
  }

  const fallback = [...videos].sort((a, b) => compareRecentDates(a.updatedAt || a.createdAt, b.updatedAt || b.createdAt))[0];
  return fallback ? buildFocus(fallback, "Último elemento activo", null) : null;
}

function buildFocus(video, reason, urgentEvent) {
  return {
    video,
    reason,
    href: resolveHref(video),
    actionLabel: actionLabelFor(video),
    urgencyText: getUrgencyText(video, urgentEvent),
    urgencyTone: getUrgencyTone(video, urgentEvent)
  };
}

function buildRecentActivity(videos) {
  const items = [];

  videos.forEach(video => {
    if (video.fechaPublicacionReal) {
      items.push({
        ts: getComparableDate(video.fechaPublicacionReal),
        title: `Publicado: ${getVideoDisplayTitle(video)}`,
        copy: `El vídeo ya figura como publicado${video.youtubeUrl ? " y tiene enlace de YouTube" : " pero aún le falta URL pública"}.`,
        when: relativeDayLabel(video.fechaPublicacionReal)
      });
    }

    if (video.guionUltimaEdicion) {
      items.push({
        ts: getComparableDate(video.guionUltimaEdicion),
        title: `Guion editado: ${getVideoDisplayTitle(video)}`,
        copy: `Última edición detectada en el guion${video.guionEstado ? ` · ${GUION_LABELS[video.guionEstado] || video.guionEstado}` : ""}.`,
        when: describeRecent(video.guionUltimaEdicion)
      });
    }

    if (video.updatedAt) {
      items.push({
        ts: getComparableDate(video.updatedAt),
        title: `Última actualización: ${getVideoDisplayTitle(video)}`,
        copy: `Estado actual: ${PIPELINE_LABELS[video.estadoPipeline] || video.estadoPipeline}${getSubstateLabel(video) ? ` · ${getSubstateLabel(video)}` : ""}.`,
        when: describeRecent(video.updatedAt)
      });
    }

    if (video.createdAt) {
      items.push({
        ts: getComparableDate(video.createdAt),
        title: `Vídeo creado: ${getVideoDisplayTitle(video)}`,
        copy: `Entró en el sistema como ${PIPELINE_LABELS[video.estadoPipeline] || video.estadoPipeline}.`,
        when: describeRecent(video.createdAt)
      });
    }
  });

  return items
    .filter(item => Number.isFinite(item.ts))
    .sort((a, b) => b.ts - a.ts)
    .filter((item, index, list) => index === list.findIndex(other => other.title === item.title && other.when === item.when));
}

function buildAlerts(videos, today) {
  const alerts = [];
  const ideas = filterByStage(videos, "idea");
  const roadmap = filterByStage(videos, "roadmap");
  const scripts = filterByStage(videos, "guion");
  const published = filterByStage(videos, "publicado");

  const staleIdeas = ideas.filter(video => daysSince(video.updatedAt || video.createdAt) > 21);
  if (staleIdeas.length) {
    alerts.push({
      tone: "warn",
      label: "Ideas",
      title: `${staleIdeas.length} idea${staleIdeas.length === 1 ? "" : "s"} sin revisar`,
      copy: `${getVideoDisplayTitle(staleIdeas[0])} lleva ${daysSince(staleIdeas[0].updatedAt || staleIdeas[0].createdAt)} días sin movimiento.`
    });
  }

  const roadmapWithoutThesis = roadmap.filter(video => !video.tesisCentral?.trim());
  if (roadmapWithoutThesis.length) {
    alerts.push({
      tone: "warn",
      label: "Roadmap",
      title: `${roadmapWithoutThesis.length} pieza${roadmapWithoutThesis.length === 1 ? "" : "s"} sin tesis central`,
      copy: `${getVideoDisplayTitle(roadmapWithoutThesis[0])} está en roadmap sin una tesis editorial clara.`
    });
  }

  const emptyScripts = scripts.filter(video => !video.guionMarkdown?.trim() && !video.guionNotas?.trim());
  if (emptyScripts.length) {
    alerts.push({
      tone: "danger",
      label: "Guiones",
      title: `${emptyScripts.length} guion${emptyScripts.length === 1 ? "" : "es"} vacío${emptyScripts.length === 1 ? "" : "s"}`,
      copy: `${getVideoDisplayTitle(emptyScripts[0])} sigue sin contenido escrito pese a estar en fase de guion.`
    });
  }

  const scheduledWithoutReadyScript = videos.filter(video => {
    const hasUpcomingPublication =
      (video.fechaPublicacion && video.fechaPublicacion >= today) ||
      (video.fechaPublicacionTentativa && video.fechaPublicacionTentativa >= today);
    const scriptReady = video.guionEstado === "listo" || Boolean(video.guionMarkdown?.trim());
    return hasUpcomingPublication && !scriptReady;
  });
  if (scheduledWithoutReadyScript.length) {
    alerts.push({
      tone: "danger",
      label: "Calendario",
      title: `${scheduledWithoutReadyScript.length} publicación${scheduledWithoutReadyScript.length === 1 ? "" : "es"} sin guion listo`,
      copy: `${getVideoDisplayTitle(scheduledWithoutReadyScript[0])} tiene fecha pero todavía no llega con el guion cerrado.`
    });
  }

  const publishedWithoutUrl = published.filter(video => !video.youtubeUrl?.trim());
  if (publishedWithoutUrl.length) {
    alerts.push({
      tone: "warn",
      label: "Publicados",
      title: `${publishedWithoutUrl.length} publicado${publishedWithoutUrl.length === 1 ? "" : "s"} sin URL`,
      copy: `${getVideoDisplayTitle(publishedWithoutUrl[0])} aparece como publicado pero no tiene enlace de YouTube.`
    });
  }

  const stalled = videos.filter(video => video.estadoPipeline !== "publicado" && daysSince(video.updatedAt || video.createdAt) > 45);
  if (stalled.length) {
    alerts.push({
      tone: "warn",
      label: "Atasco",
      title: `${stalled.length} elemento${stalled.length === 1 ? "" : "s"} atascado${stalled.length === 1 ? "" : "s"}`,
      copy: `${getVideoDisplayTitle(stalled[0])} no registra cambios desde hace más de ${daysSince(stalled[0].updatedAt || stalled[0].createdAt)} días.`
    });
  }

  return alerts;
}

function getRecentPublished(videos) {
  return filterByStage(videos, "publicado")
    .sort((a, b) => compareRecentDates(getVideoPublicationDate(a) || a.updatedAt || a.createdAt, getVideoPublicationDate(b) || b.updatedAt || b.createdAt));
}

function getUpcomingEvents(videos, today) {
  return videos
    .flatMap(video => buildCalendarEvents(video))
    .filter(event => event.date && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

function compareRoadmap(a, b) {
  const roadmapWeight = (ROADMAP_WEIGHT[b.roadmapEstado] || 0) - (ROADMAP_WEIGHT[a.roadmapEstado] || 0);
  if (roadmapWeight !== 0) return roadmapWeight;

  const priorityWeight = (PRIORITY_WEIGHT[b.prioridad] || 0) - (PRIORITY_WEIGHT[a.prioridad] || 0);
  if (priorityWeight !== 0) return priorityWeight;

  const dateWeight = compareUpcomingDates(a.fechaPublicacionTentativa || a.fechaGrabacionTentativa || "", b.fechaPublicacionTentativa || b.fechaGrabacionTentativa || "");
  if (dateWeight !== 0) return dateWeight;

  return (a.roadmapOrden || 9999) - (b.roadmapOrden || 9999);
}

function compareScriptFocus(a, b) {
  const nextDateWeight = compareUpcomingDates(
    a.fechaGrabacion || a.fechaPublicacion || a.fechaGrabacionTentativa || a.fechaPublicacionTentativa || "",
    b.fechaGrabacion || b.fechaPublicacion || b.fechaGrabacionTentativa || b.fechaPublicacionTentativa || ""
  );
  if (nextDateWeight !== 0) return nextDateWeight;

  const priorityWeight = (PRIORITY_WEIGHT[b.prioridad] || 0) - (PRIORITY_WEIGHT[a.prioridad] || 0);
  if (priorityWeight !== 0) return priorityWeight;

  return compareRecentDates(a.guionUltimaEdicion || a.updatedAt || a.createdAt, b.guionUltimaEdicion || b.updatedAt || b.createdAt);
}

function resolveHref(video) {
  if (video.estadoPipeline === "publicado" && video.youtubeUrl) return video.youtubeUrl;
  return getStageHref(video) || "index.html";
}

function actionLabelFor(video) {
  if (video.estadoPipeline === "guion") return "Abrir guion";
  if (video.estadoPipeline === "calendario") return video.youtubeUrl ? "Ver vídeo publicado" : "Programar";
  if (video.estadoPipeline === "roadmap") return "Ver roadmap";
  if (video.estadoPipeline === "idea") return "Abrir idea";
  if (video.estadoPipeline === "publicado") return video.youtubeUrl ? "Ver vídeo publicado" : "Ver publicados";
  return "Abrir";
}

function composeContext(video) {
  return [
    video.saga,
    video.arco,
    TIPO_LABELS[video.tipoVideo] || ""
  ].filter(Boolean).join(" · ") || "Sin saga, arco ni tipo definidos.";
}

function describeDates(video) {
  if (video.fechaPublicacionReal) return `Publicado el ${formatDateLong(video.fechaPublicacionReal)}.`;
  if (video.fechaPublicacion) return `Publicación prevista el ${formatDateLong(video.fechaPublicacion)}.`;
  if (video.fechaPublicacionTentativa) return `Publicación tentativa el ${formatDateLong(video.fechaPublicacionTentativa)}.`;
  if (video.fechaGrabacion) return `Grabación prevista el ${formatDateLong(video.fechaGrabacion)}.`;
  if (video.fechaGrabacionTentativa) return `Grabación tentativa el ${formatDateLong(video.fechaGrabacionTentativa)}.`;
  return "Sin fechas asociadas todavía.";
}

function describeLastTouch(video) {
  const ts = video.guionUltimaEdicion || video.updatedAt || video.createdAt;
  return `Último movimiento: ${describeRecent(ts)}`;
}

function getSubstateLabel(video) {
  if (video.estadoPipeline === "roadmap") return ROADMAP_LABELS[video.roadmapEstado] || "";
  if (video.estadoPipeline === "guion") return GUION_LABELS[video.guionEstado] || "";
  if (video.estadoPipeline === "calendario") return CALENDARIO_LABELS[video.calendarEstado] || "";
  return "";
}

function getSuggestedAction(video) {
  if (video.estadoPipeline === "guion") {
    if (video.guionEstado === "en_progreso") return "Cerrar la estructura, rematar el markdown y dejar el guion listo para producir.";
    if (video.guionEstado === "listo") return "Revisar el guion final y empujarlo a grabación o programación.";
    return "Abrir el guion y empezar la primera versión.";
  }

  if (video.estadoPipeline === "roadmap") {
    if (!video.tesisCentral?.trim()) return "Definir la tesis central antes de mover esta pieza a guion.";
    if (video.roadmapEstado === "priorizado") return "Convertir esta prioridad en guion y fijar siguiente fecha.";
    return "Revisar prioridad y concretar siguiente paso editorial.";
  }

  if (video.estadoPipeline === "idea") {
    return "Validar si la idea merece pasar a roadmap y concretar su tesis.";
  }

  if (video.estadoPipeline === "calendario") {
    if (video.calendarEstado === "grabado") return "Programar la publicación y dejar cerrada la ficha final.";
    if (video.calendarEstado === "programado") return "Verificar miniatura, URL y copy antes de la salida.";
    return "Asegurar fecha, checklist de grabación y siguiente entrega.";
  }

  return "Revisar el elemento y decidir el siguiente movimiento.";
}

function getUrgencyText(video, urgentEvent) {
  const nextDate = video.fechaGrabacion || video.fechaPublicacion || video.fechaGrabacionTentativa || video.fechaPublicacionTentativa;
  if (nextDate) {
    const remaining = daysUntil(nextDate);
    if (remaining < 0) return "Fecha vencida";
    if (remaining === 0) return "Hoy";
    if (remaining <= 7) return `${remaining} día${remaining === 1 ? "" : "s"} para el hito`;
  }

  if (urgentEvent) {
    const remaining = daysUntil(urgentEvent.date);
    return remaining <= 0 ? "Hito inmediato" : `Próximo hito en ${remaining} día${remaining === 1 ? "" : "s"}`;
  }

  return "";
}

function getUrgencyTone(video, urgentEvent) {
  const nextDate = video.fechaGrabacion || video.fechaPublicacion || video.fechaGrabacionTentativa || video.fechaPublicacionTentativa;
  const days = nextDate ? daysUntil(nextDate) : urgentEvent ? daysUntil(urgentEvent.date) : 999;
  if (days <= 2) return "red";
  if (days <= 7) return "yellow";
  return "muted";
}

function pickNextScriptCandidate(focusVideo, videos = []) {
  if (focusVideo && (focusVideo.estadoPipeline === "guion" || focusVideo.estadoPipeline === "calendario")) {
    return focusVideo;
  }

  const candidates = videos
    .filter(video => video.estadoPipeline === "guion" || video.estadoPipeline === "calendario")
    .sort(compareScriptFocus);

  return candidates[0] || null;
}

function priorityClass(priority) {
  const value = String(priority || "Media").toLowerCase();
  return value === "alta" ? "alta" : value === "baja" ? "baja" : "media";
}

function guionTone(state) {
  if (state === "listo") return "green";
  if (state === "en_progreso") return "yellow";
  return "muted";
}

function emptyBlock(title, copy) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      ${escapeHtml(copy)}
    </div>
  `;
}

function getComparableDate(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    return parsed.getTime();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
}

function compareRecentDates(a, b) {
  const aTime = getComparableDate(a);
  const bTime = getComparableDate(b);

  if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
  if (!Number.isFinite(aTime)) return 1;
  if (!Number.isFinite(bTime)) return -1;
  return bTime - aTime;
}

function compareUpcomingDates(a, b) {
  const aTime = getComparableDate(a);
  const bTime = getComparableDate(b);

  if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
  if (!Number.isFinite(aTime)) return 1;
  if (!Number.isFinite(bTime)) return -1;
  return aTime - bTime;
}

function getTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysUntil(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const target = getComparableDate(value);
  const today = getComparableDate(getTodayIso());
  return Math.floor((target - today) / 86400000);
}

function daysSince(value) {
  if (!value) return 999;
  const target = getComparableDate(value);
  const today = getComparableDate(getTodayIso());
  return Math.max(0, Math.floor((today - target) / 86400000));
}

function describeRecent(value) {
  const days = daysSince(value);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return formatTimestamp(value);
}

function relativeDayLabel(value) {
  const days = daysUntil(value);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days > 1) return `En ${days} días`;
  if (days === -1) return "Ayer";
  return `Hace ${Math.abs(days)} días`;
}

function isExternalUrl(value = "") {
  return /^https?:\/\//i.test(value);
}
