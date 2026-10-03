import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  const response = await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`/login returned HTTP ${response?.status() ?? "unknown"}`);
  console.log("PASS: browser can reach /login");
  const cadastro = await page.request.get(`${baseURL}/cadastro`);
  if (!cadastro.ok()) throw new Error(`/cadastro returned HTTP ${cadastro.status()}`);
  console.log("PASS: browser can reach /cadastro");
} finally {
  await browser.close();
}
