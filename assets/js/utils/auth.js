/**
 * auth.js — Protección de páginas privadas.
 * Importar en cada página que requiera autenticación.
 * Si no hay sesión activa, redirige a login.html.
 */

export function requireAuth() {
  if (!sessionStorage.getItem("auth_user")) {
    window.location.replace("login.html");
  }
}

export function logout() {
  sessionStorage.removeItem("auth_user");
  window.location.href = "login.html";
}
