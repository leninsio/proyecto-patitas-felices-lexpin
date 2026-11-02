import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * T7 accessibility audit (S10).
 * Runs axe-core on every page in light and dark themes and fails only on
 * serious or critical violations. Moderate/minor findings are attached to the
 * test result as advisory annotations for follow-up but do not fail the run.
 */

test.use({ reducedMotion: "reduce" });

const PAGES = [
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
  "/guia-de-estilos.html",
  "/documentacion/index.html",
  "/documentacion/investigacion.html",
  "/documentacion/arquitectura.html",
  "/documentacion/decisiones.html",
  "/documentacion/pantallas.html",
  "/agendar.html",
  "/agendar-paso-2.html",
  "/agendar-paso-3.html",
  "/cita-confirmada.html",
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

const STEP2_DRAFT = {
  service: "consulta",
  petType: "perro",
  petName: "Miga",
  petAge: "8 meses",
  date: "2027-01-04",
  time: "09:30",
  step: 2,
  updatedAt: Date.now()
};

const STEP3_DRAFT = {
  ...STEP2_DRAFT,
  step: 3,
  ownerName: "Ana Pérez",
  ownerPhone: "0412-5550198",
  ownerEmail: "ana@example.com",
  notes: ""
};

const CONFIRMED = {
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

async function seed(page, path) {
  if (path === "/agendar-paso-2.html") {
    await page.addInitScript((draft) => {
      sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
    }, STEP2_DRAFT);
  } else if (path === "/agendar-paso-3.html") {
    await page.addInitScript((draft) => {
      sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
    }, STEP3_DRAFT);
  } else if (path === "/cita-confirmada.html") {
    await page.addInitScript((confirmed) => {
      sessionStorage.setItem("pf-booking-confirmed", JSON.stringify(confirmed));
      sessionStorage.removeItem("pf-booking-draft");
    }, CONFIRMED);
  }
}

for (const theme of ["light", "dark"]) {
  test.describe(`${theme} theme`, () => {
    for (const path of PAGES) {
      test(`${path} — axe serious/critical`, async ({ page }, testInfo) => {
        await seed(page, path);
        await page.addInitScript((selectedTheme) => {
          try {
            localStorage.setItem("pf-theme", selectedTheme);
          } catch (error) {
            /* Storage can be blocked; the test still runs. */
          }
        }, theme);

        await page.goto(path, { waitUntil: "load" });
        await page.waitForSelector("[data-emergency-dock]", {
          state: "visible"
        });
        await page.waitForTimeout(150);

        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical"
        );

        const summary = blocking.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.map((node) => node.target)
        }));

        const advisory = results.violations.filter(
          (violation) =>
            violation.impact !== "serious" && violation.impact !== "critical"
        );
        if (advisory.length > 0) {
          testInfo.annotations.push({
            type: "axe-advisory",
            description: `${path} (${theme}): ` +
              advisory
                .map((violation) => `${violation.id} [${violation.impact}]`)
                .join(", ")
          });
        }

        expect(
          blocking,
          `Serious/critical axe violations on ${path} (${theme}):\n${JSON.stringify(summary, null, 2)}`
        ).toEqual([]);
      });
    }
  });
}
