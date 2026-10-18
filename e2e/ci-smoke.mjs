import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const response = await page.goto(baseURL + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`home returned HTTP ${response?.status() ?? "unknown"}`);

  if (!(await page.title()).includes("Ensina-me")) throw new Error("home title is missing Ensina-me");
  const homeChecks = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
    mainCount: document.querySelectorAll("main").length,
    h1Count: document.querySelectorAll("h1").length,
    navWithLabelCount: document.querySelectorAll("nav[aria-label]").length,
    imagesWithoutAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).length,
    emptyLinks: [...document.querySelectorAll("a")].filter((link) =>
      !(link.textContent ?? "").trim() &&
      !link.getAttribute("aria-label") &&
      !link.getAttribute("aria-labelledby")
    ).length,
  }));
  if (homeChecks.lang !== "pt-BR") throw new Error(`unexpected document language: ${homeChecks.lang}`);
  if (homeChecks.themeColor !== "#0242D7") throw new Error(`unexpected theme-color: ${homeChecks.themeColor}`);
  if (homeChecks.canonical !== "https://ensina-buddy-app.lovable.app/") throw new Error(`unexpected canonical: ${homeChecks.canonical}`);
  if (homeChecks.robots !== "index,follow") throw new Error(`home should be indexable: ${homeChecks.robots}`);
  if (homeChecks.mainCount !== 1 || homeChecks.h1Count !== 1) throw new Error(`unexpected page landmarks: main=${homeChecks.mainCount}, h1=${homeChecks.h1Count}`);
  if (homeChecks.navWithLabelCount < 1 || homeChecks.imagesWithoutAlt > 0 || homeChecks.emptyLinks > 0) {
    throw new Error(`basic accessibility smoke failed: ${JSON.stringify(homeChecks)}`);
  }
  console.log("PASS: landing metadata, document language and basic accessibility landmarks");

  for (const [width, height] of [[390, 844], [360, 800], [320, 740]]) {
    await page.setViewportSize({ width, height });
    const pageWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    if (pageWidth > width + 1) throw new Error(`horizontal overflow at ${width}px: document width ${pageWidth}px`);
  }
  console.log("PASS: landing page mobile widths (390/360/320px)");

  const sitemapResponse = await page.request.get(baseURL + "/sitemap.xml");
  if (!sitemapResponse.ok()) throw new Error(`sitemap returned HTTP ${sitemapResponse.status()}`);
  const sitemap = await sitemapResponse.text();
  if (!sitemap.includes("https://ensina-buddy-app.lovable.app/")) throw new Error("sitemap is missing canonical homepage");
  if (!sitemap.includes("/termos") || !sitemap.includes("/privacidade")) throw new Error("sitemap is missing public legal pages");
  console.log("PASS: public sitemap");

  for (const path of ["/termos", "/privacidade"]) {
    const legalResponse = await page.goto(baseURL + path, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!legalResponse || !legalResponse.ok()) throw new Error(`${path} returned HTTP ${legalResponse?.status() ?? "unknown"}`);
    const legalMetadata = await page.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
    }));
    if (legalMetadata.canonical !== `https://ensina-buddy-app.lovable.app${path}`) throw new Error(`unexpected canonical for ${path}: ${legalMetadata.canonical}`);
    if (legalMetadata.robots !== "index,follow") throw new Error(`${path} should be indexable: ${legalMetadata.robots}`);
  }
  console.log("PASS: public legal pages metadata");

  const loginResponse = await page.goto(baseURL + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!loginResponse || !loginResponse.ok()) throw new Error(`login returned HTTP ${loginResponse?.status() ?? "unknown"}`);
  const loginRobots = await page.locator('meta[name="robots"]').getAttribute("content");
  if (!loginRobots?.includes("noindex")) throw new Error(`login should not be indexed: ${loginRobots}`);
  console.log("PASS: login is excluded from search indexing");
} finally {
  await browser.close();
}
