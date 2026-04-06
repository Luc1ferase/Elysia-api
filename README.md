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

- `DATABASE_URL`: PostgreSQL 连接串；必填，推荐通过本地 `.env` 或服务器环境变量提供
- `DATABASE_SSL_MODE`: 数据库 SSL 模式，支持 `disable` / `require` / `no-verify`，当前默认 `require`
- `DATABASE_CA_CERT_PATH`: 可选，CA 证书路径；不配置时会优先使用仓库内的 `certs/aiven-ca.pem`，再兼容查找项目根目录或上一级工作区目录下的 `ca.pem`
- `HOST`: 服务监听地址，默认 `0.0.0.0`
- `PORT`: 服务端口，默认 `9800`
- `CORS_ORIGIN`: 允许跨域来源，默认 `*`

## 设计说明

- API 使用 PostgreSQL 作为持久化存储。
- 当前仓库不再内置数据库凭据，部署和本地开发都通过环境变量提供 `DATABASE_URL`，并在 `require` 模式下优先使用仓库内的 CA 证书校验。
- 服务启动时会自动执行表结构引导 SQL，并自动补齐上架记录的国家级 SKU（`market_sku`）。
- `/health` 可用于部署探活。
- API 不依赖桌面端运行，桌面端故障不会影响服务可用性。

## 自动部署

仓库包含一个推送到 `master` 后自动部署的 GitHub Actions 工作流，目标目录为 `/opt/elysia-api`，运行方式为 `pm2`。

### 服务器前置条件

- 已安装 `node`、`npm`、`pm2`
- 已创建部署目录 `/opt/elysia-api`
- SSH 用户对 `/opt/elysia-api` 有写权限
- `pm2` 可在该 SSH 用户下直接执行

### GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- `DEPLOY_HOST`: 服务器地址
- `DEPLOY_PORT`: SSH 端口，例如 `22`
- `DEPLOY_USER`: 部署用户名
- `DEPLOY_SSH_KEY`: 用于部署的私钥
- `DEPLOY_KNOWN_HOSTS`: `ssh-keyscan -p <port> <host>` 生成的 known_hosts 内容
- `DEPLOY_ENV_FILE`: 服务器 `.env` 的完整内容

`DEPLOY_ENV_FILE` 示例：

```env
DATABASE_URL=postgres://user:password@host:5432/elysia
DATABASE_SSL_MODE=require
DATABASE_CA_CERT_PATH=certs/aiven-ca.pem
HOST=0.0.0.0
PORT=9800
CORS_ORIGIN=*
```

### 部署结果

- 每次推送 `master` 都会执行 `npm ci`、`npm test`、`npm run build`
- 工作流会把运行时文件上传到 `/opt/elysia-api/releases/<git-sha>`
- 服务器上的 `.env` 会写入 `/opt/elysia-api/shared/.env`
- `/opt/elysia-api/current` 会切换到最新发布
- `pm2 startOrReload ecosystem.config.cjs --update-env` 会重启服务
