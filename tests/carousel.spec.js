import { test, expect } from "@playwright/test";

/**
 * T16 — accessible team carousel.
 * 1 card at 390, 3 at 1440; buttons, dots, keyboard arrows, native swipe
 * (scroll-snap) and no autoplay. Reduced motion must remove smooth scrolling.
 */

for (const viewport of [
  { name: "390", width: 390, height: 844, cards: 1, dots: 4 },
  { name: "1440", width: 1440, height: 900, cards: 3, dots: 2 }
]) {
  test(`team carousel at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/equipo.html");
    await page.waitForSelector(".team-carousel__track");

    const state = await page.evaluate(() => {
      const track = document.querySelector(".team-carousel__track");
      const slides = Array.from(track.querySelectorAll("[data-carousel-slide]"));
      const visible = slides.filter((slide) => {
        const box = slide.getBoundingClientRect();
        const trackBox = track.getBoundingClientRect();
        return box.left >= trackBox.left - 1 && box.right <= trackBox.right + 1;
      }).length;
      return {
        visible,
        scrollSnap: getComputedStyle(track).scrollSnapType,
        overflowX: getComputedStyle(track).overflowX,
        dots: document.querySelectorAll(".team-carousel__dot").length,
        previousDisabled: document.querySelector("[data-carousel-prev]").disabled,
        nextDisabled: document.querySelector("[data-carousel-next]").disabled
      };
    });

    expect(state.visible).toBe(viewport.cards);
    expect(state.scrollSnap).toContain("x");
    expect(state.overflowX).toBe("auto");
    expect(state.dots).toBe(viewport.dots);
    expect(state.previousDisabled).toBe(true);
    expect(state.nextDisabled).toBe(false);

    const before = await page.locator(".team-carousel__track").evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(900);
    const afterIdle = await page.locator(".team-carousel__track").evaluate((el) => el.scrollLeft);
    expect(afterIdle, "no autoplay").toBe(before);

    await page.locator("[data-carousel-next]").click();
    await page.waitForTimeout(700);
    const afterNext = await page.locator(".team-carousel__track").evaluate((el) => el.scrollLeft);
    expect(afterNext).toBeGreaterThan(before);
    await expect(page.locator(".team-carousel__dot[aria-current='true']")).toHaveCount(1);

    await page.locator(".team-carousel__track").focus();
    const beforeKey = await page.locator(".team-carousel__track").evaluate((el) => el.scrollLeft);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(700);
    const afterKey = await page.locator(".team-carousel__track").evaluate((el) => el.scrollLeft);
    expect(afterKey).toBeLessThan(beforeKey);
  });
}

test("reduced motion disables smooth scrolling in the carousel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/equipo.html");
  const behavior = await page
    .locator(".team-carousel__track")
    .evaluate((el) => getComputedStyle(el).scrollBehavior);
  expect(behavior).toBe("auto");
});

test("the home page also uses the team carousel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/index.html");
  await expect(page.locator("[data-carousel] .team-carousel__slide")).toHaveCount(4);
  await expect(page.locator("[data-carousel] .team-carousel__dot")).toHaveCount(4);
});
