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

- `DATABASE_URL`: PostgreSQL 连接串
- `DATABASE_SSL_MODE`: 数据库 SSL 模式，支持 `disable` / `require` / `no-verify`
- `HOST`: 服务监听地址，默认 `0.0.0.0`
- `PORT`: 服务端口，默认 `3000`
- `CORS_ORIGIN`: 允许跨域来源，默认 `*`

## 设计说明

- API 使用 PostgreSQL 作为持久化存储。
- 服务启动时会自动执行表结构引导 SQL。
- `/health` 可用于部署探活。
- API 不依赖桌面端运行，桌面端故障不会影响服务可用性。
