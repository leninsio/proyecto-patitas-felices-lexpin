#!/usr/bin/env node
/**
 * T7 — screenshot capture for the delivery docs (S7, S12).
 *
 * Writes docs/assets/pantallas/<screen>-390.png and -1440.png for the ten
 * required screens, Mis mascotas, the style guide and the wireframe index.
 * Adds three dark-mode samples and seeds the booking draft so steps 2, 3 and
 * the confirmation page render their real state instead of a guard redirect.
 *
 * Run with: node tests/capture.mjs
 */

import { createServer } from "node:http";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(projectRoot, "site");
const outputDir = path.join(projectRoot, "docs", "assets", "pantallas");
const PORT = 4322;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

const STEP1 = {
  service: "consulta",
  petType: "perro",
  petName: "Miga",
  petAge: "8 meses",
  step: 1,
  updatedAt: Date.now()
};

const STEP2 = {
  ...STEP1,
  date: "2027-01-04",
  time: "10:00",
  step: 2
};

const STEP3 = {
  ...STEP2,
  step: 3,
  ownerName: "Ana Pérez",
  ownerPhone: "0212-5551234",
  ownerEmail: "ana@example.com",
  notes: "Miga está un poco decaída; prefiere esperar en brazos."
};

const CONFIRMED = {
  code: "PF-2701-K7M2",
  service: "consulta",
  serviceLabel: "Consulta general",
  servicePrice: "Desde $25",
  durationLabel: "30 min",
  durationMinutes: 30,
  petType: "perro",
  petTypeLabel: "Perro",
  petName: "Miga",
  petAge: "8 meses",
  date: "2027-01-04",
  time: "10:00",
  ownerName: "Ana Pérez",
  ownerPhone: "0212-5551234",
  ownerEmail: "ana@example.com",
  notes: "Miga está un poco decaída; prefiere esperar en brazos.",
  createdAt: Date.now()
};

/** Screen key -> page and session seed. */
const SCREENS = [
  { name: "inicio", path: "/index.html" },
  { name: "servicios", path: "/servicios.html" },
  { name: "detalle-servicio", path: "/servicio.html?s=consulta" },
  { name: "equipo", path: "/equipo.html" },
  { name: "agendar-paso-1", path: "/agendar.html", draft: STEP1 },
  { name: "agendar-paso-2", path: "/agendar-paso-2.html", draft: STEP2, pickSlot: true },
  { name: "agendar-paso-3", path: "/agendar-paso-3.html", draft: STEP3 },
  { name: "cita-confirmada", path: "/cita-confirmada.html", confirmed: CONFIRMED },
  { name: "contacto", path: "/contacto.html" },
  { name: "404", path: "/404.html" },
  { name: "mis-mascotas", path: "/mis-mascotas.html" },
  { name: "guia-de-estilos", path: "/guia-de-estilos.html" },
  { name: "wireframes", path: "/wireframes/index.html" }
];

const DARK_SAMPLES = ["inicio", "servicios", "cita-confirmada"];

const VIEWPORTS = [
  { suffix: "390", width: 390, height: 844, mobile: true },
  { suffix: "1440", width: 1440, height: 900, mobile: false }
];

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", BASE);
      let filePath = path.join(siteRoot, decodeURIComponent(url.pathname));
      if (!filePath.startsWith(siteRoot)) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      const info = await stat(filePath).catch(() => null);
      if (!info) {
        response.writeHead(404).end("Not found");
        return;
      }
      if (info.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      response.writeHead(200, { "content-type": contentType(filePath) });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500).end("Server error");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function seed(page, screen, theme) {
  await page.addInitScript(
    ({ draft, confirmed, selectedTheme }) => {
      try {
        localStorage.setItem("pf-theme", selectedTheme);
        if (draft) {
          sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
        }
        if (confirmed) {
          sessionStorage.setItem(
            "pf-booking-confirmed",
            JSON.stringify(confirmed)
          );
          sessionStorage.removeItem("pf-booking-draft");
        }
      } catch (error) {
        /* Storage can be blocked; the page still renders. */
      }
    },
    {
      draft: screen.draft || null,
      confirmed: screen.confirmed || null,
      selectedTheme: theme
    }
  );
}

async function settle(page) {
  await page.waitForSelector("[data-emergency-dock]", { state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

async function capture(browser, screen, theme) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await seed(page, screen, theme);
    const response = await page.goto(BASE + screen.path, { waitUntil: "load" });
    if (!response || response.status() !== 200) {
      throw new Error(`${screen.path} returned ${response ? response.status() : "no response"}`);
    }
    await settle(page);

    // Full-page screenshots paint fixed elements at the current scroll
    // position (mid-page). Place the always-visible dock after the footer for
    // the capture so it does not cover the content it protects.
    await page.addStyleTag({
      content:
        ".emergency-dock{position:static;} body.has-emergency-dock{padding-block-end:0;} html{scroll-behavior:auto;}"
    });
    await page.waitForTimeout(120);

    if (screen.pickSlot) {
      const selected = await page
        .locator('[data-slot-grid] button[aria-pressed="true"]')
        .count();
      if (selected === 0) {
        const slot = page
          .locator('[data-slot-grid] button[data-time]:not([disabled])')
          .first();
        if ((await slot.count()) > 0) {
          await slot.click();
          await page.waitForTimeout(150);
        }
      }
    }

    const suffix = theme === "dark" ? "-dark" : "";
    const file = path.join(
      outputDir,
      `${screen.name}${suffix}-${viewport.suffix}.png`
    );
    await page.screenshot({ path: file, fullPage: true });
    console.log(
      `  ${path.relative(projectRoot, file)}` +
        (consoleErrors.length ? `  (page errors: ${consoleErrors.join(" | ")})` : "")
    );

    await context.close();
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();

  try {
    console.log("Light screens:");
    for (const screen of SCREENS) {
      await capture(browser, screen, "light");
    }

    console.log("Dark samples:");
    for (const name of DARK_SAMPLES) {
      const screen = SCREENS.find((item) => item.name === name);
      await capture(browser, screen, "dark");
    }

    await writeFile(
      path.join(outputDir, "README.md"),
      [
        "# Capturas de pantalla",
        "",
        "Generadas por `node tests/capture.mjs` a 390 px y 1440 px.",
        "Tema claro: las diez pantallas obligatorias, Mis mascotas, la guía de estilos y el índice de wireframes.",
        "Tema oscuro: inicio, servicios y cita confirmada.",
        "",
        "Los pasos 2 y 3 y la confirmación usan un borrador de demostración para mostrar su estado real.",
        ""
      ].join("\n")
    );

    console.log(`\nDone: ${SCREENS.length * 2 + DARK_SAMPLES.length * 2} PNG files in docs/assets/pantallas/.`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
