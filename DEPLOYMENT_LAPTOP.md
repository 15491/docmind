# DocMind 笔记本部署说明

本文档适用于把 `DocMind` 部署在个人电脑或笔记本上，长期运行用于演示、学习或小范围团队共享。

## 适用场景

- 个人作品展示
- 本地知识库长期运行
- 小团队内部试用

## 基本要求

- 系统：Windows、macOS 或 Linux
- Node.js 20+
- pnpm 9+
- Docker Desktop 或 Docker Engine
- 稳定网络

## 推荐资源

- CPU：4 核以上
- 内存：16 GB 更稳妥
- 磁盘：至少 30 GB 可用空间

## 第一步：准备项目

```bash
git clone <your-repo-url> docmind
cd docmind
pnpm install
```

## 第二步：配置环境变量

```bash
cp .env.example .env.local
```

至少填写：

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_*`
- `ELASTICSEARCH_HOST`
- `AUTH_SECRET`
- `USER_API_KEY_ENCRYPTION_KEY`（推荐，未设置时回退到 `AUTH_SECRET`）
- `ZHIPU_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`

如需联网补充：

- `TAVILY_API_KEY`

## 第三步：启动依赖服务

```bash
docker compose up -d
```

## 第四步：初始化项目

```bash
pnpm prisma generate
pnpm dev
```

另开一个终端启动 Worker：

```bash
pnpm worker
```

## 第五步：开放公网访问

如果只是本机访问，这一步可以跳过。  
如果你希望给外部设备访问，推荐两种方式：

- 局域网访问
- Cloudflare Tunnel

### 方式一：局域网访问

确保开发机与访问设备在同一网络下，然后用本机 IP 访问：

```txt
http://<your-local-ip>:3000
```

### 方式二：Cloudflare Tunnel

1. 注册 Cloudflare 账号
2. 准备一个域名
3. 安装 `cloudflared`
4. 建立指向本地 `3000` 端口的 Tunnel

示例：

```bash
cloudflared tunnel login
cloudflared tunnel create docmind
cloudflared tunnel route dns docmind ai.your-domain.com
cloudflared tunnel run docmind
```

然后把服务指向本地应用：

```yaml
url: http://localhost:3000
```

## 长期运行建议

- 把 Docker 服务设置为开机自启
- 把 `pnpm worker` 单独守护
- 如果是 Windows，尽量避免系统睡眠
- 如果是 macOS / Linux，建议关闭自动休眠

## 适合求职展示的运行方式

推荐这样准备：

- 本地启动依赖服务
- 应用使用生产构建运行
- 通过 Cloudflare Tunnel 暴露在线地址
- 准备一个示例知识库和几段可演示问题

启动命令：

```bash
pnpm build
pnpm start
pnpm worker
```

## 常见问题

### 1. 电脑锁屏后服务中断

检查系统是否进入睡眠，尤其是笔记本合盖行为。

### 2. 文档上传后无法检索

优先检查：

- Worker 是否运行
- Elasticsearch 是否正常
- 文档状态是否已变为可用

### 3. 外网能打开页面但无法登录或发消息

优先检查：

- 回调域名是否正确
- 代理是否转发了长连接
- `AUTH_SECRET`、OAuth 配置是否正确

## 不建议的用法

- 不建议用笔记本长期承载正式生产流量
- 不建议把所有数据直接存桌面目录且不做备份
- 不建议在低内存机器上同时跑大模型本地推理与 Elasticsearch
