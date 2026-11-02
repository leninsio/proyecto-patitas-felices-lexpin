#!/usr/bin/env node
/**
 * T10 — build the public documentation section from the Markdown sources.
 *
 *   docs/01-investigacion.md  -> site/documentacion/investigacion.html
 *   docs/02-arquitectura.md   -> site/documentacion/arquitectura.html
 *   docs/03-decisiones.md     -> site/documentacion/decisiones.html
 *
 * Also generates the hub, the screen archive, copies docs/assets and the PDF.
 * Run with: node tests/build-docs.mjs
 */

import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(projectRoot, "docs");
const outputRoot = path.join(projectRoot, "site", "documentacion");
const outputAssets = path.join(outputRoot, "assets");

const DOCS = [
  {
    source: "01-investigacion.md",
    slug: "investigacion",
    title: "Investigación UX",
    lead: "Proto-personas, journey map y análisis de competencia (S1–S3).",
    kicker: "Investigación"
  },
  {
    source: "02-arquitectura.md",
    slug: "arquitectura",
    title: "Arquitectura de información",
    lead: "Card sorting, sitemap y user flow del agendamiento (S4–S5).",
    kicker: "Arquitectura"
  },
  {
    source: "03-decisiones.md",
    slug: "decisiones",
    title: "Decisiones de diseño",
    lead: "Justificación, sistema visual y checklist de cumplimiento del enunciado (S7, S10–S12).",
    kicker: "Decisiones"
  }
];

const LINK_MAP = {
  "01-investigacion.md": "investigacion.html",
  "02-arquitectura.md": "arquitectura.html",
  "03-decisiones.md": "decisiones.html"
};

const SCREENS = [
  { slug: "inicio", title: "Inicio", live: "../index.html" },
  { slug: "servicios", title: "Servicios", live: "../servicios.html" },
  {
    slug: "detalle-servicio",
    title: "Detalle de servicio",
    live: "../servicio.html?s=consulta"
  },
  { slug: "equipo", title: "Nuestro equipo", live: "../equipo.html" },
  { slug: "agendar-paso-1", title: "Agendar · paso 1", live: "../agendar.html" },
  {
    slug: "agendar-paso-2",
    title: "Agendar · paso 2",
    live: "../agendar-paso-2.html"
  },
  {
    slug: "agendar-paso-3",
    title: "Agendar · paso 3",
    live: "../agendar-paso-3.html"
  },
  {
    slug: "cita-confirmada",
    title: "Cita confirmada",
    live: "../cita-confirmada.html"
  },
  { slug: "contacto", title: "Contacto y ubicación", live: "../contacto.html" },
  { slug: "404", title: "Página 404", live: "../404.html" },
  { slug: "mis-mascotas", title: "Mis mascotas", live: "../mis-mascotas.html" },
  {
    slug: "guia-de-estilos",
    title: "Guía de estilos",
    live: "../guia-de-estilos.html"
  },
  {
    slug: "wireframes",
    title: "Índice de wireframes",
    live: "../wireframes/index.html"
  }
];

const DARK_SAMPLES = ["inicio", "servicios", "cita-confirmada"];

const NAV = [
  { slug: "investigacion", label: "Investigación" },
  { slug: "arquitectura", label: "Arquitectura" },
  { slug: "decisiones", label: "Decisiones" },
  { slug: "pantallas", label: "Archivo de diseño" }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function slugify(value) {
  return stripTags(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "seccion";
}

function renderMarkdown(markdown) {
  const titleMatch = markdown.match(/^#\s+(.+)\n/);
  const title = titleMatch ? titleMatch[1].trim() : "Documentación";
  const body = titleMatch ? markdown.slice(titleMatch[0].length) : markdown;

  let html = marked.parse(body, { gfm: true, breaks: false });

  // Stable heading IDs, with a counter for repeated headings.
  const used = new Map();
  html = html.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (match, depth, inner) => {
      let id = slugify(inner);
      const count = used.get(id) || 0;
      used.set(id, count + 1);
      if (count > 0) {
        id = `${id}-${count + 1}`;
      }
      return `<h${depth} id="${id}">${inner}</h${depth}>`;
    }
  );

  // Code blocks can scroll horizontally; make the region keyboard reachable.
  html = html.replace(/<pre>/g, '<pre tabindex="0">');

  // Every table scrolls inside its own wrapper, never the page.
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, (match, table) => {
    return (
      '<div class="doc-table-wrap" tabindex="0" role="region" ' +
      'aria-label="Tabla de datos con desplazamiento horizontal">' +
      `<table>${table}</table></div>`
    );
  });

  // Images: lazy, async and a narrower variant for 390 px screenshots.
  html = html.replace(/<img\s+([^>]*?)>/g, (match, attrs) => {
    const srcMatch = attrs.match(/src="([^"]+)"/);
    const src = srcMatch ? srcMatch[1] : "";
    const extra = /-390\.png$/i.test(src) ? " doc-image doc-image--mobile" : " doc-image";
    let next = attrs;
    if (!/\bclass=/.test(next)) {
      next += ` class="${extra.trim()}"`;
    }
    if (!/\bloading=/.test(next)) {
      next += ' loading="lazy"';
    }
    if (!/\bdecoding=/.test(next)) {
      next += ' decoding="async"';
    }
    return `<img ${next}>`;
  });

  // Rewrite the few relative links that change extension.
  html = html.replace(/<a\s+href="([^"]+)"([^>]*)>/g, (match, href, rest) => {
    let next = href;
    if (LINK_MAP[next]) {
      next = LINK_MAP[next];
    } else if (next.startsWith("../site/")) {
      next = next.replace("../site/", "../");
    } else if (next.startsWith("site/")) {
      next = next.replace("site/", "../");
    }

    let attrs = rest;
    if (/^https?:/i.test(next) && !/\btarget=/.test(attrs)) {
      attrs += ' target="_blank" rel="noopener"';
    }
    return `<a href="${next}"${attrs}>`;
  });

  return { title, html };
}

function extractToc(html) {
  const items = [];
  const pattern = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    items.push({
      depth: Number(match[1]),
      id: match[2],
      text: stripTags(match[3])
    });
  }
  return items;
}

function tocMarkup(items, className) {
  if (!items.length) {
    return "";
  }
  const links = items
    .map(
      (item) =>
        `<li><a class="${item.depth === 3 ? "doc-toc__sub" : ""}" href="#${item.id}">${escapeHtml(item.text)}</a></li>`
    )
    .join("\n");
  return (
    `<nav class="${className}" aria-label="En esta página">` +
    '<p class="doc-toc__title">En esta página</p>' +
    `<ul class="doc-toc__list">${links}</ul>` +
    "</nav>"
  );
}

function pageShell({ title, description, body, bodyAttribute = "" }) {
  return `<!DOCTYPE html>
<html lang="es-VE">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Patitas Felices</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#F6FAF8">
  <link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg">
  <script src="../assets/js/layout.js"></script>
  <link rel="stylesheet" href="../assets/css/tokens.css">
  <link rel="stylesheet" href="../assets/css/base.css">
  <link rel="stylesheet" href="../assets/css/components.css">
  <link rel="stylesheet" href="../assets/css/pages.css">
  <link rel="stylesheet" href="../assets/css/docs.css">
</head>
<body${bodyAttribute ? ` ${bodyAttribute}` : ""}>
  <main id="main" tabindex="-1">
${body}
  </main>
</body>
</html>
`;
}

function breadcrumb(current) {
  if (current === "Inicio") {
    return (
      '<nav class="doc-breadcrumb" aria-label="Ruta de documentación">' +
      '<span aria-current="page">Documentación</span>' +
      "</nav>"
    );
  }
  return (
    '<nav class="doc-breadcrumb" aria-label="Ruta de documentación">' +
    '<a href="index.html">Documentación</a> / ' +
    `<span aria-current="page">${escapeHtml(current)}</span>` +
    "</nav>"
  );
}

function pager(currentIndex) {
  const previous = DOCS[currentIndex - 1];
  const next = DOCS[currentIndex + 1];
  return (
    '<nav class="doc-pager" aria-label="Documentos relacionados">' +
    (previous
      ? `<a class="btn btn--secondary" href="${previous.slug}.html">← ${escapeHtml(previous.title)}</a>`
      : '<a class="btn btn--secondary" href="index.html">← Documentación</a>') +
    (next
      ? `<a class="btn btn--primary" href="${next.slug}.html">${escapeHtml(next.title)} →</a>`
      : '<a class="btn btn--primary" href="pantallas.html">Archivo de diseño →</a>') +
    "</nav>"
  );
}

async function buildDoc(doc, index) {
  const markdown = await readFile(path.join(docsRoot, doc.source), "utf8");
  const { html } = renderMarkdown(markdown);
  const toc = extractToc(html);

  const body = `    <section class="page-header page-header--compact doc-hero">
      <div class="container page-header__inner">
        ${breadcrumb(doc.title)}
        <p class="eyebrow">Documentación del proyecto</p>
        <h1>${escapeHtml(doc.title)}</h1>
        <p class="lead">${escapeHtml(doc.lead)}</p>
      </div>
    </section>

    <section class="section section--tight" aria-label="${escapeHtml(doc.title)}">
      <div class="container doc-layout">
        <aside class="doc-sidebar">
          ${tocMarkup(toc, "doc-toc doc-toc--desktop")}
        </aside>
        <div>
          <details class="doc-toc-mobile">
            <summary>En esta página</summary>
            ${tocMarkup(toc, "doc-toc")}
          </details>
          <article class="doc-content">
${html}
          </article>
          ${pager(index)}
        </div>
      </div>
    </section>`;

  const page = pageShell({
    title: doc.title,
    description: doc.lead,
    body,
    bodyAttribute: `data-doc-page="${doc.slug}"`
  });

  await writeFile(path.join(outputRoot, `${doc.slug}.html`), page);
  console.log(`  site/documentacion/${doc.slug}.html`);
}

function hubCard(doc, index) {
  return `<article class="doc-card">
        <p class="doc-card__kicker">0${index + 1} · ${escapeHtml(doc.kicker)}</p>
        <h2>${escapeHtml(doc.title)}</h2>
        <p>${escapeHtml(doc.lead)}</p>
        <a class="doc-card__link" href="${doc.slug}.html">Leer el documento <span aria-hidden="true">→</span></a>
      </article>`;
}

async function buildHub() {
  const body = `    <section class="page-header page-header--compact doc-hero">
      <div class="container page-header__inner">
        ${breadcrumb("Inicio")}
        <p class="eyebrow">Documentación del proyecto</p>
        <h1>Todo el proyecto, en un solo lugar</h1>
        <p class="lead">La investigación, la arquitectura, las decisiones de diseño y el archivo de pantallas del proyecto Patitas Felices. Los documentos se generan desde los Markdown de <code>docs/</code> para que no se desincronicen.</p>
      </div>
    </section>

    <section class="section section--tight" aria-label="Documentos del proyecto">
      <div class="container">
        <div class="doc-hub">
          ${DOCS.map(hubCard).join("\n          ")}
          <article class="doc-card">
            <p class="doc-card__kicker">04 · Archivo de diseño</p>
            <h2>Pantallas finales</h2>
            <p>Las 13 pantallas finales en escritorio (1440 px) y móvil (390 px), tres muestras de modo oscuro y enlaces a las páginas vivas, la guía de estilos y los wireframes.</p>
            <a class="doc-card__link" href="pantallas.html">Abrir el archivo de diseño <span aria-hidden="true">→</span></a>
          </article>
          <article class="doc-card doc-card--pdf" style="grid-column: 1 / -1">
            <p class="doc-card__kicker">Entrega · PDF</p>
            <h2>Informe del proyecto</h2>
            <p>Ocho páginas A4 con la portada, las proto-personas, el journey map, la competencia, el sitemap, el user flow, las decisiones y las pantallas clave.</p>
            <a class="doc-card__link" href="informe.pdf" download>Descargar informe.pdf <span aria-hidden="true">↓</span></a>
          </article>
        </div>
      </div>
    </section>`;

  const page = pageShell({
    title: "Documentación del proyecto",
    description:
      "Investigación, arquitectura, decisiones de diseño, pantallas finales e informe PDF del proyecto Patitas Felices.",
    body,
    bodyAttribute: 'data-doc-page="hub"'
  });
  await writeFile(path.join(outputRoot, "index.html"), page);
  console.log("  site/documentacion/index.html");
}

function shotCard(screen, theme = "light") {
  const suffix = theme === "dark" ? "-dark" : "";
  const label = theme === "dark" ? "Modo oscuro" : "Tema claro";
  const alt = `${screen.title} en ${theme === "dark" ? "modo oscuro" : "tema claro"}`;
  return `<article class="shot-card" id="${screen.slug}${suffix}">
          <header class="shot-card__head">
            <h2>${escapeHtml(screen.title)}</h2>
            <a href="${screen.live}">Abrir en vivo <span aria-hidden="true">↗</span></a>
          </header>
          <div class="shot-pair">
            <figure>
              <a class="shot-frame shot-frame--desktop" href="assets/pantallas/${screen.slug}${suffix}-1440.png" target="_blank" rel="noopener" aria-label="Abrir captura de ${escapeHtml(screen.title)} a 1440 px">
                <img src="assets/pantallas/${screen.slug}${suffix}-1440.png" alt="${escapeHtml(alt)} a 1440 px" loading="lazy" decoding="async">
              </a>
              <figcaption class="shot-caption"><span>${label} · escritorio</span><span>1440 px</span></figcaption>
            </figure>
            <figure>
              <a class="shot-frame shot-frame--mobile" href="assets/pantallas/${screen.slug}${suffix}-390.png" target="_blank" rel="noopener" aria-label="Abrir captura de ${escapeHtml(screen.title)} a 390 px">
                <img src="assets/pantallas/${screen.slug}${suffix}-390.png" alt="${escapeHtml(alt)} a 390 px" loading="lazy" decoding="async">
              </a>
              <figcaption class="shot-caption"><span>Móvil</span><span>390 px</span></figcaption>
            </figure>
          </div>
        </article>`;
}

async function buildScreens() {
  const dark = SCREENS.filter((screen) => DARK_SAMPLES.includes(screen.slug));
  const body = `    <section class="page-header page-header--compact doc-hero">
      <div class="container page-header__inner">
        ${breadcrumb("Archivo de diseño")}
        <p class="eyebrow">Documentación del proyecto</p>
        <h1>Archivo de diseño</h1>
        <p class="lead">Todas las pantallas finales, lado a lado en escritorio y móvil. Cada miniatura abre la captura completa; cada tarjeta enlaza a la página viva. Los pasos 2, 3 y la confirmación necesitan un borrador de reserva, así que su enlace puede redirigir al paso 1.</p>
        <div class="btn-row" style="margin-block-start: var(--space-4)">
          <a class="btn btn--primary" href="../guia-de-estilos.html">Guía de estilos</a>
          <a class="btn btn--secondary" href="../wireframes/index.html">Wireframes</a>
          <a class="btn btn--secondary" href="informe.pdf" download>Informe PDF</a>
        </div>
      </div>
    </section>

    <section class="section section--tight" aria-label="Pantallas finales en tema claro">
      <div class="container">
        <h2>Pantallas finales · tema claro</h2>
        <p class="text-muted" style="margin-block: var(--space-2) var(--space-5)">13 pantallas a 1440 y 390 px. Las capturas son de página completa; aquí se muestra el inicio de cada una.</p>
        <div class="shot-grid">
          ${SCREENS.map((screen) => shotCard(screen)).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="section section--tight section--muted" aria-label="Muestras de modo oscuro">
      <div class="container">
        <h2>Muestras de modo oscuro</h2>
        <p class="text-muted" style="margin-block: var(--space-2) var(--space-5)">Inicio, Servicios y Cita confirmada en ambos anchos. El tema se guarda en el navegador y respeta la preferencia del sistema.</p>
        <div class="shot-grid">
          ${dark.map((screen) => shotCard(screen, "dark")).join("\n          ")}
        </div>
      </div>
    </section>`;

  const page = pageShell({
    title: "Archivo de diseño",
    description:
      "Galería de las pantallas finales de Patitas Felices en 1440 y 390 px, con muestras de modo oscuro.",
    body,
    bodyAttribute: 'data-doc-page="pantallas"'
  });
  await writeFile(path.join(outputRoot, "pantallas.html"), page);
  console.log("  site/documentacion/pantallas.html");
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await cp(path.join(docsRoot, "assets"), outputAssets, {
    recursive: true,
    force: true,
    filter: (source) => !path.basename(source).startsWith("review-")
  });
  await cp(
    path.join(docsRoot, "informe.pdf"),
    path.join(outputRoot, "informe.pdf")
  );

  console.log("Documentation pages:");
  await buildHub();
  for (const [index, doc] of DOCS.entries()) {
    await buildDoc(doc, index);
  }
  await buildScreens();

  console.log("\nCopied docs/assets -> site/documentacion/assets");
  console.log("Copied docs/informe.pdf -> site/documentacion/informe.pdf");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
