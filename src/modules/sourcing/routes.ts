import { Elysia } from 'elysia';
import { browse1688, closeBrowser, scrapeCurrentPage, waitForLoginAndSearch } from './scraper.js';

export const sourcingRoutes = new Elysia({ prefix: '/sourcing' })
  .post('/browse', async ({ body }) => {
    const { keyword } = body as { keyword: string };
    if (!keyword?.trim()) {
      return { status: 'error', message: '关键词不能为空' };
    }
    const result = await browse1688(keyword.trim());
    if (result.needLogin) {
      return { status: 'need_login', message: '需要登录 1688，请在弹出的浏览器中完成登录' };
    }
    return { status: 'ok' };
  })
  .post('/wait-login', async ({ body }) => {
    const { keyword } = body as { keyword: string };
    const result = await waitForLoginAndSearch(keyword?.trim() || '', 120000);
    if (result.needLogin) {
      return { status: 'timeout', message: '登录超时，请重试' };
    }
    return { status: 'ok' };
  })
  .post('/scrape', async () => {
    const products = await scrapeCurrentPage();
    return { products };
  })
  .post('/close', async () => {
    await closeBrowser();
    return { status: 'ok' };
  });
