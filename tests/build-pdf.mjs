#!/usr/bin/env node
/**
 * T8 — render docs/informe.html to docs/informe.pdf with Playwright.
 * A4, print background, CSS page size. The HTML uses one .page per sheet.
 *
 * Run with: node tests/build-pdf.mjs
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(projectRoot, "docs", "informe.html");
const target = path.join(projectRoot, "docs", "informe.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(pathToFileURL(source).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.pdf({
    path: target,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false
  });
  console.log(`PDF written: ${path.relative(projectRoot, target)}`);
} finally {
  await browser.close();
}
