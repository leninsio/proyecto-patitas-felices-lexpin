import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test.use({ reducedMotion: "reduce" });

/**
 * T6 — booking flow (S5, S8, S9, S10).
 * Covers the ideal path and every mandatory alternate path in the contract:
 * emergency, conflict, validation, back, abandon/resume, guards, .ics and
 * WhatsApp sharing.
 */

const PHONE = "0412-5550198";
const EMAIL = "ana@example.com";

const STEP1_DRAFT = {
  service: "consulta",
  petType: "perro",
  petName: "Miga",
  petAge: "8 meses",
  step: 1,
  updatedAt: Date.now()
};

const STEP2_DRAFT = {
  ...STEP1_DRAFT,
  date: "2027-01-04",
  time: "09:30",
  step: 2
};

function nextWeekdayKey() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

async function fillStep1(page, values = {}) {
  await page.fill("#pet-name", values.petName || "Miga");
  await page.fill("#pet-age", values.petAgeValue || "8");
  await page.selectOption("#pet-age-unit", values.petAgeUnit || "meses");
}

async function scrollToElement(page, locator) {
  await locator.evaluate((element) => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    element.scrollIntoView({ block: "center", inline: "center" });
    html.style.scrollBehavior = previous;
  });
  await page.waitForTimeout(50);
}

async function clickCentered(page, locator) {
  await scrollToElement(page, locator);
  await locator.click();
}

async function continueStep1(page) {
  await clickCentered(page, page.locator("[data-step1-continue]"));
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);
}

async function chooseDayAndSlot(page, click) {
  const clickFn = click || ((locator) => clickCentered(page, locator));
  const demoDate = nextWeekdayKey();
  const day = page.locator(
    `[data-calendar-grid] button[data-date="${demoDate}"]`
  );
  await expect(day).toBeVisible();
  await clickFn(day);

  const slots = page.locator(
    '[data-slot-grid] button[data-time]:not([disabled])'
  );
  await expect(slots.first()).toBeVisible();

  const count = await slots.count();
  for (let index = 0; index < count; index += 1) {
    const time = await slots.nth(index).getAttribute("data-time");
    if (time !== "09:00") {
      await clickFn(slots.nth(index));
      return { date: demoDate, time };
    }
  }
  throw new Error("No non-conflict slot available for the ideal path");
}

async function continueStep2(page) {
  await clickCentered(page, page.locator("[data-step2-continue]"));
  await expect(page).toHaveURL(/\/agendar-paso-3\.html$/);
}

async function fillOwner(page, values = {}) {
  await page.fill("#owner-name", values.name || "Ana Pérez");
  await page.fill("#owner-phone", values.phone || PHONE);
  await page.fill("#owner-email", values.email || EMAIL);
  if (values.notes) {
    await page.fill("#owner-notes", values.notes);
  }
}

async function reachStep3(page) {
  await page.goto("/agendar.html");
  await fillStep1(page);
  await continueStep1(page);
  const selected = await chooseDayAndSlot(page);
  await continueStep2(page);
  return selected;
}

async function completeBooking(page) {
  const selected = await reachStep3(page);
  await fillOwner(page);
  await clickCentered(page, page.locator("[data-step3-confirm]"));
  await expect(page).toHaveURL(/\/cita-confirmada\.html$/);
  return selected;
}

test("ideal path from index.html reaches the confirmation in six primary clicks", async ({ page }) => {
  let clicks = 0;
  const click = async (locator) => {
    clicks += 1;
    await scrollToElement(page, locator);
    await locator.click();
  };

  await page.goto("/index.html");
  await click(page.locator(".hero__actions a.btn--light"));
  await expect(page).toHaveURL(/\/agendar\.html$/);

  await expect(page.locator(".booking-step-label")).toHaveText("Paso 1 de 3");
  await expect(page.locator('input[name="service"][value="consulta"]')).toBeChecked();
  await expect(page.locator('input[name="petType"][value="perro"]')).toBeChecked();

  await fillStep1(page);
  await click(page.locator("[data-step1-continue]"));
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);

  const selected = await chooseDayAndSlot(page, click);
  await click(page.locator("[data-step2-continue]"));
  await expect(page).toHaveURL(/\/agendar-paso-3\.html$/);

  await fillOwner(page);
  await click(page.locator("[data-step3-confirm]"));
  await expect(page).toHaveURL(/\/cita-confirmada\.html$/);

  expect(clicks, "primary clicks besides form typing").toBeLessThanOrEqual(6);
  expect(clicks).toBe(6);

  await expect(page.locator("[data-booking-code]")).toHaveText(
    /^PF-\d{4}-[A-Z0-9]{4}$/
  );
  await expect(page.locator("[data-confirmed-service]")).toHaveText(
    "Consulta general"
  );
  await expect(page.locator("[data-confirmed-pet]")).toContainText("Miga");
  await expect(page.locator("[data-confirmed-date]")).not.toHaveText(
    "Por confirmar"
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("pf-booking-draft"))
  ).toBeNull();
  expect(selected.time).not.toBe("09:00");
});

test("Instagram entry opens agendar.html directly on step 1", async ({ page }) => {
  await page.goto("/agendar.html");
  await expect(page.locator("h1")).toHaveText("Agendar cita");
  await expect(page.locator(".booking-step-label")).toHaveText("Paso 1 de 3");
  await expect(page.locator('input[name="service"][value="consulta"]')).toBeChecked();
  await expect(page.locator("[data-booking-content]")).toBeVisible();
  await expect(page.locator("[data-resume-banner]")).toBeHidden();
});

test("service detail preselects the service from the query string", async ({ page }) => {
  await page.goto("/servicio.html?s=vacunacion");
  await page.waitForSelector("[data-service-book]");
  await page.locator("[data-service-book]").first().click();
  await expect(page).toHaveURL(/\/agendar\.html\?servicio=vacunacion$/);
  await expect(page.locator('input[name="service"][value="vacunacion"]')).toBeChecked();
  await expect(page.locator("[data-summary-service]")).toHaveText("Vacunación");
  await expect(page.locator("[data-summary-price]")).toHaveText("Desde $35");
});

test("emergency Sí stops the form and shows call and WhatsApp", async ({ page }) => {
  await page.goto("/agendar.html");
  await expect(page.locator("[data-booking-content]")).toBeVisible();
  await page
    .locator("label.radio-card", { hasText: "Sí, es una emergencia" })
    .click();

  await expect(page.locator("[data-emergency-panel]")).toBeVisible();
  await expect(page.locator("[data-booking-content]")).toBeHidden();
  await expect(
    page.locator('[data-emergency-panel] a[href^="tel:"]')
  ).toBeVisible();
  await expect(
    page.locator('[data-emergency-panel] a[href*="wa.me"]')
  ).toBeVisible();
  await expect(page).toHaveURL(/\/agendar\.html$/);

  await page
    .getByRole("button", { name: /volver al formulario/i })
    .click();
  await expect(page.locator("[data-booking-content]")).toBeVisible();
  await expect(page.locator("[data-emergency-panel]")).toBeHidden();
});

test("empty pet fields show inline errors and focus the first invalid field", async ({ page }) => {
  await page.goto("/agendar.html");
  const continueButton = page.locator("[data-step1-continue]");
  await expect(continueButton).toBeEnabled();
  await clickCentered(page, continueButton);

  await expect(page.locator("#pet-name-error")).toBeVisible();
  await expect(page.locator("#pet-age-error")).toBeVisible();
  await expect(page.locator("#pet-name")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  await expect(page.locator("#pet-name")).toHaveAttribute(
    "aria-describedby",
    "pet-name-error"
  );
  await expect(page.locator("#pet-name")).toBeFocused();
  await expect(page).toHaveURL(/\/agendar\.html$/);
});

test("invalid phone and email show inline errors on blur and submit", async ({ page }) => {
  await reachStep3(page);
  await page.fill("#owner-name", "Ana Pérez");

  await page.fill("#owner-phone", "412-55");
  await page.locator("#owner-phone").blur();
  await expect(page.locator("#owner-phone-error")).toBeVisible();

  await page.fill("#owner-email", "ana@");
  await page.locator("#owner-email").blur();
  await expect(page.locator("#owner-email-error")).toBeVisible();

  const confirmButton = page.locator("[data-step3-confirm]");
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect(page).toHaveURL(/\/agendar-paso-3\.html$/);
  await expect(page.locator("#owner-phone-error")).toContainText("11 dígitos");
  await expect(page.locator("#owner-email-error")).toContainText(
    "correo válido"
  );
  await expect(page.locator("#owner-phone")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  await expect(page.locator("#owner-email")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  await expect(page.locator("#owner-phone")).toHaveAttribute(
    "aria-describedby",
    "owner-phone-error"
  );
  await expect(page.locator("#owner-email")).toHaveAttribute(
    "aria-describedby",
    "owner-email-error"
  );
  await expect(page.locator("#owner-phone")).toBeFocused();

  await page.fill("#owner-phone", PHONE);
  await page.fill("#owner-email", EMAIL);
  await confirmButton.click();
  await expect(page).toHaveURL(/\/cita-confirmada\.html$/);
});

test("Venezuelan landline 02XX is accepted and invalid phones are still rejected", async ({ page }) => {
  await reachStep3(page);
  await page.fill("#owner-name", "Rafael Méndez");

  await page.fill("#owner-phone", "0212-555");
  await page.locator("#owner-phone").blur();
  await expect(page.locator("#owner-phone-error")).toContainText("11 dígitos");

  await page.fill("#owner-phone", "0312-5551234");
  await page.locator("#owner-phone").blur();
  await expect(page.locator("#owner-phone-error")).toBeVisible();
  await expect(page.locator("#owner-phone")).toHaveAttribute(
    "aria-invalid",
    "true"
  );

  await page.fill("#owner-phone", "0212-5551234");
  await page.locator("#owner-phone").blur();
  await expect(page.locator("#owner-phone-error")).toBeHidden();
  await page.fill("#owner-email", "rafael@example.com");
  await clickCentered(page, page.locator("[data-step3-confirm]"));
  await expect(page).toHaveURL(/\/cita-confirmada\.html$/);
  await expect(page.locator("[data-confirmed-phone]")).toHaveText(
    "0212-5551234"
  );
});

test("step 2 explains why it cannot continue without a slot", async ({ page }) => {
  await page.goto("/agendar.html");
  await fillStep1(page);
  await continueStep1(page);

  const continueButton = page.locator("[data-step2-continue]");
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await expect(page.locator("[data-step2-error]")).toBeVisible();
  await expect(page.locator("[data-step2-error]")).toContainText(
    "Elige un día y un horario"
  );
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);
});

test("demo conflict returns to step 2 with three alternatives and keeps data", async ({ page }) => {
  await page.goto("/agendar.html");
  await fillStep1(page);
  await continueStep1(page);

  await clickCentered(page, page.locator("[data-demo-conflict]"));
  await expect(
    page.locator('[data-calendar-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-date", nextWeekdayKey());
  await expect(
    page.locator('[data-slot-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-time", "09:00");

  await continueStep2(page);
  await fillOwner(page);
  await clickCentered(page, page.locator("[data-step3-confirm]"));

  await expect(page).toHaveURL(/\/agendar-paso-2\.html\?conflicto=1$/);
  await expect(page.locator("[data-conflict-alert]")).toBeVisible();
  await expect(page.locator("[data-conflict-alert]")).toContainText(
    "se ocupó mientras completabas la cita"
  );
  await expect(page.locator("[data-alternative]")).toHaveCount(3);
  await expect(page.locator("[data-summary-service]")).toHaveText(
    "Consulta general"
  );
  await expect(page.locator("[data-summary-pet]")).toContainText("Miga");
  await expect(
    page.locator('[data-slot-grid] button[data-time="09:00"]')
  ).toBeDisabled();

  const firstAlternative = page.locator("[data-alternative]").first();
  const alternativeTime = await firstAlternative.getAttribute("data-time");
  await firstAlternative.click();

  await expect(page.locator("[data-conflict-alert]")).toBeHidden();
  await expect(
    page.locator('[data-slot-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-time", alternativeTime);

  await continueStep2(page);
  await expect(page).toHaveURL(/\/agendar-paso-3\.html$/);
  await expect(page.locator("#owner-name")).toHaveValue("Ana Pérez");
  await expect(page.locator("#owner-phone")).toHaveValue(PHONE);
  await expect(page.locator("#owner-email")).toHaveValue(EMAIL);

  await clickCentered(page, page.locator("[data-step3-confirm]"));
  await expect(page).toHaveURL(/\/cita-confirmada\.html$/);
});

test("back buttons and browser back keep the draft data", async ({ page }) => {
  await page.goto("/agendar.html");
  await fillStep1(page);
  await continueStep1(page);
  const selected = await chooseDayAndSlot(page);

  await clickCentered(page, page.locator("[data-step2-back]"));
  await expect(page).toHaveURL(/\/agendar\.html$/);
  await expect(page.locator("#pet-name")).toHaveValue("Miga");
  await expect(page.locator("#pet-age")).toHaveValue("8");
  await expect(page.locator("#pet-age-unit")).toHaveValue("meses");
  await expect(page.locator('input[name="service"][value="consulta"]')).toBeChecked();

  await continueStep1(page);
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);
  await expect(
    page.locator('[data-calendar-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-date", selected.date);
  await expect(
    page.locator('[data-slot-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-time", selected.time);

  await continueStep2(page);
  await expect(page).toHaveURL(/\/agendar-paso-3\.html$/);
  await clickCentered(page, page.locator("[data-step3-back]"));
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);
  await expect(
    page.locator('[data-slot-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-time", selected.time);

  await page.goBack();
  await expect(page).toHaveURL(/\/agendar-paso-3\.html$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/agendar\.html$/);
  await expect(page.locator("#pet-name")).toHaveValue("Miga");
  await expect(page.locator("#pet-age")).toHaveValue("8");
  await expect(page.locator("#pet-age-unit")).toHaveValue("meses");
});

test("abandon modal saves, resume banner continues and discard clears", async ({ page }) => {
  const nativeDialogs = [];
  page.on("dialog", (dialog) => {
    nativeDialogs.push(dialog.type());
    dialog.dismiss();
  });

  await page.goto("/agendar.html");
  await fillStep1(page);
  await continueStep1(page);
  const selected = await chooseDayAndSlot(page);

  await page.locator(".site-nav__link", { hasText: "Inicio" }).click();
  await expect(page.locator("#exit-modal")).toBeVisible();
  expect(
    await page.locator("#exit-modal").evaluate((element) => element.tagName)
  ).toBe("DIALOG");
  await expect(page.locator("#exit-modal-title")).toHaveText("¿Quieres salir?");
  await expect(page.locator("[data-exit-save]")).toBeVisible();
  await expect(page.locator("[data-exit-cancel]").first()).toBeVisible();

  await page.getByRole("button", { name: "Seguir agendando" }).click();
  await expect(page.locator("#exit-modal")).toBeHidden();
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);

  await page.locator(".site-nav__link", { hasText: "Inicio" }).click();
  await expect(page.locator("#exit-modal")).toBeVisible();
  await page.locator("[data-exit-save]").click();
  await expect(page).toHaveURL(/\/index\.html$/);
  expect(nativeDialogs).toEqual([]);

  await page.goto("/agendar.html");
  await expect(page.locator("[data-resume-banner]")).toBeVisible();
  await expect(page.locator("[data-resume-banner]")).toContainText(
    "Continuar donde lo dejaste"
  );
  await expect(page.locator("[data-resume-banner]")).toContainText("paso 2 de 3");

  await page.locator("[data-resume]").click();
  await expect(page).toHaveURL(/\/agendar-paso-2\.html$/);
  await expect(
    page.locator('[data-calendar-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-date", selected.date);
  await expect(
    page.locator('[data-slot-grid] button[aria-pressed="true"]')
  ).toHaveAttribute("data-time", selected.time);

  await page.goto("/agendar.html");
  await page.locator("[data-discard]").click();
  await expect(page.locator("[data-resume-banner]")).toBeHidden();
  expect(
    await page.evaluate(() => sessionStorage.getItem("pf-booking-draft"))
  ).toBeNull();
});

test("direct access to step 2, step 3 and confirmation is guarded", async ({ page }) => {
  await page.goto("/agendar-paso-2.html");
  await expect(page).toHaveURL(/\/agendar\.html\?aviso=paso1$/);
  await expect(page.locator("[data-guard-notice]")).toBeVisible();
  await expect(page.locator("[data-guard-notice]")).toContainText(
    "Completa el servicio"
  );

  await page.goto("/cita-confirmada.html");
  await expect(page).toHaveURL(/\/agendar\.html\?aviso=paso1$/);
  await expect(page.locator("[data-guard-notice]")).toBeVisible();

  await page.addInitScript(
    (draft) => sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft)),
    STEP1_DRAFT
  );
  await page.goto("/agendar-paso-3.html");
  await expect(page).toHaveURL(/\/agendar-paso-2\.html\?aviso=paso2$/);
  await expect(page.locator("[data-guard-notice]")).toContainText(
    "Elige una fecha"
  );

  await page.addInitScript(
    (draft) => sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft)),
    STEP2_DRAFT
  );
  await page.goto("/cita-confirmada.html");
  await expect(page).toHaveURL(/\/agendar-paso-3\.html\?aviso=paso3$/);
  await expect(page.locator("[data-guard-notice]")).toContainText(
    "Completa los datos del dueño"
  );
});

test("draft expires after 24 hours", async ({ page }) => {
  await page.addInitScript(
    (draft) => sessionStorage.setItem("pf-booking-draft", JSON.stringify(draft)),
    {
      ...STEP1_DRAFT,
      updatedAt: Date.now() - 25 * 60 * 60 * 1000
    }
  );
  await page.goto("/agendar.html");
  await expect(page.locator("[data-resume-banner]")).toBeHidden();
  expect(
    await page.evaluate(() => sessionStorage.getItem("pf-booking-draft"))
  ).toBeNull();
});

test("calendar download is a valid .ics with the booking date", async ({ page }) => {
  const selected = await completeBooking(page);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-ics]").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("patitas-felices-cita.ics");
  const path = await download.path();
  const content = readFileSync(path, "utf8");

  expect(content).toContain("BEGIN:VCALENDAR");
  expect(content).toContain("BEGIN:VEVENT");
  expect(content).toContain("SUMMARY:Consulta general");
  expect(content).toContain("END:VCALENDAR");
  expect(content).toContain("\r\n");
  expect(content).toMatch(/DTSTART:\d{8}T\d{6}/);
  expect(content).toMatch(/DTEND:\d{8}T\d{6}/);
  expect(content).toContain("DTSTART:" + selected.date.replace(/-/g, ""));
});

test("WhatsApp share link contains the booking summary", async ({ page }) => {
  await completeBooking(page);
  const code = await page.locator("[data-booking-code]").textContent();
  const href = await page.locator("[data-whatsapp-share]").getAttribute("href");

  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  const text = new URL(href).searchParams.get("text");
  expect(text).toContain("Código: " + code);
  expect(text).toContain("Consulta general");
  expect(text).toContain("Miga");
  expect(text).toContain("Patitas Felices");
});

test("booking pages keep the theme toggle and no horizontal overflow", async ({ page }) => {
  await page.goto("/agendar.html");
  const before = await page.evaluate(() => {
    const explicit = document.documentElement.getAttribute("data-theme");
    if (explicit) {
      return explicit;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  await page.locator("[data-theme-toggle]").click();
  const after = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  expect(after).toMatch(/^(light|dark)$/);
  expect(after).not.toBe(before);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(overflow).toBe(true);
});
