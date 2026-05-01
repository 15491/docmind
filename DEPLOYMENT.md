# DocMind 部署指南

## 总览

本指南覆盖 DocMind 从代码到生产环境的完整部署流程（基于自托管 VPS）。

**推荐配置**：
- VPS: 2C4G，50GB SSD（预估 $20-30/月）
- OS: Ubuntu 20.04 LTS / 22.04 LTS
- Docker + Docker Compose（一键启动所有依赖）

**预计部署时间**: 30-45 分钟

---

## 前置要求

### VPS 侧
- ✅ Linux VPS（Ubuntu/Debian）已购买并可 SSH 访问
- ✅ 公网 IP（或域名指向）
- ✅ 端口可访问：80、443、3000（或反向代理后的其他端口）

### 本地侧
- ✅ 代码已 `git clone` 或上传到 VPS
- ✅ 获得必要的 API Keys：
  - Zhipu AI: https://open.bigmodel.cn/
  - Resend: https://resend.com/
  - GitHub OAuth（可选）: https://github.com/settings/developers
  - Tavily（可选）: https://tavily.com/

---

## 步骤 1：VPS 初始化

### 1.1 连接 VPS

```bash
ssh root@<your-vps-ip>
```

### 1.2 安装 Docker 和 Docker Compose

```bash
# 更新包管理器
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version && docker-compose --version
```

### 1.3 克隆项目代码

```bash
cd /opt
git clone https://github.com/your-username/docmind.git
cd docmind
```

---

## 步骤 2：准备环境文件

### 2.1 从模板创建 .env 文件

```bash
cp .env.example .env.production
```

### 2.2 编辑 .env.production

```bash
nano .env.production
```

**填入以下关键配置**：

```env
# ━━━ 数据库 ━━━
DATABASE_URL="postgresql://docmind:SecurePassword123@postgres:5432/docmind"

# ━━━ Redis ━━━
REDIS_URL="redis://redis:6379"

# ━━━ MinIO ━━━
MINIO_ENDPOINT="minio"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="SecureMinIOPassword123"

# ━━━ Elasticsearch ━━━
ELASTICSEARCH_HOST="http://elasticsearch:9200"

# ━━━ NextAuth ━━━
AUTH_SECRET="$(openssl rand -base64 32)"

# ━━━ Zhipu AI（必需）━━━
ZHIPU_API_KEY="your-zhipu-api-key-here"

# ━━━ Resend（必需）━━━
RESEND_API_KEY="your-resend-api-key-here"
EMAIL_FROM="noreply@yourdomain.com"

# ━━━ GitHub OAuth（可选）━━━
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# ━━━ Tavily 网络搜索（可选）━━━
TAVILY_API_KEY="your-tavily-api-key-here"
```

**重要**：
- 替换所有密钥和 API Keys 为实际值
- `AUTH_SECRET` 必须是随机字符串，用 `openssl rand -base64 32` 生成
- 保护好 `.env.production`，不要提交到 Git

---

## 步骤 3：启动应用（Docker Compose）

### 3.1 创建/验证 docker-compose.yml

检查项目根目录是否有 `docker-compose.yml`，如没有，创建：

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: docmind-postgres
    environment:
      POSTGRES_USER: docmind
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-SecurePassword123}
      POSTGRES_DB: docmind
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U docmind"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: docmind-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: docmind-minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-SecureMinIOPassword123}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: docmind-elasticsearch
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
      ES_JAVA_OPTS: "-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: docmind-app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://docmind:${POSTGRES_PASSWORD:-SecurePassword123}@postgres:5432/docmind
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_USE_SSL: "false"
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY:-SecureMinIOPassword123}
      ELASTICSEARCH_HOST: http://elasticsearch:9200
      AUTH_SECRET: ${AUTH_SECRET}
      ZHIPU_API_KEY: ${ZHIPU_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      EMAIL_FROM: ${EMAIL_FROM}
      AUTH_GITHUB_ID: ${AUTH_GITHUB_ID}
      AUTH_GITHUB_SECRET: ${AUTH_GITHUB_SECRET}
      TAVILY_API_KEY: ${TAVILY_API_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./.env.production:/app/.env.production
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
  elasticsearch_data:
EOF
```

### 3.2 创建 Dockerfile

检查项目根目录是否有 `Dockerfile`，如没有，创建：

```bash
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY pnpm-lock.yaml package.json ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 生成 Prisma 客户端
RUN pnpm exec prisma generate

# 构建应用
RUN pnpm build

# ━━━ 运行阶段 ━━━
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建产物和依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 启动命令
CMD ["pnpm", "start"]
EOF
```

### 3.3 启动所有服务

```bash
# 构建并启动（首次）
docker-compose up -d

# 检查所有服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 3.4 数据库初始化

等待应用启动（查看日志中的"ready on"），然后手动运行迁移：

```bash
docker-compose exec app pnpm prisma migrate deploy
```

---

## 步骤 4：Nginx 反向代理（可选但推荐）

### 4.1 安装 Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 4.2 配置 Nginx

```bash
cat > /etc/nginx/sites-available/docmind << 'EOF'
upstream docmind {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://docmind;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/docmind /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 4.3 配置 HTTPS（使用 Let's Encrypt）

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d your-domain.com

# 自动续期
systemctl enable certbot.timer
```

---

## 步骤 5：监控和维护

### 5.1 查看日志

```bash
# 应用日志
docker-compose logs -f app

# 特定服务日志
docker-compose logs -f postgres
docker-compose logs -f elasticsearch
```

### 5.2 备份数据

```bash
# 备份 PostgreSQL
docker-compose exec postgres pg_dump -U docmind docmind > backup_$(date +%Y%m%d).sql

# 备份 MinIO 数据
tar -czf minio_backup_$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/docmind_minio_data/_data
```

### 5.3 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build

# 运行迁移（如果有新的 schema 变更）
docker-compose exec app pnpm prisma migrate deploy
```

---

## 故障排查

### 问题：应用无法连接 PostgreSQL

```bash
# 检查 PostgreSQL 状态
docker-compose logs postgres

# 检查数据库是否存在
docker-compose exec postgres psql -U docmind -l
```

### 问题：Elasticsearch 内存不足

```bash
# 增加堆内存（修改 docker-compose.yml 中的 ES_JAVA_OPTS）
ES_JAVA_OPTS="-Xms1g -Xmx1g"

# 重启 Elasticsearch
docker-compose restart elasticsearch
```

### 问题：MinIO 文件访问超时

```bash
# 增加代理超时（Nginx 配置）
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
proxy_connect_timeout 600s;
```

---

## 性能优化建议

1. **增大 VPS 规格**：
   - 测试期：2C4G
   - 日活 100+ 用户：4C8G（$40-50/月）
   - 日活 1000+ 用户：8C16G（$80-100/月）

2. **Elasticsearch 优化**：
   - 启用副本：`number_of_replicas: 1`（高可用）
   - 调整堆内存：`-Xmx2g`（建议总内存的 50%）

3. **Redis 持久化**：
   - 当前使用 `--appendonly yes`（最安全）
   - 可改为 RDB 快照以提高性能

4. **数据库连接池**：
   - Prisma 默认 `connection_limit: 5`，可按需调整

---

## 安全建议

1. **防火墙规则**：
   ```bash
   ufw enable
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw deny 5432/tcp   # 禁止外网访问数据库
   ufw deny 6379/tcp   # 禁止外网访问 Redis
   ufw deny 9000/tcp   # 禁止外网访问 MinIO
   ufw deny 9200/tcp   # 禁止外网访问 Elasticsearch
   ```

2. **定期备份**：
   - 每日备份数据库和 MinIO 文件
   - 备份上传到 S3 或异地存储

3. **监控告警**：
   - 监控磁盘空间、内存、CPU 使用率
   - Elasticsearch 索引大小

---

## 估算成本

| 项目 | 月成本 |
|------|--------|
| VPS (2C4G, 50GB) | $20-30 |
| Zhipu AI | $1-10（按量） |
| Resend | 0（免费额度） |
| Tavily | 0（免费额度 1000/月） |
| **总计** | **$20-40** |

---

## 需要帮助？

- 查看 [README.md](./README.md) 了解项目概览
- 查看 [.env.example](./.env.example) 了解所有环境变量
- 查看 [CLAUDE.md](./CLAUDE.md) 了解架构和开发指南
