import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  const response = await page.goto(baseURL + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`home returned HTTP ${response?.status() ?? "unknown"}`);
  console.log("PASS: browser reaches production preview");
} finally {
  await browser.close();
}
