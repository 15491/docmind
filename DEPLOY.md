# DocMind 自建服务器部署指南

本文档面向**单机部署到 Linux 服务器**的场景。所有依赖（Postgres / Redis / Elasticsearch / MinIO）通过 docker-compose 起，Next.js 主进程和 BullMQ Worker 通过 pm2 管理，Nginx 反代 + Let's Encrypt 上 HTTPS。

---

## 1. 服务器要求

| 项 | 最低 | 推荐 |
|---|---|---|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 40 GB SSD | 80 GB+ SSD |
| 操作系统 | Ubuntu 22.04 / Debian 12 | Ubuntu 24.04 LTS |
| 网络 | 公网 IP + 开放 80/443 | 同左 |

**为什么需要 4G+ 内存**：Elasticsearch 单实例 JVM heap 默认 1G，Postgres 几百 MB，Next.js + Worker 各占几百 MB，留余量给系统。

**域名要求**：至少一个一级域名或子域名（如 `docmind.yourdomain.com`），用于绑定 HTTPS。

---

## 2. 服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 装基础工具
sudo apt install -y curl git build-essential vim ufw

# 装 Docker + Compose 插件
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# 注意：上一条执行完要重新登录 shell 才能不用 sudo 跑 docker

# 装 Node.js 22（项目要求 Node 22+）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# 装 pnpm
sudo npm install -g pnpm@latest pm2@latest

# 装 Nginx
sudo apt install -y nginx

# 装 Certbot（HTTPS 证书）
sudo apt install -y certbot python3-certbot-nginx

# 开放端口
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**确认环境**：
```bash
docker --version          # 26+ 期望
docker compose version    # v2+
node --version            # v22.x
pnpm --version            # 9+
nginx -v                  # 1.24+
```

---

## 3. 拉代码

```bash
# 建议放在 /opt 下，方便系统服务管理
sudo mkdir -p /opt/docmind
sudo chown -R $USER:$USER /opt/docmind
cd /opt/docmind

# 拉 repo
git clone <你的仓库地址> .

# 或者用 scp 把本地代码传上去
```

---

## 4. 起依赖服务（docker-compose）

在 `/opt/docmind` 下新建 `docker-compose.prod.yml`：

```yaml
services:
  postgres:
    # 与开发环境一致使用 pgvector 镜像（基于 PG 18），方便未来引入向量扩展
    image: pgvector/pgvector:0.8.2-pg18-trixie
    container_name: docmind-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: docmind
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: docmind
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"   # 仅绑本机，不暴露公网

  redis:
    image: redis:latest
    container_name: docmind-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - ./data/redis:/data
    ports:
      - "127.0.0.1:6379:6379"

  elasticsearch:
    image: elasticsearch:9.0.1
    container_name: docmind-es
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false   # 单机内网部署可关；如要开则配 ELASTIC_PASSWORD
      - "ES_JAVA_OPTS=-Xms512m -Xmx1g"   # 内存吃紧可降到 -Xmx512m
    volumes:
      - ./data/elasticsearch:/usr/share/elasticsearch/data
    ports:
      - "127.0.0.1:9200:9200"

  minio:
    image: minio/minio:latest
    container_name: docmind-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - ./data/minio:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"   # MinIO 控制台
```

在 `/opt/docmind` 下新建 `.env`（注意这个 .env 是给 docker-compose 用的，不是 Next.js 的）：

```bash
POSTGRES_PASSWORD=<生成一个 32 位强密码>
REDIS_PASSWORD=<生成一个 32 位强密码>
MINIO_ROOT_USER=docmind
MINIO_ROOT_PASSWORD=<生成一个 32 位强密码>
```

生成密码命令：`openssl rand -base64 24`

启动依赖：
```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps    # 确认 4 个服务都 healthy
```

**初始化 MinIO bucket**（项目要求一个 bucket 存文件）：
```bash
# 安装 mc 客户端
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/

# 配置别名
mc alias set local http://127.0.0.1:9000 docmind <MINIO_ROOT_PASSWORD>

# 创建 bucket（名字看项目里 .env 实际用的）
mc mb local/docmind
mc anonymous set download local/docmind   # 如果走 Nginx 代理就不需要
```

---

## 5. 配置 Next.js 应用环境变量

在 `/opt/docmind` 下新建 `.env.production`（这是 Next.js / Worker 读取的）。**所有 key 名都已与项目的 `.env.example` 对齐**，照搬即可：

```bash
# 数据库（user / db 必须与 docker-compose.prod.yml 中的 POSTGRES_USER / POSTGRES_DB 一致）
DATABASE_URL="postgresql://docmind:<POSTGRES_PASSWORD>@127.0.0.1:5432/docmind?schema=public"

# Redis（BullMQ 用；密码 URL-encode，特殊字符要转义）
REDIS_URL="redis://default:<REDIS_PASSWORD>@127.0.0.1:6379"

# Elasticsearch
ELASTICSEARCH_HOST="http://127.0.0.1:9200"

# MinIO 对象存储（注意：项目按 endpoint / port / use_ssl 三段拆分，不是单一 URL）
MINIO_ENDPOINT="127.0.0.1"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="<同 MINIO_ROOT_USER>"
MINIO_SECRET_KEY="<同 MINIO_ROOT_PASSWORD>"
MINIO_BUCKET="docmind"

# NextAuth v5（注意 v5 用 AUTH_ 前缀，不是 NEXTAUTH_）
# 生成命令：openssl rand -base64 32
AUTH_SECRET="<openssl rand -base64 32>"
# ⚠️ 重要：用户级 API key 加密密钥，一旦丢失，已存的用户 API key 全部解不出来。务必备份。
USER_API_KEY_ENCRYPTION_KEY="<openssl rand -base64 32>"

# GitHub OAuth（去 https://github.com/settings/developers 注册一个 OAuth App，Callback 写
# https://docmind.yourdomain.com/api/auth/callback/github）
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."
# 国内服务器拉 github.com 慢的话配本机代理；不需要就删掉这行
# AUTH_GITHUB_PROXY_URL="http://127.0.0.1:7890"

# Google OAuth（Callback：/api/auth/callback/google）
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."

# 智谱 AI
ZHIPU_API_KEY="..."
ZHIPU_BASE_URL="https://open.bigmodel.cn/api/paas/v4"

# Tavily 联网搜索
TAVILY_API_KEY="..."

# Resend 邮件
RESEND_API_KEY="..."
EMAIL_FROM="noreply@yourdomain.com"

# 生产环境
NODE_ENV="production"
```

> **校对**：`.env.example` 是 source of truth，发现这里有遗漏请以 `.env.example` 为准。可执行 `grep -r "process.env\." src/` 二次校验。

---

## 6. 数据库迁移 + 构建

```bash
cd /opt/docmind

# 装依赖
pnpm install --frozen-lockfile

# 跑 Prisma migration
pnpm prisma migrate deploy
pnpm prisma generate

# 一次性脚本：把历史用户的 API key 用 USER_API_KEY_ENCRYPTION_KEY 加密回填
# （从 commit f855ebe 起引入，全新部署也跑一遍无副作用）
pnpm migrate:user-api-keys

# 构建（项目已开启 output: 'standalone'，build 后会生成 .next/standalone/）
pnpm build

# 把 public 和 静态资源拷进 standalone 目录（standalone 不会自动包含它们）
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

> **关于 standalone**：项目 `next.config.ts` 已开启 `output: 'standalone'`，生产用 `node .next/standalone/server.js` 启动 Web，部署体积小一个数量级。**注意 Worker 进程不受影响**——`pnpm worker` 仍然跑 `tsx src/worker-process.ts`，依赖完整的源码 + `node_modules`，所以上面的 `pnpm install` 步骤不能省。

---

## 7. 用 pm2 管理 Web + Worker 两个进程

在 `/opt/docmind` 下新建 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [
    {
      // Web：跑 standalone 产物。HOSTNAME / PORT 是 standalone server.js 读取的环境变量
      name: 'docmind-web',
      cwd: '/opt/docmind',
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '3000',
      },
      max_memory_restart: '1G',
      autorestart: true,
    },
    {
      // Worker：和 standalone 无关，直接跑源码
      name: 'docmind-worker',
      cwd: '/opt/docmind',
      script: 'pnpm',
      args: 'worker',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
      autorestart: true,
    },
  ],
}
```

启动：
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 输出一条命令，按提示执行使 pm2 开机自启
```

**确认进程运行**：
```bash
pm2 list
pm2 logs docmind-web --lines 50
pm2 logs docmind-worker --lines 50
```

如果某个进程一直 restart，先看 logs 定位环境变量或依赖问题。

---

## 8. Nginx 反代 + HTTPS

新建 `/etc/nginx/sites-available/docmind`：

```nginx
server {
    listen 80;
    server_name docmind.yourdomain.com;

    # Let's Encrypt 验证用，HTTPS 跳转放下面
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name docmind.yourdomain.com;

    # certbot 会自动写这两行
    # ssl_certificate ...
    # ssl_certificate_key ...

    # 大文件上传支持（项目支持 50MB）
    client_max_body_size 60M;

    # SSE 流式输出关键配置
    proxy_buffering off;          # 必须关闭，否则 SSE 会被缓冲
    proxy_cache off;
    proxy_read_timeout 600s;      # SSE 长连接超时
    proxy_send_timeout 600s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用 + 测试 + reload：
```bash
sudo ln -s /etc/nginx/sites-available/docmind /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**签发 HTTPS 证书**：
```bash
# 提前确认 DNS A 记录已经指向服务器 IP
sudo certbot --nginx -d docmind.yourdomain.com
# 按提示选 redirect, certbot 会自动写 ssl_certificate 配置
```

证书自动续期（certbot 自带 systemd timer，验证一下）：
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 9. 备份策略（强烈建议）

新建 `/opt/docmind/backup.sh`：

```bash
#!/bin/bash
set -e
BACKUP_DIR=/opt/docmind/backups
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Postgres
docker exec docmind-postgres pg_dump -U docmind docmind | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# MinIO（文件 + bucket 元数据）
mc mirror --overwrite local/docmind $BACKUP_DIR/minio_$DATE/

# 清理 14 天以上的备份
find $BACKUP_DIR -name "postgres_*.sql.gz" -mtime +14 -delete
find $BACKUP_DIR -maxdepth 1 -name "minio_*" -type d -mtime +14 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

```bash
chmod +x /opt/docmind/backup.sh

# 加 crontab：每天凌晨 3 点跑
crontab -e
# 添加一行
0 3 * * * /opt/docmind/backup.sh >> /opt/docmind/backups/backup.log 2>&1
```

**Elasticsearch 索引不备份的理由**：向量数据可以从原文档重新生成，备份原文档（MinIO）+ 文档元数据（Postgres）足够。如果想备份 ES，可以加 snapshot 仓库或 `elasticdump`，但优先级低。

---

## 10. 监控与日志

**最简方案**：pm2 自带 + 服务器原生工具

```bash
# 看进程状态
pm2 monit

# 看 docker 容器
docker stats

# 系统资源
htop
df -h
```

**建议加上 Sentry**（免费 5k events/月）：
1. 注册 sentry.io 拿 DSN
2. 项目集成 `@sentry/nextjs`
3. 错误自动上报，比纯黑盒强很多

**日志位置**：
- pm2 日志：`~/.pm2/logs/`
- docker 日志：`docker logs <container>`
- Nginx 访问 / 错误：`/var/log/nginx/`

---

## 11. 部署后验证清单

按顺序逐项检查：

- [ ] `https://docmind.yourdomain.com` 能打开首页，证书绿锁
- [ ] `curl -i https://docmind.yourdomain.com/api/health` 返回 200，body 形如 `{"status":"ok","checks":{"postgres":{"status":"up"},"redis":{...},"elasticsearch":{...},"minio":{...}}}`；任一依赖挂时返回 503
- [ ] 注册一个新账号 → 收到验证码邮件
- [ ] GitHub OAuth 登录走通（Callback URL 配的是 `https://docmind.yourdomain.com/api/auth/callback/github`）
- [ ] 创建知识库 → 上传一个 PDF → 状态从 processing → ready（看 worker 日志确认 BullMQ job 跑了）
- [ ] 上传一个 30MB+ 的大文件（验证 Nginx `client_max_body_size`）
- [ ] 发起一次对话，确认 SSE 流式输出**逐字渲染**而不是等全部完成才出现（验证 `proxy_buffering off`）
- [ ] 触发一次联网搜索（问一个文档里没有的实时问题）确认 Tool Calling 工作
- [ ] 退出登录 → 多设备同步登出
- [ ] 检查 ES 索引存在：`curl 127.0.0.1:9200/_cat/indices?v`
- [ ] 检查 Postgres 数据：`docker exec -it docmind-postgres psql -U docmind -c '\dt'`
- [ ] 跑一次 `backup.sh`，确认备份文件生成

---

## 12. 后续运维常用命令

```bash
# 更新代码 + 重启
cd /opt/docmind
git pull
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
# standalone 产物需要重新拷 public 和 static
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
pm2 restart all

# 重启某个进程
pm2 restart docmind-web

# 重启依赖
docker compose -f docker-compose.prod.yml restart redis

# 进 Postgres
docker exec -it docmind-postgres psql -U docmind

# 进 Redis
docker exec -it docmind-redis redis-cli -a <REDIS_PASSWORD>

# 看 ES 索引大小
curl 127.0.0.1:9200/_cat/indices?v
```

---

## 13. 常见问题

**Q: SSE 输出一次性返回不是流式？**
A: 99% 是 Nginx `proxy_buffering off` 没生效。重新检查 server block 配置，reload Nginx。

**Q: 上传大文件 413 Request Entity Too Large？**
A: Nginx `client_max_body_size` 没设或太小。同时检查 Next.js 的 body 大小限制（`route.ts` 里如果用 `req.formData()` 没有显式限制，默认应该够）。

**Q: BullMQ job 不消费？**
A: 检查 worker 是否真起来了（`pm2 logs docmind-worker`），检查 Redis 连接是否通（密码、URL）。

**Q: ES 内存吃满 OOM？**
A: 降 `ES_JAVA_OPTS=-Xms512m -Xmx512m`，或者升级服务器内存。

**Q: GitHub OAuth 回调失败？**
A: 在 GitHub OAuth App 设置里把 Authorization callback URL 改成生产域名的 `/api/auth/callback/github`，不能是 localhost。

**Q: 注册收不到邮件？**
A: Resend 域名验证没做。去 Resend 控制台加 DNS 记录（SPF / DKIM），不然只能给注册时用的同一邮箱发。

---

## 14. 进阶优化（可选）

- **CDN**：把静态资源（Next.js 的 `/_next/static/`）走 CDN，省服务器带宽
- **Docker 化 Next.js 自身**：方便迁移，但开发期 pm2 更方便调试
- **Postgres 主从**：单机够用就不需要
- **Elasticsearch 集群**：单节点足够个人项目；千万级向量再考虑分片
- **Cloudflare 前置**：免费 CDN + DDoS 防护 + 节流

---

部署中遇到具体卡点直接来问，我可以根据日志定位。
