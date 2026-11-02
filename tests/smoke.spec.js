import { test, expect } from "@playwright/test";

/**
 * Smoke coverage for T4 (wireframes), T5 (informational hi-fi screens) and
 * T6 (the four booking-flow pages).
 * For every page and both reference widths it asserts:
 *   1. HTTP 200
 *   2. no console errors (or uncaught page errors)
 *   3. no horizontal overflow (document scrollWidth <= viewport width)
 *   4. exactly one h1
 *   5. the global emergency dock is visible
 */

const PAGES = [
  // T5 — hi-fi informational screens
  "/index.html",
  "/servicios.html",
  "/servicio.html?s=consulta",
  "/servicio.html?s=vacunacion",
  "/servicio.html?s=cirugia",
  "/servicio.html?s=peluqueria",
  "/servicio.html?s=emergencias",
  "/equipo.html",
  "/contacto.html",
  "/404.html",
  "/mis-mascotas.html",
  // T6 — booking flow
  "/agendar.html",
  "/agendar-paso-2.html",
  "/agendar-paso-3.html",
  "/cita-confirmada.html",
  // T1 — style guide (also part of the overflow regression check)
  "/guia-de-estilos.html",
  // T10 — public documentation section
  "/documentacion/index.html",
  "/documentacion/investigacion.html",
  "/documentacion/arquitectura.html",
  "/documentacion/decisiones.html",
  "/documentacion/pantallas.html",
  // T4 — wireframes
  "/wireframes/index.html",
  "/wireframes/01-inicio.html",
  "/wireframes/02-servicios.html",
  "/wireframes/03-detalle-servicio.html",
  "/wireframes/04-equipo.html",
  "/wireframes/05-agendar-paso-1.html",
  "/wireframes/06-agendar-paso-2.html",
  "/wireframes/07-agendar-paso-3.html",
  "/wireframes/08-cita-confirmada.html",
  "/wireframes/09-contacto.html",
  "/wireframes/10-404.html",
  "/wireframes/11-mis-mascotas.html"
];

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

/**
 * The booking pages are guarded: opening step 2/3 or the confirmation directly
 * redirects to the right earlier step. Seed sessionStorage before navigating so
 * the smoke test exercises the real page instead of the guard redirect.
 */
const BOOKING_STEP1_DRAFT = {
  service: "consulta",
  petType: "perro",
  petName: "Miga",
  petAge: "8 meses",
  step: 1,
  updatedAt: Date.now()
};

const BOOKING_STEP2_DRAFT = {
  ...BOOKING_STEP1_DRAFT,
  date: "2027-01-04",
  time: "09:30",
  step: 2
};

const BOOKING_STEP3_DRAFT = {
  ...BOOKING_STEP2_DRAFT,
  step: 3,
  ownerName: "Ana Pérez",
  ownerPhone: "0412-5550198",
  ownerEmail: "ana@example.com",
  notes: ""
};

const BOOKING_CONFIRMED = {
  code: "PF-2701-TEST",
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
  time: "09:30",
  ownerName: "Ana Pérez",
  ownerPhone: "0412-5550198",
  ownerEmail: "ana@example.com",
  notes: "",
  createdAt: Date.now()
};

const BOOKING_H1 = {
  "/agendar.html": "Agendar cita",
  "/agendar-paso-2.html": "Elige fecha y hora",
  "/agendar-paso-3.html": "Tus datos y confirmación",
  "/cita-confirmada.html": "Tu cita está confirmada"
};

async function seedBookingState(page, path) {
  if (path === "/agendar-paso-2.html") {
    await page.addInitScript((draft) => {
      sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
    }, BOOKING_STEP2_DRAFT);
  } else if (path === "/agendar-paso-3.html") {
    await page.addInitScript((draft) => {
      sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
    }, BOOKING_STEP3_DRAFT);
  } else if (path === "/cita-confirmada.html") {
    await page.addInitScript((confirmed) => {
      sessionStorage.setItem("pf-booking-confirmed", JSON.stringify(confirmed));
      sessionStorage.removeItem("pf-booking-draft");
    }, BOOKING_CONFIRMED);
  }
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of PAGES) {
      test(`${path} — structure and layout`, async ({ page }) => {
        const consoleErrors = [];

        page.on("console", (message) => {
          if (message.type() === "error") {
            consoleErrors.push(message.text());
          }
        });
        page.on("pageerror", (error) => {
          consoleErrors.push(error.message);
        });

        await seedBookingState(page, path);

        const response = await page.goto(path, { waitUntil: "load" });
        expect(response, "navigation response").not.toBeNull();
        expect(response.status(), `HTTP status for ${path}`).toBe(200);

        await page.waitForSelector("[data-emergency-dock]", { state: "visible" });
        await page.waitForTimeout(150);

        await expect(page.locator("h1")).toHaveCount(1);
        if (BOOKING_H1[path]) {
          await expect(page.locator("h1")).toHaveText(BOOKING_H1[path]);
        }
        await expect(page.locator("[data-emergency-dock]")).toBeVisible();

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          innerWidth: window.innerWidth
        }));

        expect(
          metrics.scrollWidth,
          `document scrollWidth ${metrics.scrollWidth} exceeds innerWidth ${metrics.innerWidth}`
        ).toBeLessThanOrEqual(metrics.innerWidth);

        expect(
          consoleErrors,
          `console errors on ${path}: ${consoleErrors.join(" | ")}`
        ).toEqual([]);
      });
    }
  });
}

test("theme toggle switches the document theme on the home page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/index.html");
  await page.waitForSelector("[data-theme-toggle]");

  const before = await page.evaluate(() => {
    const explicit = document.documentElement.getAttribute("data-theme");
    if (explicit) return explicit;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  await page.locator("[data-theme-toggle]").first().click();

  const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(after, "the toggle must set an explicit theme").toMatch(/^(light|dark)$/);
  expect(after, "the toggle must change the current theme").not.toBe(before);
});

test("service detail preselects the requested service", async ({ page }) => {
  await page.goto("/servicio.html?s=vacunacion");
  await page.waitForSelector("[data-service-title]");
  await expect(page.locator("h1")).toHaveText("Vacunación");
  await expect(page.locator("[data-service-book]").first()).toHaveAttribute(
    "href",
    "agendar.html?servicio=vacunacion"
  );
  await expect(page.locator("[data-service-book-label]").first()).toHaveText("Agendar vacunación");

  const otherTitles = await page.locator("[data-other-services] .card__title").allTextContents();
  expect(otherTitles).toHaveLength(4);
  expect(otherTitles.map((title) => title.trim())).not.toContain("Vacunación");
});

const GUARDED_BOOKING_PAGES = [
  "/agendar-paso-2.html",
  "/agendar-paso-3.html",
  "/cita-confirmada.html"
];

const HI_FI_PAGES = PAGES.filter(
  (path) =>
    !path.startsWith("/wireframes/") &&
    !GUARDED_BOOKING_PAGES.includes(path)
);

test("every hi-fi page exposes the shared theme toggle", async ({ page }) => {
  for (const path of HI_FI_PAGES) {
    await page.goto(path);
    await page.waitForSelector("[data-emergency-dock]", { state: "visible" });
    await expect(page.locator("[data-theme-toggle]").first()).toBeVisible();
  }
});

test("footer links to documentation while the main navigation stays at six items", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator(".site-nav__list > li")).toHaveCount(6);
  await expect(
    page.locator('.site-footer__bottom a[href$="/documentacion/index.html"]')
  ).toHaveText("Documentación");
});

test("the documentation hub links to every document and the screen archive", async ({ page }) => {
  await page.goto("/documentacion/index.html");
  await expect(page.locator('.site-nav [aria-current="page"]')).toHaveCount(0);
  await expect(page.locator(".doc-breadcrumb")).toHaveText("Documentación");
  for (const href of [
    "investigacion.html",
    "arquitectura.html",
    "decisiones.html",
    "pantallas.html",
    "informe.pdf"
  ]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  }

  const response = await page.request.get("/documentacion/pantallas.html");
  expect(response.status()).toBe(200);

  await page.goto("/documentacion/investigacion.html");
  await expect(page.locator(".doc-breadcrumb")).toContainText(
    "Documentación / Investigación UX"
  );
  await expect(page.locator('.site-nav [aria-current="page"]')).toHaveCount(0);
});

test("the screen archive shows 13 light screens and 3 dark samples", async ({ page }) => {
  await page.goto("/documentacion/pantallas.html");
  await expect(page.locator(".shot-card")).toHaveCount(16);
  await expect(page.locator(".shot-grid")).toHaveCount(2);
  await expect(page.locator(".shot-frame--desktop")).toHaveCount(16);
  await expect(page.locator(".shot-frame--mobile")).toHaveCount(16);
});

test("Mis mascotas shows photo profiles and a highlighted next dose", async ({ page }) => {
  await page.goto("/mis-mascotas.html");
  await expect(page.locator(".pet-card")).toHaveCount(2);
  await expect(page.locator(".pet-card .pet-photo")).toHaveCount(2);
  await expect(
    page.locator('.pet-card a[href="agendar.html?servicio=vacunacion"]')
  ).toHaveCount(2);
  await expect(page.locator(".pet-vaccine-highlight")).toHaveCount(2);
  await expect(page.locator(".pet-card .badge .icon")).not.toHaveCount(0);
  const photos = await page.locator(".pet-card .pet-photo").evaluateAll((images) =>
    images.map((image) => image.naturalWidth > 0)
  );
  expect(photos).toEqual([true, true]);
});

test("Contacto has quick actions, a mail icon and today's hours highlighted", async ({ page }) => {
  await page.goto("/contacto.html");
  await expect(page.locator("h1")).toHaveText(/Estamos en Los Ruices/);
  await expect(page.locator(".page-header .btn-row a")).toHaveCount(3);
  await expect(page.locator('use[href="#icon-mail"]')).toHaveCount(1);
  await expect(page.locator(".hours-list__row.is-today")).toHaveCount(1);
  await expect(page.locator(".hours-list__row.is-today .hours-list__today")).toBeVisible();
});

test("team cards use real photos and keep name, specialty, bio and tags", async ({ page }) => {
  await page.goto("/equipo.html");
  await expect(page.locator(".team-card__photo")).toHaveCount(4);
  await expect(page.locator(".team-card__role")).toHaveCount(4);
  await expect(page.locator(".team-card__body .card__text")).toHaveCount(4);
  await expect(page.locator(".team-card__body .chip-list")).toHaveCount(4);
});

test("the wireframe index links to the eleven wireframes", async ({ page }) => {
  await page.goto("/wireframes/index.html");
  const links = await page.locator(".wf-index-card__link").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href"))
  );

  expect(links).toHaveLength(11);
  for (const href of links) {
    expect(href, "every index card needs a link").toBeTruthy();
    const response = await page.request.get(`/wireframes/${href}`);
    expect(response.status(), `link ${href}`).toBe(200);
  }
});

test("the style guide links to the wireframe index", async ({ page }) => {
  await page.goto("/guia-de-estilos.html");
  await expect(page.locator('a[href="wireframes/index.html"]')).toBeVisible();
});

test("service detail marks Servicios as the current navigation item", async ({ page }) => {
  await page.goto("/servicio.html?s=consulta");
  await expect(page.locator('.site-nav__link[aria-current="page"]')).toHaveText("Servicios");
});
