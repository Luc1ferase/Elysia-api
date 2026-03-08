# Elysia API

跨境电商定价系统后端，提供商品、站点、物流价卡、上架记录与定价计算接口。

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

## 环境变量

- `DATABASE_URL`: PostgreSQL 连接串；个人使用场景下代码内已内置默认连接，不配置也能启动
- `DATABASE_SSL_MODE`: 数据库 SSL 模式，支持 `disable` / `require` / `no-verify`
- `HOST`: 服务监听地址，默认 `0.0.0.0`
- `PORT`: 服务端口，默认 `3000`
- `CORS_ORIGIN`: 允许跨域来源，默认 `*`

## 设计说明

- API 使用 PostgreSQL 作为持久化存储。
- 当前仓库已为个人使用内置默认数据库连接，桌面端仍然只通过 API 同步，不直接连接数据库。
- 服务启动时会自动执行表结构引导 SQL，并自动补齐上架记录的国家级 SKU（`market_sku`）。
- `/health` 可用于部署探活。
- API 不依赖桌面端运行，桌面端故障不会影响服务可用性。
