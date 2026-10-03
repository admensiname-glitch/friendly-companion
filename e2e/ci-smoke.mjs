import { chromium } from "playwright";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  await page.goto(baseURL + "/login", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /entre na sua conta/i }).waitFor({ timeout: 10000 });
  console.log("PASS: login renders");
  await page.getByRole("link", { name: /criar conta/i }).click();
  await page.waitForURL(/\/cadastro$/, { timeout: 10000 });
  console.log("PASS: cadastro navigation");
} finally { await browser.close(); }
