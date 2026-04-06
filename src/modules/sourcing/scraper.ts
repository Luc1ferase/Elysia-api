import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIE_PATH = join(__dirname, '..', '..', '..', '.1688-cookies.json');

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

async function loadCookies(): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
  try {
    const raw = await readFile(COOKIE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveCookies(ctx: BrowserContext) {
  const cookies = await ctx.cookies();
  await writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2));
}

export async function launchBrowser() {
  if (browser?.isConnected()) {
    return page!;
  }

  browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const cookies = await loadCookies();

  context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'zh-CN',
  });

  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  page = await context.newPage();
  return page;
}

export async function closeBrowser() {
  if (context) {
    await saveCookies(context).catch(() => {});
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    context = null;
    page = null;
  }
}

async function searchFromResultsPage(p: Page, keyword: string) {
  // 先打开搜索结果页（无关键词），然后在页面搜索框输入并搜索
  // 这样能让 1688 用自己的编码方式处理中文
  await p.goto('https://s.1688.com/selloffer/offer_search.htm', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await p.waitForTimeout(2000);

  const input = await p.$('input.ali-search-input, input[name="keywords"]');
  if (!input) throw new Error('未找到搜索框');

  await input.click({ clickCount: 3 });
  await input.type(keyword, { delay: 60 });
  await p.waitForTimeout(500);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  const btn = await p.$('div.input-button, .btn-search');
  if (btn) {
    await Promise.all([
      p.waitForNavigation({ timeout: 15000 }).catch(() => {}),
      btn.click(),
    ]);
  } else {
    await Promise.all([
      p.waitForNavigation({ timeout: 15000 }).catch(() => {}),
      input.press('Enter'),
    ]);
  }

  await p.waitForTimeout(3000);
}

export async function browse1688(keyword: string) {
  const p = await launchBrowser();

  // 先尝试直接打开搜索结果页，看是否需要登录
  await p.goto('https://s.1688.com/selloffer/offer_search.htm', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await p.waitForTimeout(2000);

  const currentUrl = p.url();
  if (currentUrl.includes('login.taobao.com') || currentUrl.includes('login.1688.com')) {
    return { needLogin: true };
  }

  // 已登录，执行搜索
  await searchFromResultsPage(p, keyword);
  if (context) await saveCookies(context);
  return { needLogin: false };
}

export async function waitForLoginAndSearch(keyword: string, timeoutMs = 120000): Promise<{ needLogin: boolean }> {
  if (!page || !context) {
    throw new Error('浏览器未启动');
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!url.includes('login.taobao.com') && !url.includes('login.1688.com')) {
      await saveCookies(context);
      await searchFromResultsPage(page, keyword);
      return { needLogin: false };
    }
    await page.waitForTimeout(2000);
  }

  return { needLogin: true };
}

export interface ScrapedProduct {
  id: string;
  title: string;
  priceRange: string;
  minOrder: string;
  imageUrl: string;
  detailUrl: string;
  specs: string[];
}

export async function scrapeCurrentPage(): Promise<ScrapedProduct[]> {
  if (!page) {
    throw new Error('浏览器未启动，请先点击"开始浏览"');
  }

  // 滚动页面触发懒加载
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const products = await page.evaluate(() => {
    const items: ScrapedProduct[] = [];
    const seen = new Set<string>();
    let index = 0;

    // 1688 商品详情链接（含移动版 detail.m.1688.com）
    const allLinks = document.querySelectorAll('a[href*="detail.1688.com"], a[href*="detail.m.1688.com"], a[href*="offer/"][href*=".html"]');

    allLinks.forEach((link) => {
      const anchor = link as HTMLAnchorElement;
      let href = anchor.href;
      if (href.startsWith('//')) href = 'https:' + href;

      // 只要商品详情链接，过滤掉 similar_search、im 等
      if (!href.includes('offerId=') && !href.match(/offer\/\d+/)) return;
      if (href.includes('similar_search') || href.includes('im/index')) return;

      // 去重
      const offerIdMatch = href.match(/offer\/(\d+)/);
      const dedupKey = offerIdMatch ? offerIdMatch[1] : href;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      // 获取标题 — 优先用 title 属性（更干净）
      let title = (anchor.title || '').trim();
      if (!title || title.length < 6) {
        title = (anchor.innerText || '').split('\n')[0].trim();
      }
      // 过滤噪音
      if (!title || title.length < 6) return;
      if (/点此可以|和卖家交流|客服|在线聊|找相似|举报/.test(title)) return;

      // 向上找最近的卡片容器（找到有多个子元素的合理边界就停）
      let card: HTMLElement = anchor;
      for (let i = 0; i < 8; i++) {
        const parent = card.parentElement;
        if (!parent) break;
        // 如果 parent 包含多个商品链接，说明已经超过卡片边界
        const linksInParent = parent.querySelectorAll('a[href*="detail.1688.com"], a[href*="detail.m.1688.com"]');
        if (linksInParent.length > 3) break;
        card = parent;
      }

      // 价格 — 从卡片内找价格元素，合并被拆分的文本节点
      let priceText = '';
      const priceEls = card.querySelectorAll('[class*="price"], [class*="Price"]');
      for (const el of priceEls) {
        // 合并所有子节点文本并去除空白
        const raw = (el as HTMLElement).innerText?.replace(/\s+/g, '') ?? '';
        const nums = raw.match(/[\d]+\.[\d]+|[\d]+/g);
        if (nums && nums.length > 0) {
          const parsed = nums.map(Number).filter(n => n > 0 && n < 100000);
          if (parsed.length > 0) {
            priceText = parsed.length > 1
              ? `¥${parsed[0]} - ¥${parsed[parsed.length - 1]}`
              : `¥${parsed[0]}`;
            break;
          }
        }
      }
      // fallback: 从卡片文本中提取，合并 ¥ 后被空白打断的数字
      if (!priceText) {
        const cardRaw = (card.innerText || '').replace(/¥\s*/g, '¥').replace(/(\d)\s+\.\s*(\d)/g, '$1.$2');
        const priceNums = cardRaw.match(/¥([\d.]+)/g);
        if (priceNums && priceNums.length > 0) {
          const values = priceNums.map(s => s.replace('¥', '')).filter(v => parseFloat(v) > 0);
          if (values.length > 0) {
            priceText = values.length > 1 ? `¥${values[0]} - ¥${values[values.length - 1]}` : `¥${values[0]}`;
          }
        }
      }

      // 图片 — 从卡片内找 1688 CDN 图片
      const imgEl = card.querySelector('img[src*="cbu01"], img[src*="img.alicdn"]') || card.querySelector('img[src]:not([src*="icon"]):not([src*="avatar"])');
      let imgSrc = (imgEl as HTMLImageElement)?.src || '';
      if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;

      items.push({
        id: `src_${Date.now()}_${index++}`,
        title: title.replace(/\n/g, ' ').slice(0, 120),
        priceRange: priceText,
        minOrder: '',
        imageUrl: imgSrc,
        detailUrl: href,
        specs: [],
      });
    });

    return items;
  });

  if (context) await saveCookies(context);
  return products;
}
