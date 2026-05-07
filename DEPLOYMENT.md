# DocMind 服务器部署说明

本文档用于把 `DocMind` 部署到 Linux 服务器。目标是跑通一个可长期访问的在线版本，适合演示、内部使用或求职项目展示。

## 推荐配置

- 系统：Ubuntu 22.04 LTS
- CPU：2 核以上
- 内存：4 GB 以上
- 磁盘：40 GB 以上 SSD
- Docker：24+
- Docker Compose：v2

## 部署方式

当前项目推荐两种方式：

- 方式一：只用 Docker Compose 启动依赖服务，应用进程本机运行
- 方式二：依赖服务 + 应用服务全部容器化

本仓库当前提供的是第一种基础配置，即 `docker-compose.yml` 主要负责：

- PostgreSQL
- Redis
- MinIO
- Elasticsearch

## 第一步：准备服务器

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

重新登录后验证：

```bash
docker --version
docker compose version
```

## 第二步：拉取项目

```bash
git clone <your-repo-url> docmind
cd docmind
```

## 第三步：配置环境变量

```bash
cp .env.example .env.local
```

重点修改：

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_*`
- `ELASTICSEARCH_HOST`
- `AUTH_SECRET`
- `ZHIPU_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `TAVILY_API_KEY`（可选）

如果你使用智谱 OpenAI 兼容地址，也可以加上：

```env
ZHIPU_BASE_URL="https://open.bigmodel.cn/api/paas/v4"
```

## 第四步：启动依赖服务

```bash
docker compose up -d
```

查看状态：

```bash
docker compose ps
```

## 第五步：安装项目依赖

```bash
corepack enable
pnpm install
```

## 第六步：生成 Prisma Client

```bash
pnpm prisma generate
```

如果你已经准备好数据库结构，也可以执行迁移：

```bash
pnpm prisma migrate deploy
```

## 第七步：启动项目

开发模式：

```bash
pnpm dev
```

生产模式：

```bash
pnpm build
pnpm start
```

如需单独启动 Worker：

```bash
pnpm worker
```

## 第八步：反向代理

建议使用 Nginx 反向代理到 `3000` 端口。

示例：

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## 第九步：HTTPS

推荐使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 运行检查

部署后建议至少检查：

- 首页是否正常访问
- 登录/注册是否正常
- 文档上传是否成功
- MinIO 中是否有上传文件
- Elasticsearch 中是否生成索引
- 聊天接口是否能返回 SSE 流
- Worker 是否能处理新上传文档

## 常见问题

### 1. 聊天无回答

优先检查：

- `ZHIPU_API_KEY` 是否正确
- `ZHIPU_BASE_URL` 是否可访问
- Elasticsearch 是否可用
- 对应知识库是否已有可检索文档

### 2. 联网搜索失败

检查：

- `TAVILY_API_KEY` 是否配置
- 服务器是否能访问外网

### 3. 文件上传成功但一直处理中

检查：

- Redis 是否正常
- Worker 是否启动
- MinIO 是否可写
- Elasticsearch 是否可写入

## 生产建议

- 把 `pnpm start` 与 `pnpm worker` 分成两个进程
- 给 Elasticsearch 至少 1 GB JVM 内存
- 打开 Redis 持久化
- 为 MinIO 与 PostgreSQL 做磁盘备份
- 使用进程守护工具，如 `pm2` 或 `systemd`
