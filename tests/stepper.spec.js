import { test, expect } from "@playwright/test";

/**
 * T10 — booking stepper geometry (S7, S10).
 * The three markers must share one center line, labels must start on one
 * baseline, and every connector must stay outside the circles at 390/1440 in
 * both themes. Also guards the accessible current-step contract.
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
  ownerPhone: "0212-5551234",
  ownerEmail: "ana@example.com",
  notes: ""
};

const PAGES = [
  { path: "/agendar.html", draft: null },
  { path: "/agendar-paso-2.html", draft: STEP2_DRAFT },
  { path: "/agendar-paso-3.html", draft: STEP3_DRAFT }
];

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1000", width: 1000, height: 800 },
  { name: "1440", width: 1440, height: 900 }
];

function intersects(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

for (const viewport of VIEWPORTS) {
  for (const theme of ["light", "dark"]) {
    test.describe(`${viewport.name} · ${theme}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce"
      });

      for (const pageInfo of PAGES) {
        test(`${pageInfo.path} — stepper geometry`, async ({ page }) => {
          if (pageInfo.draft) {
            await page.addInitScript((draft) => {
              sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft));
            }, pageInfo.draft);
          }
          await page.addInitScript((selectedTheme) => {
            try {
              localStorage.setItem("pf-theme", selectedTheme);
            } catch (error) {
              /* Storage can be blocked; the geometry still applies. */
            }
          }, theme);

          await page.goto(pageInfo.path, { waitUntil: "load" });
          await page.waitForSelector(".stepper__marker", { state: "visible" });

          const geometry = await page.evaluate(() => {
            const rect = (element) => {
              const box = element.getBoundingClientRect();
              return {
                left: box.left,
                top: box.top,
                right: box.right,
                bottom: box.bottom,
                width: box.width,
                height: box.height,
                centerX: box.left + box.width / 2,
                centerY: box.top + box.height / 2
              };
            };
            return {
              markers: Array.from(
                document.querySelectorAll(".stepper__marker")
              ).map(rect),
              lines: Array.from(document.querySelectorAll(".stepper__line")).map(
                rect
              ),
              labels: Array.from(document.querySelectorAll(".stepper__label")).map(
                rect
              ),
              current: document.querySelectorAll(
                '.stepper__item[aria-current="step"]'
              ).length,
              overflow:
                document.documentElement.scrollWidth - window.innerWidth,
              stepper: (() => {
                const box = document
                  .querySelector(".stepper")
                  .getBoundingClientRect();
                return { left: box.left, right: box.right };
              })(),
              form: (() => {
                const container =
                  document.querySelector(".booking-main") ||
                  document.querySelector(".booking-form");
                const box = container.getBoundingClientRect();
                return { left: box.left, right: box.right };
              })()
            };
          });

          expect(geometry.markers).toHaveLength(3);
          expect(geometry.lines).toHaveLength(2);
          expect(geometry.current, "exactly one current step").toBe(1);
          expect(geometry.overflow, "no horizontal overflow").toBeLessThanOrEqual(0);
          expect(
            Math.abs(geometry.stepper.left - geometry.form.left),
            "stepper starts with the form column"
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(geometry.stepper.right - geometry.form.right),
            "stepper ends with the form column"
          ).toBeLessThanOrEqual(1);

          const centers = geometry.markers.map((marker) => marker.centerY);
          const spread = Math.max(...centers) - Math.min(...centers);
          expect(
            spread,
            `marker centers differ by ${spread}px: ${JSON.stringify(centers)}`
          ).toBeLessThanOrEqual(1);

          const sizes = geometry.markers.map(
            (marker) => `${marker.width}x${marker.height}`
          );
          expect(new Set(sizes).size, `marker sizes: ${sizes.join(", ")}`).toBe(1);

          const labelTops = geometry.labels.map((label) => label.top);
          const labelSpread =
            Math.max(...labelTops) - Math.min(...labelTops);
          expect(
            labelSpread,
            `label tops differ by ${labelSpread}px: ${JSON.stringify(labelTops)}`
          ).toBeLessThanOrEqual(1);

          for (const line of geometry.lines) {
            expect(line.width, "connector needs a visible length").toBeGreaterThan(0);
            for (const marker of geometry.markers) {
              expect(
                intersects(line, marker),
                `connector ${JSON.stringify(line)} overlaps marker ${JSON.stringify(marker)}`
              ).toBe(false);
            }
          }

          expect(
            await page.locator(".stepper__line--1").evaluate((element) =>
              element.classList.contains("is-complete")
            )
          ).toBe(pageInfo.path !== "/agendar.html");

          const checks = await page
            .locator('.stepper__item.is-complete .stepper__marker use[href="#icon-check"]')
            .count();
          const expectedChecks = pageInfo.path === "/agendar.html" ? 0 : pageInfo.path === "/agendar-paso-2.html" ? 1 : 2;
          expect(checks, "completed steps show a check icon").toBe(expectedChecks);
        });
      }
    });
  }
}
