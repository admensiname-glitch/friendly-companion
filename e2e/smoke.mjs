import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

const protectedRoutes = [
  "/app/dashboard",
  "/app/disciplinas",
  "/app/catalogo",
  "/app/estude-agora",
  "/app/revisao",
  "/app/desempenho",
  "/app/perfil",
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

async function expectLoginRedirect(path) {
  await page.goto(baseURL + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (!page.url().match(/\/login(?:$|\?)/)) {
    throw new Error(`Expected ${path} to redirect to /login, got ${page.url()}`);
  }
  await page.getByRole("heading", { name: /entre na sua conta/i }).waitFor({ timeout: 10000 });
  console.log(`PASS: protected route ${path} redirects to /login`);
}

try {
  for (const path of protectedRoutes) {
    await expectLoginRedirect(path);
  }

  await page.getByRole("link", { name: /criar conta/i }).click();
  await page.waitForURL(/\/cadastro$/, { timeout: 10000 });
  await page.getByRole("heading", { name: /crie sua conta/i }).waitFor();
  console.log("PASS: /login -> /cadastro navigation works");

  await page.goto(baseURL + "/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /entrar/i }).first().click();
  await page.waitForURL(/\/login$/, { timeout: 10000 });
  console.log("PASS: home -> /login navigation works");

  if (!email || !password) {
    console.log("SKIP: authenticated student-flow E2E (E2E_TEST_EMAIL/E2E_TEST_PASSWORD not configured)");
  } else {
    await page.goto(baseURL + "/login", { waitUntil: "networkidle" });
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/(app\/[^?]*|onboarding)(?:$|\?)/, { timeout: 20000 });

    if (page.url().includes("/onboarding")) {
      console.log("PASS: authenticated user reaches onboarding");
    } else {
      const checks = [
        ["/app/dashboard", /seu espaço de aprendizagem/i],
        ["/app/disciplinas", /minhas disciplinas|disciplinas/i],
        ["/app/catalogo", /catálogo/i],
        ["/app/estude-agora", /estudar agora|estude agora/i],
        ["/app/revisao", /revisão/i],
        ["/app/desempenho", /desempenho/i],
        ["/app/perfil", /perfil|preferências/i],
      ];

      for (const [path, heading] of checks) {
        await page.goto(baseURL + path, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        await page.getByText(heading).first().waitFor({ timeout: 10000 });
        console.log(`PASS: authenticated route ${path} renders`);
      }

      await page.goto(baseURL + "/app/dashboard", { waitUntil: "networkidle" });
      const mobileNav = page.getByRole("navigation", { name: /navegação rápida/i });
      await mobileNav.waitFor();
      await mobileNav.getByRole("link", { name: "Disciplinas" }).click();
      await page.waitForURL(/\/app\/disciplinas$/, { timeout: 10000 });
      console.log("PASS: mobile bottom navigation works");

      await page.goto(baseURL + "/app/dashboard", { waitUntil: "networkidle" });
      const more = page.getByRole("button", { name: /abrir mais opções/i });
      await more.click();
      await page.getByRole("heading", { name: /guia do aluno/i }).waitFor();
      console.log("PASS: mobile 'Mais' guide opens");
    }
  }
} finally {
  await browser.close();
}
