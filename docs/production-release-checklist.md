# Production Release Checklist

> 适用于当前 `share-project` 的 SQLite + Prisma 发布流程。

## Purpose

这份清单只解决一件事：

把 `main` 上的新代码和新 migration 安全发布到服务器，同时保住线上已有数据。

## Before You Start

发布前先确认：

- 已经合并到 `main`
- `prisma/schema.prisma` 和 `prisma/migrations` 已经进入仓库
- 本地已经至少跑过一次构建或关键测试
- 服务器上的生产数据库不在仓库目录里

推荐目标结构：

Windows:

```text
repo:
  E:\Projects\share-project

prod db:
  E:\data\share-project\prod.db
```

Linux:

```text
repo:
  /srv/share-project

prod db:
  /srv/share-project-data/prod.db
```

## Release Flow

```text
[merge to main]
       |
       v
[backup prod db]
       |
       v
[git pull origin main]
       |
       v
[npx prisma migrate deploy]
       |
       v
[npx prisma generate]
       |
       v
[npm run build]
       |
       v
[restart app]
       |
       v
[smoke check]
```

## Linux Example

### 1. Backup database

```bash
mkdir -p /srv/share-project-data/backups
cp /srv/share-project-data/prod.db /srv/share-project-data/backups/prod-$(date +%F-%H%M%S).db
```

### 2. Pull latest code

```bash
cd /srv/share-project
git pull origin main
```

### 3. Run migration

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Build app

```bash
npm install
npm run build
```

### 5. Restart app

如果你们用 `pm2`：

```bash
pm2 restart share-project
```

如果你们用 `systemd`：

```bash
sudo systemctl restart share-project
```

### 6. Smoke check

检查以下内容：

- 首页能打开
- 登录可用
- 主要页面可进入
- 新功能涉及的数据结构正常工作
- 服务器日志没有 Prisma migration 错误

## Windows Example

### 1. Backup database

```powershell
New-Item -ItemType Directory -Force E:\data\share-project\backups
Copy-Item E:\data\share-project\prod.db E:\data\share-project\backups\prod-$(Get-Date -Format "yyyy-MM-dd-HHmmss").db
```

### 2. Pull latest code

```powershell
Set-Location E:\Projects\share-project
git pull origin main
```

### 3. Run migration

```powershell
npx prisma migrate deploy
npx prisma generate
```

### 4. Build app

```powershell
npm install
npm run build
```

### 5. Restart app

按你们当前的服务启动方式重启应用。

### 6. Smoke check

至少确认：

- 页面能打开
- 登录可用
- 控制台没有 migration 报错

## Rollback Rule

如果 migration 或启动失败：

```text
do not overwrite prod db with a local dev db
restore from backup first
```

回滚优先级：

1. 停止继续写入线上库
2. 回退代码版本
3. 用刚才的备份恢复生产数据库
4. 重新启动服务

## Final Reminder

发布时真正上线的是：

- code
- schema
- migrations

不是：

- 某个人本地的 `dev.db`
