import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(`${baseURL}/app/dashboard`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login(?:$|\?)/, { timeout: 12000 });
  await page.getByRole("heading", { name: /entre na sua conta/i }).waitFor({ timeout: 10000 });
  console.log("PASS: /app/dashboard redirects unauthenticated users to /login");

  await page.getByRole("link", { name: /criar conta/i }).click();
  await page.waitForURL(/\/cadastro$/, { timeout: 10000 });
  console.log("PASS: /login -> /cadastro navigation works");

  if (!email || !password) {
    console.log("SKIP: authenticated smoke test (E2E_TEST_EMAIL/E2E_TEST_PASSWORD not configured)");
  } else {
    await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/(app\/dashboard|onboarding)(?:$|\/)/, { timeout: 20000 });
    if (page.url().includes("/app/dashboard")) {
      await page.getByText(/seu espaço de aprendizagem/i).waitFor();
      console.log("PASS: authenticated user reaches dashboard");
    } else {
      console.log("PASS: authenticated user reaches onboarding");
    }
  }
} finally {
  await browser.close();
}
