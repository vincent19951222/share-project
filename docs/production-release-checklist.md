# Production Release Checklist

> 适用于 `share-project` 当前 Next.js + Prisma + SQLite + PM2 发布流程。目标是把代码发布到生产目录，同时保护 `prod.db`。

## Release Target

Windows 生产约定：

```text
code: E:\Projects\share-project
db:   E:\data\share-project\prod.db
env:  DATABASE_URL="file:/E:/data/share-project/prod.db"
```

本地开发 / 验收约定：

```text
db:   /Users/vincent/data/share-project/dev.db
env:  DATABASE_URL="file:/Users/vincent/data/share-project/dev.db"
```

不要把本地 `dev.db`、验收 seed、`scripts/fill-gamification-test-data.ts` 写到生产库。

## Pre-Release Gate

发布前在本地或预发布分支完成：

```bash
npm test
npm run lint
npm run build
```

如果涉及数据库结构变化，在测试库先执行：

```bash
npx prisma db push
npx tsx prisma/seed.ts
npx tsx scripts/fill-gamification-test-data.ts
```

通过后再考虑生产发布。生产环境不要执行 `prisma/seed.ts` 或验收数据填充脚本。

## Production Flow

```text
[confirm release commit]
       |
       v
[backup prod.db]
       |
       v
[pull code in production repo]
       |
       v
[install dependencies]
       |
       v
[sync prisma schema if needed]
       |
       v
[build]
       |
       v
[restart PM2 with production DATABASE_URL]
       |
       v
[post-release smoke]
```

## Windows Commands

### 1. Confirm Production Env

确认生产启动时使用：

```powershell
$env:DATABASE_URL="file:/E:/data/share-project/prod.db"
```

PM2 重启时也必须带上 `--update-env`，否则可能继续使用旧环境变量。

### 2. Backup `prod.db`

发布前必须备份：

```powershell
New-Item -ItemType Directory -Force E:\data\share-project\backups
Copy-Item E:\data\share-project\prod.db E:\data\share-project\backups\prod-$(Get-Date -Format "yyyy-MM-dd-HHmmss").db
```

确认备份文件存在且大小合理：

```powershell
Get-ChildItem E:\data\share-project\backups | Sort-Object LastWriteTime -Descending | Select-Object -First 3
```

### 3. Pull Code

```powershell
Set-Location E:\Projects\share-project
git status
git pull origin main
```

如果这次先发预发布分支，把 `main` 换成对应分支名。

### 4. Install Dependencies

```powershell
npm install
```

### 5. Sync Prisma Schema

如果 `prisma/schema.prisma` 相比生产当前版本有变化，先确认已经备份 `prod.db`，再执行：

```powershell
npx prisma db push
npx prisma generate
```

如果本次只是前端、文案或纯业务逻辑变更，且 schema 没有变化，可以跳过 `db push`，但仍建议执行：

```powershell
npx prisma generate
```

注意：

- 当前项目本地开发约定使用 `npx prisma db push` 同步 SQLite schema。
- 不要在生产执行 `npx tsx prisma/seed.ts`。
- 不要在生产执行 `npx tsx scripts/fill-gamification-test-data.ts`。

### 6. Build

```powershell
npm run build
```

构建失败不要重启生产服务，先修复构建问题。

### 7. Start Or Restart PM2

首次启动：

```powershell
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 start node_modules\next\dist\bin\next --name share-project -- start -p 3000"
```

已有服务重启：

```powershell
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 restart share-project --update-env"
```

检查状态和日志：

```powershell
pm2 status
pm2 logs share-project --lines 100
```

## Post-Release Smoke

优先做不破坏生产数据的检查：

- [ ] 打开 `/login`，页面无 500。
- [ ] 使用已有账号登录成功。
- [ ] 主面板能加载打卡、共享看板、咖啡、日历、战报中心、补给站入口。
- [ ] 补给站能加载四维任务、抽奖券余额、背包、弱社交和兑换状态。
- [ ] 团队动态能加载，不出现 Prisma schema 或 missing column 报错。
- [ ] 战报中心能读取周报快照。
- [ ] 管理员账号能看到兑换待处理队列。

如果有专门的生产测试账号，再做可变更数据的 smoke：

- [ ] 测试账号完成一次今日打卡，确认银子和抽奖券到账。
- [ ] 测试账号在券不足 10 张但银子足够时，补券十连能按 `40 银子 / 张` 扣费。
- [ ] 测试账号申请一次真实福利兑换。
- [ ] 管理员确认或取消该兑换。
- [ ] 管理员发布本周牛马补给周报，重复发布应复用同一条 Team Dynamic。

## Rollback Rule

如果发布后出现启动失败、schema 错误或数据异常：

```text
stop writes first
restore prod.db from the release backup
roll back code to the previous commit
restart PM2 with production DATABASE_URL
run smoke again
```

不要用本地 `dev.db` 覆盖生产 `prod.db`。

Windows 恢复示例：

```powershell
pm2 stop share-project
Copy-Item E:\data\share-project\backups\<backup-file>.db E:\data\share-project\prod.db -Force
Set-Location E:\Projects\share-project
git checkout <previous-good-commit>
npm install
npm run build
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 restart share-project --update-env"
```

## Final Checks

- [ ] 当前代码 commit / branch 已记录。
- [ ] `prod.db` 已备份。
- [ ] 生产 `DATABASE_URL` 指向 `file:/E:/data/share-project/prod.db`。
- [ ] 生产未执行 seed 或验收数据脚本。
- [ ] `npm run build` 在生产通过。
- [ ] PM2 使用 `--update-env` 重启。
- [ ] 发布后 smoke 通过。
