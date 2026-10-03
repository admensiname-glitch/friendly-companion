import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

if (!email || !password) {
  throw new Error("Full student journey requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD.");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
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
    console.log("PASS: onboarding");
  }

  await page.getByRole("heading", { name: /seu espaço de aprendizagem/i }).waitFor();
  console.log("PASS: dashboard");

  await page.goto(`${baseURL}/app/disciplinas`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /minhas disciplinas/i }).waitFor();
  const discipline = page.locator('a[href^="/app/disciplinas/"]').first();
  await discipline.waitFor();
  await discipline.click();
  await page.waitForURL(/\/app\/disciplinas\/[^/]+$/, { timeout: 10000 });
  await page.getByRole("heading", { name: /tópicos de aprendizagem/i }).waitFor();
  console.log("PASS: discipline");

  const topic = page.locator('a[href^="/app/disciplinas/"][href*="/"]').first();
  await topic.waitFor();
  await topic.click();
  await page.waitForURL(/\/app\/disciplinas\/[^/]+\/[^/]+$/, { timeout: 10000 });
  await page.getByRole("heading", { name: /estudo guiado/i }).waitFor();
  console.log("PASS: topic/material");

  const studied = page.getByRole("button", { name: /marcar como estudada/i }).first();
  await studied.waitFor();
  await studied.click();
  await page.getByRole("button", { name: /parte estudada/i }).waitFor();
  console.log("PASS: material progress");

  await page.locator("#pratica").scrollIntoViewIfNeeded();
  await page.getByText(/questões respondidas|prática registrada/i).first().waitFor();
  console.log("PASS: practice stage");

  await page.locator("#avaliacao").scrollIntoViewIfNeeded();
  await page.getByText(/avaliação|verificar/i).first().waitFor();
  console.log("PASS: evaluation stage");

  for (const [path, pattern] of [
    ["/app/revisao", /revisão/i],
    ["/app/desempenho", /desempenho/i],
    ["/app/perfil", /perfil|preferências/i],
  ]) {
    await page.goto(baseURL + path, { waitUntil: "networkidle" });
    await page.getByText(pattern).first().waitFor();
    console.log(`PASS: ${path}`);
  }

  await page.goto(`${baseURL}/app/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("navigation", { name: /navegação rápida/i }).getByRole("link", { name: "Disciplinas" }).click();
  await page.waitForURL(/\/app\/disciplinas$/, { timeout: 10000 });
  console.log("PASS: mobile navigation");

  await page.goto(`${baseURL}/app/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /abrir mais opções/i }).click();
  await page.getByRole("heading", { name: /guia do aluno/i }).waitFor();
  console.log("PASS: mobile Mais");

  console.log("PASS: COMPLETE STUDENT JOURNEY");
} catch (error) {
  await page.screenshot({ path: "e2e-student-flow-failure.png", fullPage: true }).catch(() => {});
  console.error("STUDENT E2E FAILURE", error);
  console.error("URL", page.url());
  throw error;
} finally {
  await browser.close();
}
