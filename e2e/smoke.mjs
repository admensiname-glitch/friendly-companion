import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const protectedRoutes = ["/app/dashboard","/app/disciplinas","/app/catalogo","/app/estude-agora","/app/revisao","/app/desempenho","/app/perfil"];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

async function expectLoginRedirect(path) {
  await page.goto(baseURL + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (!page.url().match(/\/login(?:$|\?)/)) throw new Error(`Expected ${path} to redirect to /login, got ${page.url()}`);
  await page.getByRole("heading", { name: /entre na sua conta/i }).waitFor({ timeout: 10000 });
  console.log(`PASS: protected route ${path} redirects to /login`);
}
async function expectText(pattern, label) {
  await page.getByText(pattern).first().waitFor({ timeout: 15000 });
  console.log(`PASS: ${label}`);
}

try {
  for (const path of protectedRoutes) await expectLoginRedirect(path);

  await page.getByRole("link", { name: /criar conta/i }).click();
  await page.waitForURL(/\/cadastro$/, { timeout: 10000 });
  await page.getByRole("heading", { name: /comece sua jornada/i }).waitFor();
  console.log("PASS: login -> cadastro");

  await page.goto(baseURL + "/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /entrar/i }).first().click();
  await page.waitForURL(/\/login$/, { timeout: 10000 });
  console.log("PASS: home -> login");

  if (!email || !password) {
    console.log("SKIP: authenticated student journey (E2E_TEST_EMAIL/E2E_TEST_PASSWORD not configured)");
  } else {
    await page.goto(baseURL + "/login", { waitUntil: "networkidle" });
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(app\/dashboard|onboarding)(?:$|\?)/, { timeout: 20000 });

    if (page.url().includes("/onboarding")) {
      await page.getByLabel(/qual é o seu curso/i).fill("Pedagogia");
      await page.getByRole("button", { name: "Continuar" }).click();
      await expectText(/etapa 2 de 4/i, "onboarding step 2");
      await page.getByLabel(/quais disciplinas você está cursando/i).fill("Alfabetização 1");
      await page.getByRole("button", { name: /adicionar disciplina/i }).click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await expectText(/etapa 3 de 4/i, "onboarding step 3");
      await page.getByRole("button", { name: "Continuar" }).click();
      await expectText(/etapa 4 de 4/i, "onboarding step 4");
      await page.getByRole("button", { name: /1 hora/i }).click();
      await page.getByRole("button", { name: /finalizar configuração/i }).click();
      await page.waitForURL(/\/app\/dashboard$/, { timeout: 20000 });
      console.log("PASS: onboarding -> dashboard");
    }

    await page.goto(baseURL + "/app/dashboard", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /seu espaço de aprendizagem/i }).waitFor({ timeout: 15000 });
    console.log("PASS: dashboard");

    await page.goto(baseURL + "/app/disciplinas", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /minhas disciplinas/i }).waitFor({ timeout: 15000 });
    const disciplineLink = page.locator('a[href^="/app/disciplinas/"]').first();
    await disciplineLink.waitFor({ timeout: 15000 });
    await disciplineLink.click();
    await page.waitForURL(/\/app\/disciplinas\/[^/]+$/, { timeout: 10000 });
    await page.getByRole("heading", { name: /tópicos de aprendizagem/i }).waitFor({ timeout: 15000 });
    console.log("PASS: disciplina -> tópicos");

    const topicLink = page.locator('a[href^="/app/disciplinas/"][href*="/"]').first();
    await topicLink.waitFor({ timeout: 15000 });
    await topicLink.click();
    await page.waitForURL(/\/app\/disciplinas\/[^/]+\/[^/]+$/, { timeout: 10000 });
    await page.getByRole("heading", { name: /estudo guiado/i }).waitFor({ timeout: 20000 });
    await expectText(/1 · compreender/i, "topic comprehension stage");
    console.log("PASS: tópico -> material");

    const studyButton = page.getByRole("button", { name: /marcar como estudada/i }).first();
    await studyButton.waitFor({ timeout: 15000 });
    await studyButton.click();
    await expectText(/parte estudada/i, "material section completion");

    await page.locator("#pratica").scrollIntoViewIfNeeded();
    await expectText(/questões respondidas|prática registrada/i, "practice progress");
    const practiceButtons = page.locator("#pratica button");
    if (await practiceButtons.count() > 0) {
      await practiceButtons.first().click();
      console.log("PASS: practice interaction");
    }

    await page.locator("#avaliacao").scrollIntoViewIfNeeded();
    await expectText(/avaliação|verificar/i, "evaluation stage");

    await page.goto(baseURL + "/app/revisao", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /revisão/i }).waitFor({ timeout: 15000 });
    console.log("PASS: revisão");

    await page.goto(baseURL + "/app/desempenho", { waitUntil: "networkidle" });
    await expectText(/desempenho/i, "desempenho");

    await page.goto(baseURL + "/app/perfil", { waitUntil: "networkidle" });
    await expectText(/perfil|preferências/i, "perfil");

    await page.goto(baseURL + "/app/dashboard", { waitUntil: "networkidle" });
    const mobileNav = page.getByRole("navigation", { name: /navegação rápida/i });
    await mobileNav.waitFor({ timeout: 15000 });
    await mobileNav.getByRole("link", { name: "Disciplinas" }).click();
    await page.waitForURL(/\/app\/disciplinas$/, { timeout: 10000 });
    console.log("PASS: mobile bottom navigation");

    await page.goto(baseURL + "/app/dashboard", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /abrir mais opções/i }).click();
    await page.getByRole("heading", { name: /guia do aluno/i }).waitFor({ timeout: 10000 });
    console.log("PASS: mobile Mais");

    console.log("PASS: complete authenticated student journey");
  }
} finally {
  await browser.close();
}
