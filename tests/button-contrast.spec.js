import { test, expect } from "@playwright/test";

/**
 * T20 — every visible labelled link-button / button must keep its label
 * readable on hover. Light and dark themes, all public pages.
 */

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

const STEP2 = {
  service: "consulta",
  petType: "perro",
  petName: "Miga",
  petAge: "8 meses",
  date: "2027-01-04",
  time: "09:30",
  step: 2,
  updatedAt: Date.now()
};

const STEP3 = {
  ...STEP2,
  step: 3,
  ownerName: "Ana Pérez",
  ownerPhone: "0212-5551234",
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
  ownerPhone: "0212-5551234",
  ownerEmail: "ana@example.com",
  notes: "",
  createdAt: Date.now()
};

const SEEDS = {
  "/agendar-paso-2.html": { draft: STEP2 },
  "/agendar-paso-3.html": { draft: STEP3 },
  "/cita-confirmada.html": { confirmed: CONFIRMED }
};

function contrastFunctions() {
  function parseColor(value) {
    const rgb = value.match(/rgba?\(([^)]+)\)/);
    if (rgb) {
      const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
      return {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2]),
        a: parts[3] === undefined ? 1 : Number(parts[3])
      };
    }

    const srgb = value.match(
      /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/
    );
    if (srgb) {
      return {
        r: Number(srgb[1]) * 255,
        g: Number(srgb[2]) * 255,
        b: Number(srgb[3]) * 255,
        a: srgb[4] === undefined ? 1 : Number(srgb[4])
      };
    }

    return null;
  }

  function luminance(color) {
    const channels = [color.r, color.g, color.b].map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function ratio(foreground, background) {
    const first = luminance(foreground);
    const second = luminance(background);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function backgroundOf(element) {
    let node = element;
    while (node && node !== document.documentElement) {
      const background = parseColor(getComputedStyle(node).backgroundColor);
      if (background && background.a > 0.95) {
        return background;
      }
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  window.__pfButtonContrastFor = function (button) {
    const style = getComputedStyle(button);
    const foreground = parseColor(style.color);
    const background = backgroundOf(button);
    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    return {
      text: button.textContent.trim().replace(/\s+/g, " ").slice(0, 60),
      color: style.color,
      background: `rgb(${background.r}, ${background.g}, ${background.b})`,
      ratio: ratio(foreground, background),
      required: large ? 3 : 4.5,
      selector:
        button.tagName.toLowerCase() +
        "." +
        String(button.className).replace(/\s+/g, ".")
    };
  };
}

for (const theme of ["light", "dark"]) {
  test(`button labels stay readable on hover — ${theme}`, async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((selectedTheme) => {
      try {
        localStorage.setItem("pf-theme", selectedTheme);
      } catch (error) {
        /* Storage can be blocked; the hover colors still apply. */
      }
    }, theme);
    await page.addInitScript((seeds) => {
      try {
        const seed = seeds[location.pathname];
        if (!seed) {
          return;
        }
        if (seed.draft) {
          sessionStorage.setItem("pf-booking-draft", JSON.stringify(seed.draft));
        }
        if (seed.confirmed) {
          sessionStorage.setItem(
            "pf-booking-confirmed",
            JSON.stringify(seed.confirmed)
          );
          sessionStorage.removeItem("pf-booking-draft");
        }
      } catch (error) {
        /* Storage can be blocked; the page will redirect or still render. */
      }
    }, SEEDS);

    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "load" });
      await page.waitForSelector("[data-emergency-dock]", { state: "visible" });
      await page.waitForTimeout(120);
      await page.evaluate(contrastFunctions);

      const buttons = page.locator("a.btn, button.btn");
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const button = buttons.nth(index);
        if (!(await button.isVisible())) {
          continue;
        }
        if ((await button.textContent()).trim() === "") {
          continue;
        }
        if (await button.isDisabled().catch(() => false)) {
          continue;
        }

        await button.hover();
        await page.waitForTimeout(140);

        const sample = await button.evaluate((element) =>
          window.__pfButtonContrastFor(element)
        );
        expect(
          sample.ratio,
          `${path} (${theme}) ${sample.text} — ${sample.color} on ${sample.background} (${sample.selector})`
        ).toBeGreaterThanOrEqual(sample.required - 0.01);
      }
    }
  });
}
