import { test, expect } from "@playwright/test";

/**
 * T13 regressions: centered exit modal, non-stretched fields and the
 * number + unit pet age with legacy draft migration.
 */

async function fillPetBasics(page) {
  await page.fill("#pet-name", "Miga");
  await page.fill("#pet-age", "8");
  await page.selectOption("#pet-age-unit", "meses");
}

for (const viewport of [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 }
]) {
  test(`exit modal is centered at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/agendar.html");
    await fillPetBasics(page);
    await page.locator(".brand").click();
    await page.waitForSelector("#exit-modal[open]");
    await page.waitForTimeout(350);

    const box = await page.locator("#exit-modal").evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });

    if (viewport.width <= 640) {
      expect(Math.abs(box.bottom - box.viewportHeight)).toBeLessThanOrEqual(2);
      expect(Math.abs(box.width - box.viewportWidth)).toBeLessThanOrEqual(2);
      expect(Math.abs(box.left)).toBeLessThanOrEqual(2);
    } else {
      const centerX = box.left + box.width / 2;
      const centerY = box.top + (box.bottom - box.top) / 2;
      expect(Math.abs(centerX - box.viewportWidth / 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(centerY - box.viewportHeight / 2)).toBeLessThanOrEqual(2);
    }
  });
}

test("an age error does not stretch the sibling pet-name field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/agendar.html");
  await page.fill("#pet-name", "Miga");
  await page.fill("#pet-age", "99999");
  await page.locator("#pet-age").blur();

  await expect(page.locator("#pet-age-error")).toBeVisible();
  const geometry = await page.evaluate(() => {
    const name = document.querySelector("#pet-name").getBoundingClientRect();
    const age = document.querySelector("#pet-age").getBoundingClientRect();
    return {
      nameHeight: name.height,
      ageHeight: age.height,
      nameTop: name.top,
      ageTop: age.top
    };
  });

  expect(geometry.nameHeight).toBeLessThanOrEqual(60);
  expect(geometry.nameHeight).toBeCloseTo(geometry.ageHeight, 0);
  expect(Math.abs(geometry.nameTop - geometry.ageTop)).toBeLessThanOrEqual(1);
});

test("pet age is a number and unit and is saved in the draft", async ({ page }) => {
  await page.goto("/agendar.html");
  await page.fill("#pet-name", "Miga");
  await page.fill("#pet-age", "8");
  await page.selectOption("#pet-age-unit", "meses");
  await page.locator("[data-step1-continue]").click();
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);

  const draft = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("pf-booking-draft"))
  );
  expect(draft.petAge).toBe("8 meses");
  expect(draft.petAgeValue).toBe("8");
  expect(draft.petAgeUnit).toBe("meses");
});

test("legacy free-text drafts migrate to number + unit", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "pf-booking-draft",
      JSON.stringify({
        service: "consulta",
        petType: "perro",
        petName: "Miga",
        petAge: "3 años",
        step: 1,
        updatedAt: Date.now()
      })
    );
  });
  await page.goto("/agendar.html");
  await expect(page.locator("#pet-age")).toHaveValue("3");
  await expect(page.locator("#pet-age-unit")).toHaveValue("años");
});

test("invalid age still blocks the step with an inline message", async ({ page }) => {
  await page.goto("/agendar.html");
  await page.fill("#pet-name", "Miga");
  await page.fill("#pet-age", "99999");
  await page.selectOption("#pet-age-unit", "meses");
  await page.locator("[data-step1-continue]").click();

  await expect(page).toHaveURL(/\/agendar\.html$/);
  await expect(page.locator("#pet-age-error")).toContainText(
    "edad válida entre 1 mes y 30 años"
  );
  await expect(page.locator("#pet-age")).toHaveAttribute("aria-invalid", "true");
});
