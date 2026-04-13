/**
 * plantillas.js — Sistema de plantillas por tipo de vídeo y prompt base del canal.
 *
 * Exporta:
 *   PROMPT_BASE       — string con el prompt completo y placeholders {{...}}
 *   PLANTILLAS        — objeto con plantilla markdown por tipoVideo
 *   getTemplate(video)— devuelve la plantilla rellenada con los datos del vídeo
 *   buildPrompt(video)— devuelve el prompt rellenado con los datos del vídeo
 */

import { TIPO_LABELS } from "./sagas.js";

// ── Prompt base del canal ────────────────────────────────────────────────────
// Los placeholders {{CAMPO}} se sustituyen en buildPrompt(video).

export const PROMPT_BASE = `Quiero que actúes como guionista experto en YouTube, especializado en análisis de anime, con un estilo similar a vídeos de reflexión narrativa y emocional al estilo guille kut.

Estoy creando un canal sobre One Piece con un enfoque claro:
- recorrer la historia desde el principio (arco por arco)
- intercalar vídeos de personajes entre arcos
- conectar siempre el pasado con el presente de la obra
- evitar resúmenes y centrarme en ideas, significado y narrativa

IMPORTANTE:
Cada vídeo debe centrarse en UNA sola idea fuerte (tesis).
NO quiero resúmenes de la historia.
NO quiero contar todo el arco o personaje.
QUIERO profundidad, no cantidad.

ESTILO DEL GUION:
- tono cercano, natural, como si se lo contaras a alguien
- frases cortas, fáciles de decir en voz alta
- ritmo dinámico (sin párrafos largos)
- uso de contraste, emoción y reflexión
- que el espectador sienta que está entendiendo algo nuevo

ESTRUCTURA OBLIGATORIA:

1. GANCHO INICIAL (hook)
- 2-4 frases muy potentes
- generar curiosidad o reencuadre
- hacer que el espectador quiera quedarse

2. CONTEXTO RÁPIDO
- situar al espectador sin hacer resumen largo

3. TESIS
- explicar claramente la idea principal del vídeo

4. DESARROLLO (3 bloques)
- cada bloque aporta una parte de la idea
- usar ejemplos concretos (escenas, decisiones, momentos)
- añadir reflexión, no solo descripción

5. CIERRE
- reforzar la idea principal
- dejar una sensación fuerte (emocional o reflexiva)

REGLAS CLAVE:
- no repetir información innecesaria
- no explicar toda la historia
- no sonar académico ni técnico
- priorizar lo que hace sentir y pensar al espectador
- cada parte debe aportar algo

CONTEXTO DEL CANAL:
Estoy en el arco: {{ARCO}}
El vídeo es de tipo: {{TIPO}}
El título del vídeo es: {{TITULO}}

La idea central que quiero defender es:
{{TESIS}}`;

// ── Plantillas por tipo de vídeo ─────────────────────────────────────────────
// Cada plantilla es un string markdown con placeholders {{CAMPO}}.

export const PLANTILLAS = {

  // ── Arco ──────────────────────────────────────────────
  arco: `# GANCHO INICIAL

[2-4 frases que reencuadren el arco de forma inesperada.
No describas el arco: reencuadra la idea que vas a defender.]

---

# CONTEXTO RÁPIDO

[Dónde estamos en la historia. Brevísimo — no más de 3-4 frases.
Solo lo necesario para que el espectador entienda el punto de partida.]

---

# TESIS

**La idea que voy a defender:**
{{TESIS}}

---

# DESARROLLO

## El momento que define el arco

[El punto de inflexión clave. La escena o decisión que lo cambia todo.
No lo resumas: explica qué significa, qué dice de los personajes o la historia.]

## Lo que parece vs. lo que es

[El contraste entre la superficie y la capa narrativa profunda.
¿Qué nos hace creer Oda? ¿Qué está pasando de verdad debajo?]

## Por qué importa ahora

[Conexión del arco con el presente de la obra, con Luffy, con el mundo de One Piece.
¿Qué semilla plantó este arco que vemos florecer más adelante?]

---

# CIERRE

[Refuerza la tesis con emoción. Una sola idea, contundente.
Que el espectador sienta que entiende algo que antes no veía.]
`,

  // ── Personaje ──────────────────────────────────────────
  personaje: `# GANCHO INICIAL

[Una frase que reencuadra al personaje de forma que nadie espera.
No presentes al personaje: sorprende con la idea que vas a defender.]

---

# CONTEXTO RÁPIDO

[Quién es, cuándo aparece en la historia. En 3 frases máximo.
El espectador ya lo conoce — solo orienta el punto de vista del vídeo.]

---

# TESIS

**La idea que voy a defender:**
{{TESIS}}

---

# DESARROLLO

## Lo que muestra al mundo

[La fachada, el rol aparente, cómo se presenta este personaje.
¿Qué quiere que los demás vean? ¿Qué papel ocupa en la historia?]

## Lo que esconde (o no sabe que esconde)

[La herida, el miedo, la contradicción interna.
¿Qué mueve de verdad a este personaje? ¿Qué no puede o no quiere ver de sí mismo?]

## El momento que lo define

[La escena, la decisión, el silencio que revela su verdad.
No describas lo que pasa: explica lo que significa esa elección.]

---

# CIERRE

[Por qué este personaje sigue importando, qué nos dice sobre nosotros mismos o sobre la obra.
Deja una sensación, no una conclusión.]
`,

  // ── Tema ───────────────────────────────────────────────
  tema: `# GANCHO INICIAL

[Una pregunta o afirmación que desafíe la percepción del espectador.
¿Y si lo que creías de este tema estaba incompleto?]

---

# CONTEXTO RÁPIDO

[Dónde y cómo aparece este tema en One Piece. Brevísimo.
Solo el anclaje necesario para entrar en el desarrollo.]

---

# TESIS

**La idea que voy a defender:**
{{TESIS}}

---

# DESARROLLO

## Cómo Oda lo introduce

[La primera aparición del tema. El ejemplo más claro, más limpio.
¿Qué nos dice Oda en ese primer momento?]

## Cómo evoluciona

[Cómo el tema se complica, se profundiza o se contradice a lo largo de la historia.
¿Cambia su significado? ¿Por qué?]

## Por qué resuena más allá de One Piece

[La conexión con algo universal: una emoción, una pregunta filosófica, algo de la vida real.
¿Por qué este tema nos afecta aunque no conozcamos One Piece?]

---

# CIERRE

[Lo que este tema dice sobre la obra y sobre el espectador.
Una reflexión final que no cierre del todo — que abra algo.]
`,

  // ── Conexión ───────────────────────────────────────────
  conexion: `# GANCHO INICIAL

[La yuxtaposición que nadie ha visto o que resulta sorprendente.
Planta la conexión como una pregunta o un contraste inesperado.]

---

# CONTEXTO RÁPIDO

[Presenta brevemente los dos (o más) elementos que vas a conectar.
No expliques la conexión todavía — solo orienta al espectador.]

---

# TESIS

**La idea que voy a defender:**
{{TESIS}}

---

# DESARROLLO

## Elemento A

[Primer elemento de la conexión.
¿Qué es? ¿Qué representa en la historia? ¿Qué dice Oda con él?]

## Elemento B

[Segundo elemento de la conexión.
¿Qué es? ¿Qué representa? ¿Cuál es su rol en la narrativa?]

## El puente que los une

[La conexión real, el patrón que los relaciona.
¿Por qué Oda los conecta? ¿Qué dice esa decisión sobre la obra?
¿Qué revela que antes no veíamos?]

---

# CIERRE

[Qué dice esta conexión sobre One Piece como obra total.
Una sensación de que el espectador acaba de ver algo que siempre estuvo ahí pero nunca había notado.]
`
};

// Plantilla por defecto (si no hay tipoVideo definido)
PLANTILLAS.default = `# GANCHO INICIAL

[2-4 frases muy potentes que generen curiosidad inmediata.]

---

# CONTEXTO RÁPIDO

[Situar al espectador sin hacer resumen largo. Brevísimo.]

---

# TESIS

**La idea que voy a defender:**
{{TESIS}}

---

# DESARROLLO

## Bloque 1

[Primera parte de la idea — ejemplo concreto, reflexión.]

## Bloque 2

[Segunda parte de la idea — profundizar, contraste, nueva capa.]

## Bloque 3

[Tercera parte — cierre del desarrollo, conexión emocional.]

---

# CIERRE

[Reforzar la idea principal. Dejar una sensación fuerte — emocional o reflexiva.]
`;

// ── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Devuelve la plantilla markdown rellena con los datos del vídeo.
 * - Usa la plantilla específica del tipoVideo si existe.
 * - Sustituye {{TESIS}} con el texto de tesisCentral del vídeo.
 * - Si no hay tipo, usa la plantilla default.
 *
 * @param {Object} video — objeto vídeo normalizado
 * @returns {string}     — markdown de la plantilla
 */
export function getTemplate(video = {}) {
  const tipo     = video.tipoVideo ?? "";
  const template = PLANTILLAS[tipo] ?? PLANTILLAS.default;
  return fillPlaceholders(template, video);
}

/**
 * Devuelve el prompt base del canal relleno con los datos del vídeo.
 *
 * @param {Object} video — objeto vídeo normalizado
 * @returns {string}     — prompt listo para copiar
 */
export function buildPrompt(video = {}) {
  return fillPlaceholders(PROMPT_BASE, video);
}

// ── Helper interno ────────────────────────────────────────────────────────────

/**
 * Sustituye placeholders {{CAMPO}} en un string con los datos del vídeo.
 *
 * Placeholders disponibles:
 *   {{TITULO}}  — video.titulo
 *   {{TESIS}}   — video.tesisCentral
 *   {{SAGA}}    — video.saga
 *   {{ARCO}}    — video.arco
 *   {{TIPO}}    — label legible de video.tipoVideo
 *   {{HOOK}}    — video.ideaHook
 *   {{IDEA}}    — video.ideaTexto
 *   {{CONEXION}}— video.conexionFuturo
 */
function fillPlaceholders(template, video) {
  const tipoLabel = TIPO_LABELS[video.tipoVideo] ?? video.tipoVideo ?? "";

  return template
    .replace(/\{\{TITULO\}\}/g,   video.titulo         || "[TÍTULO]")
    .replace(/\{\{TESIS\}\}/g,    video.tesisCentral   || "[ESCRIBE AQUÍ LA IDEA DEL VÍDEO]")
    .replace(/\{\{SAGA\}\}/g,     video.saga           || "[SAGA]")
    .replace(/\{\{ARCO\}\}/g,     video.arco           || "[ARCO]")
    .replace(/\{\{TIPO\}\}/g,     tipoLabel            || "[TIPO]")
    .replace(/\{\{HOOK\}\}/g,     video.ideaHook       || "")
    .replace(/\{\{IDEA\}\}/g,     video.ideaTexto      || "")
    .replace(/\{\{CONEXION\}\}/g, video.conexionFuturo || "");
}
