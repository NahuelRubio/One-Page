import { CALENDARIO_LABELS, PIPELINE_LABELS, TIPO_LABELS } from "../config/sagas.js";

export function getVideoDisplayTitle(video) {
  return video?.tituloPublicado || video?.titulo || "Sin título";
}

export function getVideoPublicationDate(video) {
  return video?.fechaPublicacionReal || video?.fechaPublicacion || video?.fechaPublicacionTentativa || "";
}

export function getYoutubeId(url = "") {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\/+/, "").split("/")[0] || null;
    }

    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const embedIndex = pathParts.findIndex(part => part === "embed" || part === "shorts");
    if (embedIndex !== -1) {
      return pathParts[embedIndex + 1] || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getYoutubeThumbnail(video) {
  if (video?.thumbnailUrl) return video.thumbnailUrl;
  const youtubeId = getYoutubeId(video?.youtubeUrl || "");
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "";
}

export function getStageHref(video) {
  if (!video?.id) return "";

  if (video.estadoPipeline === "guion" || video.estadoPipeline === "calendario") {
    return `guion.html?id=${video.id}`;
  }

  if (video.estadoPipeline === "publicado") {
    return "publicados.html";
  }

  if (video.estadoPipeline === "roadmap") {
    return "roadmap.html";
  }

  if (video.estadoPipeline === "idea") {
    return "ideas.html";
  }

  return "";
}

export function buildCalendarEvents(video) {
  const events = [];

  if (video?.fechaGrabacion) {
    events.push({
      video,
      date: video.fechaGrabacion,
      kind: "grabacion",
      label: "Grabación",
      tentative: false
    });
  } else if (video?.fechaGrabacionTentativa) {
    events.push({
      video,
      date: video.fechaGrabacionTentativa,
      kind: "grabacion",
      label: "Grabación tentativa",
      tentative: true
    });
  }

  if (video?.fechaPublicacionReal) {
    events.push({
      video,
      date: video.fechaPublicacionReal,
      kind: "publicacion",
      label: "Publicado",
      tentative: false
    });
  } else if (video?.fechaPublicacion) {
    events.push({
      video,
      date: video.fechaPublicacion,
      kind: "publicacion",
      label: "Publicación",
      tentative: false
    });
  } else if (video?.fechaPublicacionTentativa) {
    events.push({
      video,
      date: video.fechaPublicacionTentativa,
      kind: "publicacion",
      label: "Publicación tentativa",
      tentative: true
    });
  }

  return events;
}

export function getVideoMetaSummary(video) {
  return [
    video?.saga || "",
    video?.arco || "",
    TIPO_LABELS[video?.tipoVideo] || "",
    PIPELINE_LABELS[video?.estadoPipeline] || "",
    CALENDARIO_LABELS[video?.calendarEstado] || ""
  ].filter(Boolean);
}
