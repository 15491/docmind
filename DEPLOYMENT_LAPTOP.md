# DocMind 笔记本部署指南

## 总览

本指南覆盖在个人笔记本/桌面电脑上部署 DocMind，通过 Cloudflare Tunnel 暴露到公网，实现 24/7 可访问的私有知识库系统。

**适用场景**：
- 个人学习与演示
- 小团队内部使用（5-20 人）
- 开发测试环境

**硬件需求**：
- CPU：4 核+ （推荐 Intel i5/i7、AMD Ryzen 5/7）
- 内存：8GB+（推荐 16GB）
- 存储：100GB+（SSD 优佳）
- OS：Ubuntu 20.04 LTS / 22.04 LTS（或其他 Linux 发行版）
- 网络：稳定的家庭/办公网络（固定 IP 不需要）

**预计部署时间**: 20-30 分钟

---

## 前置要求

### 笔记本侧

- ✅ Ubuntu/Debian Linux 系统已安装
- ✅ 网络连接正常（WiFi 或有线）
- ✅ 有 root/sudo 权限
- ✅ 获得必要的 API Keys：
  - Zhipu AI: https://open.bigmodel.cn/
  - Resend: https://resend.com/
  - GitHub OAuth（可选）: https://github.com/settings/developers
  - Tavily（可选）: https://tavily.com/

### 网络暴露

- ✅ Cloudflare 账户（免费，需注册）
- ✅ 一个域名（可在 Cloudflare 免费注册 .tk/.ml 等，或从其他商家购买）
- ✅ 域名 DNS 指向 Cloudflare（一键配置）

---

## 步骤 1：笔记本系统配置

### 1.1 禁用睡眠和屏幕锁定

防止笔记本进入睡眠导致服务中断：

```bash
# 禁用睡眠
sudo systemctl mask sleep.target suspend.target hibernate.target

# 禁用屏幕锁定（可选）
gsettings set org.gnome.desktop.session idle-delay 0

# 设置笔记本盖子关闭时不休眠（GNOME Desktop）
gsettings set org.gnome.settings-daemon.plugins.power lid-close-ac-action 'nothing'
gsettings set org.gnome.settings-daemon.plugins.power lid-close-battery-action 'nothing'

# 验证设置
systemctl status sleep.target
```

### 1.2 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 启用 Wake-on-LAN（可选，增加可靠性）

编辑 `/etc/systemd/sleep.conf`：

```bash
sudo nano /etc/systemd/sleep.conf
```

添加：
```ini
[Sleep]
AllowSuspend=no
AllowHibernation=no
```

---

## 步骤 2：安装 Docker 和 Docker Compose

### 2.1 安装 Docker

```bash
# 使用官方脚本安装（推荐）
curl -fsSL https://get.docker.com | sh

# 将当前用户加入 docker 组（避免每次都用 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version
docker run hello-world
```

### 2.2 安装 Docker Compose

```bash
# 下载最新版本
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 2.3 启用 Docker 开机自启

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 步骤 3：克隆项目并配置

### 3.1 克隆代码

```bash
# 建议放在 /home/username/docmind
cd ~
git clone https://github.com/your-username/docmind.git
cd docmind
```

### 3.2 创建环境文件

```bash
cp .env.example .env.production
```

### 3.3 编辑环境变量

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

---

## 步骤 4：启动 DocMind

### 4.1 启动所有服务

```bash
# 进入项目目录
cd ~/docmind

# 后台启动
docker-compose up -d

# 查看所有服务状态
docker-compose ps

# 查看应用日志（实时）
docker-compose logs -f app
```

### 4.2 初始化数据库

等待应用启动（日志中看到 "ready on http://0.0.0.0:3000"），然后：

```bash
docker-compose exec app pnpm prisma migrate deploy
```

### 4.3 验证本地访问

打开浏览器访问 `http://localhost:3000`，确保能正常加载。

---

## 步骤 5：配置 Cloudflare Tunnel（网络暴露）

### 5.1 准备域名

**选项 A：使用 Cloudflare 提供的免费域名**
1. 访问 https://www.cloudflare.com/
2. 免费注册账户
3. 在 Cloudflare 注册免费域名（.tk/.ml/.ga 等）
   - 例如：`docmind.tk`

**选项 B：使用现有域名**
1. 将域名 DNS 改为指向 Cloudflare（去域名商改 nameserver）
2. 在 Cloudflare 添加该域名

### 5.2 安装 Cloudflared

```bash
# 下载最新版
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# 安装
sudo dpkg -i cloudflared-linux-amd64.deb

# 验证
cloudflared --version
```

### 5.3 创建 Tunnel

```bash
# 登录 Cloudflare（会打开浏览器）
cloudflared tunnel login

# 创建 tunnel
cloudflared tunnel create docmind

# 输出会显示 Tunnel ID 和 credentials 文件位置
# 例如：Tunnel credentials written to /home/username/.cloudflared/xxx.json
```

### 5.4 配置 Tunnel 路由

```bash
# 将域名路由到 Tunnel
cloudflared tunnel route dns docmind your-domain.tk

# 验证
nslookup your-domain.tk
```

### 5.5 创建 Tunnel 配置文件

编辑 `~/.cloudflared/config.yml`：

```bash
nano ~/.cloudflared/config.yml
```

输入：

```yaml
tunnel: docmind
credentials-file: /home/username/.cloudflared/xxxx.json

ingress:
  - hostname: your-domain.tk
    service: http://localhost:3000
  - hostname: '*.your-domain.tk'
    service: http://localhost:3000
  - service: http_status:404
```

（替换 `xxxx.json` 为实际的 credentials 文件名）

### 5.6 启动 Tunnel

```bash
# 前台运行（调试）
cloudflared tunnel run docmind

# 或后台运行（生产）
nohup cloudflared tunnel run docmind > ~/.cloudflared/tunnel.log 2>&1 &
```

### 5.7 设置 Tunnel 开机自启（推荐）

```bash
# 安装为系统服务
sudo cloudflared service install

# 启动服务
sudo systemctl start cloudflared

# 查看状态
sudo systemctl status cloudflared

# 启用开机自启
sudo systemctl enable cloudflared
```

---

## 步骤 6：验证部署

### 6.1 本地验证

```bash
curl http://localhost:3000
```

### 6.2 公网验证

打开浏览器访问 `https://your-domain.tk`，确保能正常访问 DocMind。

### 6.3 查看 Tunnel 状态

```bash
# 查看 Tunnel 日志
sudo journalctl -u cloudflared -f

# 或检查 Cloudflare 仪表板
# https://dash.cloudflare.com/ → Tunnel → docmind
```

---

## 步骤 7：监控和维护

### 7.1 监控资源占用

```bash
# 实时查看容器内存/CPU
docker stats

# 查看磁盘占用
df -h

# 查看 Docker 数据卷大小
docker system df
```

### 7.2 查看日志

```bash
# 应用日志
docker-compose logs -f app

# 数据库日志
docker-compose logs -f postgres

# Elasticsearch 日志
docker-compose logs -f elasticsearch

# 最后 100 行
docker-compose logs --tail 100 app
```

### 7.3 定期备份

```bash
# 备份 PostgreSQL
mkdir -p ~/docmind-backups
docker-compose exec postgres pg_dump -U docmind docmind > ~/docmind-backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 备份 MinIO 数据（所有上传的文档）
tar -czf ~/docmind-backups/minio_backup_$(date +%Y%m%d).tar.gz $(docker volume inspect docmind_minio_data -f '{{ .Mountpoint }}')

# 设置定时备份（crontab）
crontab -e
```

添加到 crontab：

```cron
# 每天 2:00 AM 自动备份
0 2 * * * cd ~/docmind && docker-compose exec -T postgres pg_dump -U docmind docmind > ~/docmind-backups/backup_$(date +\%Y\%m\%d).sql 2>&1
```

### 7.4 更新应用

```bash
cd ~/docmind

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build

# 运行数据库迁移（如有 schema 变更）
docker-compose exec app pnpm prisma migrate deploy

# 查看启动日志
docker-compose logs -f app
```

---

## 故障排查

### 问题：服务启动后立即停止

```bash
# 查看容器状态和退出代码
docker-compose ps
docker-compose logs app

# 常见原因：
# 1. 环境变量配置错误 → 检查 .env.production
# 2. 依赖服务未就绪 → 等待 30s 后重试
# 3. 端口被占用 → 改 docker-compose.yml 中的端口号
```

### 问题：内存占用过高

```bash
# 查看哪个服务占用最多内存
docker stats

# 降低 Elasticsearch 堆内存
# 编辑 docker-compose.yml，修改：
# ES_JAVA_OPTS: "-Xms256m -Xmx256m"
# 然后重启
docker-compose restart elasticsearch
```

### 问题：公网无法访问

```bash
# 检查 Tunnel 状态
sudo systemctl status cloudflared

# 查看 Tunnel 日志
sudo journalctl -u cloudflared -n 50

# 检查 DNS 解析
nslookup your-domain.tk

# 检查本地服务是否正常
curl http://localhost:3000

# Cloudflare 仪表板检查
# https://dash.cloudflare.com/ → Tunnel → docmind → 查看连接状态
```

### 问题：笔记本睡眠导致服务中断

```bash
# 重新禁用睡眠
sudo systemctl mask sleep.target suspend.target hibernate.target

# 检查是否生效
systemctl status sleep.target

# 或者用 systemd-logind 配置
sudo nano /etc/systemd/logind.conf
# 修改 HandleLidSwitch=ignore
sudo systemctl restart systemd-logind
```

### 问题：Cloudflare Tunnel 连接断开

```bash
# 重启 Tunnel 服务
sudo systemctl restart cloudflared

# 查看日志诊断
sudo journalctl -u cloudflared -f

# 手动运行（测试）
cloudflared tunnel run docmind
```

---

## 性能优化建议

### 对于 16GB 内存笔记本

| 服务 | 堆内存配置 | 说明 |
|------|----------|------|
| Elasticsearch | `-Xms512m -Xmx512m` | 充足空间，支持数万文档 |
| PostgreSQL | shared_buffers = 256MB | 默认足够 |
| Redis | maxmemory = 256MB | 默认足够 |
| Node.js | 不需要限制 | Docker 默认分配足够 |

### 笔记本特定优化

1. **关闭不必要的后台进程**
   ```bash
   # 禁用 Bluetooth（如不需要）
   sudo systemctl disable bluetooth
   ```

2. **启用 zswap（内存压缩）**
   ```bash
   # 为内存溢出时的交换空间优化
   echo 1 | sudo tee /sys/module/zswap/parameters/enabled
   ```

3. **定期清理 Docker 垃圾**
   ```bash
   # 清理未使用的容器、镜像、卷
   docker system prune -a --volumes
   ```

---

## 笔记本 vs VPS 对比

| 对比项 | 笔记本 | VPS |
|-------|------|-----|
| **成本** | ¥0（现有硬件） | ¥20-40/月 |
| **可靠性** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **网络** | 家庭宽带（可能断网） | ISP 保障 |
| **硬件维护** | 自己处理 | 托管商负责 |
| **电力成本** | ~5-10 元/月 | 已含 |
| **扩展性** | 受硬件限制 | 随时升级 |

**何时选择笔记本**：
- 完全个人使用
- 演示 / 学习
- 开发测试环境
- 网络中断可以接受

**何时升级到 VPS**：
- 需要 24/7 可靠性
- 多人共享使用
- 生产环境

---

## 常用命令速查表

```bash
# 启动/停止所有服务
docker-compose up -d      # 启动
docker-compose down        # 停止并删除容器
docker-compose restart     # 重启

# 查看状态和日志
docker-compose ps         # 查看所有容器状态
docker-compose logs -f    # 实时查看所有日志

# 进入容器执行命令
docker-compose exec app bash                    # 进入应用容器 shell
docker-compose exec postgres psql -U docmind   # 连接数据库

# 数据库操作
docker-compose exec app pnpm prisma migrate deploy  # 运行迁移
docker-compose exec app pnpm prisma studio         # 打开 Prisma Studio

# Cloudflare Tunnel
cloudflared tunnel list                 # 查看所有 tunnel
sudo systemctl status cloudflared       # 查看 tunnel 服务状态
sudo journalctl -u cloudflared -f       # 实时查看 tunnel 日志

# 系统监控
docker stats                            # 查看资源占用
df -h                                   # 查看磁盘空间
free -h                                 # 查看内存
```

---

## 需要帮助？

- 查看 [README.md](./README.md) 了解项目概览
- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解 VPS 部署方案
- 查看 [CLAUDE.md](./CLAUDE.md) 了解架构和开发指南
- Cloudflare 文档：https://developers.cloudflare.com/cloudflare-one/connections/connect-applications/
