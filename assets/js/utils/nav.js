/**
 * nav.js — Navegación: renderización del nav global e helpers de routing.
 */

// ── Definición de páginas ────────────────────────────────────────────────────

const PAGES = [
  {
    href: "index.html",
    label: "Dashboard",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>`
  },
  {
    href: "ideas.html",
    label: "Ideas",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.56-1.38 4.8-3.44 6.02L15 17H9l-.56-1.98A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
    </svg>`
  },
  {
    href: "roadmap.html",
    label: "Roadmap",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="8"    y1="6"  x2="21" y2="6"/>
      <line x1="8"    y1="12" x2="21" y2="12"/>
      <line x1="8"    y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6"  r="1" fill="currentColor"/>
      <circle cx="3" cy="12" r="1" fill="currentColor"/>
      <circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>`
  },
  {
    href: "guiones.html",
    label: "Guiones",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>`
  },
  {
    href: "calendario.html",
    label: "Calendario",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>`
  },
  {
    href: "publicados.html",
    label: "Publicados",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>`
  }
];

// ── Render ───────────────────────────────────────────────────────────────────

/**
 * Inyecta el <nav> global como primer hijo de <body>.
 * Llama a esta función antes de cualquier otra lógica en cada página.
 */
export function renderNav() {
  const current = _currentPage();

  const nav = document.createElement("nav");
  nav.className = "app-nav";
  nav.innerHTML = `
    <a href="index.html" class="nav-brand">One<span>Piece</span></a>
    <div class="nav-links">
      ${PAGES.map(p => `
        <a href="${p.href}" class="nav-link${p.href === current ? " active" : ""}">
          ${p.icon}
          ${p.label}
        </a>
      `).join("")}
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Obtiene el nombre del archivo de la página actual (ej: "ideas.html") */
function _currentPage() {
  const parts = window.location.pathname.split("/");
  const file  = parts[parts.length - 1];
  // En la raíz sin nombre de archivo devuelve "index.html"
  return file && file.includes(".") ? file : "index.html";
}

/**
 * Navega a otra página con query params opcionales.
 * Compatible con GitHub Pages (rutas relativas simples).
 *
 * @param {string} page   — ej: "guion.html"
 * @param {Object} params — ej: { id: "abc123" }
 */
export function navigate(page, params = {}) {
  const url = new URL(page, window.location.href);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  window.location.href = url.toString();
}
