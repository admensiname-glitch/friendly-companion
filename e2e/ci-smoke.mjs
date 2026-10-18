import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const response = await page.goto(baseURL + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`home returned HTTP ${response?.status() ?? "unknown"}`);

  if (!(await page.title()).includes("Ensina-me")) throw new Error("home title is missing Ensina-me");
  const homeMeta = await page.evaluate(() => ({
    themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
  }));
  if (homeMeta.themeColor !== "#0242D7") throw new Error(`unexpected theme-color: ${homeMeta.themeColor}`);
  if (homeMeta.canonical !== "https://ensina-buddy-app.lovable.app/") throw new Error(`unexpected canonical: ${homeMeta.canonical}`);
  if (!homeMeta.robots?.includes("index")) throw new Error(`home should be indexable: ${homeMeta.robots}`);

  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const pageWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    if (pageWidth > width + 1) throw new Error(`horizontal overflow at ${width}px: document width ${pageWidth}px`);
  }
  console.log("PASS: landing page metadata and mobile widths (390/360/320px)");

  const sitemapResponse = await page.request.get(baseURL + "/sitemap.xml");
  if (!sitemapResponse.ok()) throw new Error(`sitemap returned HTTP ${sitemapResponse.status()}`);
  const sitemap = await sitemapResponse.text();
  if (!sitemap.includes("https://ensina-buddy-app.lovable.app/")) throw new Error("sitemap is missing canonical homepage");
  if (!sitemap.includes("/termos") || !sitemap.includes("/privacidade")) throw new Error("sitemap is missing public legal pages");
  console.log("PASS: public sitemap");

  const loginResponse = await page.goto(baseURL + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!loginResponse || !loginResponse.ok()) throw new Error(`login returned HTTP ${loginResponse?.status() ?? "unknown"}`);
  const loginRobots = await page.locator('meta[name="robots"]').getAttribute("content");
  if (!loginRobots?.includes("noindex")) throw new Error(`login should not be indexed: ${loginRobots}`);
  console.log("PASS: login is excluded from search indexing");
} finally {
  await browser.close();
}
