import { test, expect } from "@playwright/test";

/**
 * T7 — S11 microinteractions and reduced-motion contract.
 *
 * The first block proves that no element keeps a running animation or
 * transition when the user asks for reduced motion. The second block proves
 * the microinteractions are actually wired (press feedback, slot pop, one
 * dock pulse per load and the success check) for everyone else.
 */

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

const PAGES = [
  "/index.html",
  "/agendar.html",
  "/agendar-paso-2.html",
  "/agendar-paso-3.html",
  "/cita-confirmada.html",
  "/guia-de-estilos.html"
];

function seed(path) {
  if (path === "/agendar-paso-2.html") {
    return [["pf-booking-draft", STEP2_DRAFT]];
  }
  if (path === "/agendar-paso-3.html") {
    return [["pf-booking-draft", STEP3_DRAFT]];
  }
  if (path === "/cita-confirmada.html") {
    return [["pf-booking-confirmed", CONFIRMED]];
  }
  return [];
}

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });

  for (const path of PAGES) {
    test(`${path} — no running animations`, async ({ page }) => {
      const entries = seed(path);
      if (entries.length > 0) {
        await page.addInitScript((pairs) => {
          for (const [key, value] of pairs) {
            sessionStorage.setItem(key, JSON.stringify(value));
          }
        }, entries);
      }

      await page.goto(path, { waitUntil: "load" });
      await page.waitForSelector("[data-emergency-dock]", { state: "visible" });

      // Give the delayed dock pulse and any entrance transition time to start
      // if they had not been disabled.
      await page.waitForTimeout(900);

      expect(
        await page.evaluate(
          () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
      ).toBe(true);

      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running")
          .map((animation) => ({
            target:
              animation.effect && animation.effect.target
                ? animation.effect.target.className ||
                  animation.effect.target.tagName
                : "unknown",
            name: animation.animationName || "transition"
          }))
      );

      expect(
        running,
        `Animations still running on ${path} with reduced motion:\n${JSON.stringify(running, null, 2)}`
      ).toEqual([]);
    });
  }
});

test.describe("microinteractions enabled", () => {
  test.use({ reducedMotion: "no-preference" });

  test("press, slot, dock and success animations are wired", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForSelector("[data-emergency-dock]", { state: "visible" });

    const dock = await page.evaluate(() => {
      const call = document.querySelector(".emergency-dock__call");
      const style = getComputedStyle(call);
      return {
        name: style.animationName,
        iterations: style.animationIterationCount
      };
    });
    expect(dock.name).toBe("pf-dock-pulse");
    expect(dock.iterations).toBe("1");

    const press = await page.evaluate(() => {
      const button = document.querySelector(".btn--primary");
      return getComputedStyle(button).transitionProperty;
    });
    expect(press).toContain("transform");

    await page.addInitScript((draft) => {
      sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
    }, STEP2_DRAFT);
    await page.goto("/agendar-paso-2.html");
    await page.waitForSelector("[data-calendar-grid] button", { state: "visible" });
    const selectedDay = page.locator(
      '[data-calendar-grid] button[aria-pressed="true"]'
    );
    if ((await selectedDay.count()) === 0) {
      await page.locator('[data-calendar-grid] button:not([disabled])').first().click();
    }
    expect(
      await page
        .locator('[data-calendar-grid] button[aria-pressed="true"]')
        .first()
        .evaluate((element) => getComputedStyle(element).animationName)
    ).toBe("pf-pop");

    await page.addInitScript((confirmed) => {
      sessionStorage.setItem("pf-booking-confirmed", JSON.stringify(confirmed));
    }, CONFIRMED);
    await page.goto("/cita-confirmada.html");
    await page.waitForSelector(".confirmation-icon", { state: "visible" });
    expect(
      await page
        .locator(".confirmation-icon")
        .evaluate((element) => getComputedStyle(element).animationName)
    ).toBe("pf-check-pop");
  });
});
