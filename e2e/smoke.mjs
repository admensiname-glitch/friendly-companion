import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

async function loginRedirect(path) {
  await page.goto(baseURL + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  if (!page.url().match(/\/login(?:$|\?)/)) throw new Error(`${path} did not redirect to /login: ${page.url()}`);
  await page.getByRole("heading", { name: /entre na sua conta/i }).waitFor({ timeout: 10000 });
  console.log(`PASS: ${path} -> login`);
}

async function text(pattern, label) {
  await page.getByText(pattern).first().waitFor({ timeout: 15000 });
  console.log(`PASS: ${label}`);
}

try {
  await loginRedirect("/app/dashboard");
  await page.getByRole("link", { name: /criar conta/i }).click();
  await page.waitForURL(/\/cadastro$/, { timeout: 10000 });
  await page.getByRole("heading", { name: /comece sua jornada/i }).waitFor();
  console.log("PASS: login -> cadastro");

  await page.goto(baseURL + "/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /entrar/i }).first().click();
  await page.waitForURL(/\/login$/, { timeout: 10000 });
  console.log("PASS: home -> login");

  if (!email || !password) {
    console.log("SKIP: authenticated journey; configure E2E_TEST_EMAIL and E2E_TEST_PASSWORD");
  } else {
    await page.goto(baseURL + "/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(app\/dashboard|onboarding)(?:$|\?)/, { timeout: 20000 });

    if (page.url().includes("/onboarding")) {
      await page.getByLabel(/qual é o seu curso/i).fill("Pedagogia");
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByLabel(/quais disciplinas você está cursando/i).waitFor();
      await page.getByLabel(/quais disciplinas você está cursando/i).fill("Alfabetização 1");
      await page.getByRole("button", { name: /adicionar disciplina/i }).click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByRole("button", { name: /1 hora/i }).click();
      await page.getByRole("button", { name: /finalizar configuração/i }).click();
      await page.waitForURL(/\/app\/dashboard$/, { timeout: 20000 });
      console.log("PASS: onboarding -> dashboard");
    }

    await page.goto(baseURL + "/app/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /seu espaço de aprendizagem/i }).waitFor({ timeout: 15000 });
    console.log("PASS: dashboard");

    await page.goto(baseURL + "/app/disciplinas", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /minhas disciplinas/i }).waitFor({ timeout: 15000 });
    const discipline = page.locator('a[href^="/app/disciplinas/"]').first();
    await discipline.waitFor({ timeout: 15000 });
    await discipline.click();
    await page.waitForURL(/\/app\/disciplinas\/[^/]+$/, { timeout: 10000 });
    await page.getByRole("heading", { name: /tópicos de aprendizagem/i }).waitFor({ timeout: 15000 });
    console.log("PASS: disciplina -> tópicos");

    const topic = page.locator('a[href^="/app/disciplinas/"][href*="/"]').first();
    await topic.waitFor({ timeout: 15000 });
    await topic.click();
    await page.waitForURL(/\/app\/disciplinas\/[^/]+\/[^/]+$/, { timeout: 10000 });
    await page.getByRole("heading", { name: /estudo guiado/i }).waitFor({ timeout: 20000 });
    console.log("PASS: tópico -> estudo guiado");

    const studied = page.getByRole("button", { name: /marcar como estudada/i }).first();
    await studied.waitFor({ timeout: 15000 });
    await studied.click();
    await page.getByRole("button", { name: /parte estudada/i }).waitFor({ timeout: 10000 });
    console.log("PASS: conteúdo -> marcar parte estudada");

    await page.locator("#pratica").scrollIntoViewIfNeeded();
    await text(/questões respondidas|prática registrada/i, "prática");
    await page.locator("#avaliacao").scrollIntoViewIfNeeded();
    await text(/avaliação|verificar/i, "avaliação");

    await page.goto(baseURL + "/app/revisao", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /revisão/i }).waitFor({ timeout: 15000 });
    await page.goto(baseURL + "/app/desempenho", { waitUntil: "domcontentloaded" });
    await text(/desempenho/i, "desempenho");
    await page.goto(baseURL + "/app/perfil", { waitUntil: "domcontentloaded" });
    await text(/perfil|preferências/i, "perfil");

    await page.goto(baseURL + "/app/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("navigation", { name: /navegação rápida/i }).getByRole("link", { name: "Disciplinas" }).click();
    await page.waitForURL(/\/app\/disciplinas$/, { timeout: 10000 });
    console.log("PASS: navegação mobile");

    await page.goto(baseURL + "/app/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /abrir mais opções/i }).click();
    await page.getByRole("heading", { name: /guia do aluno/i }).waitFor({ timeout: 10000 });
    console.log("PASS: menu Mais mobile");

    console.log("PASS: complete authenticated student journey");
  }
} catch (error) {
  await page.screenshot({ path: "e2e-failure.png", fullPage: true }).catch(() => {});
  console.error("E2E FAILURE:", error);
  console.error("URL:", page.url());
  throw error;
} finally {
  await browser.close();
}
