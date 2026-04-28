# 脱脂牛马

一个基于 Next.js 的健身团队打卡与战报看板应用。项目使用纯 Next.js 架构，页面、API Routes、认证和 SQLite 数据都在同一个仓库内。

## 技术栈

- Next.js 15
- TypeScript
- Prisma + SQLite
- better-sqlite3 adapter
- Vitest

## 环境要求

- Node.js 22+
- npm
- Windows 环境下建议使用 PowerShell / CMD

## 安装依赖

```bash
npm install
```

## 本地开发

本地开发默认使用仓库内的开发数据库：

```env
DATABASE_URL="file:./prisma/dev.db"
```

`.env.example` 已经是这个默认值。首次启动本地开发时，建议按下面顺序执行：

```bash
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

说明：

- 新拉取项目后，默认不会自带 `prisma/dev.db`
- 这是预期行为，因为 `dev.db` 不再作为仓库文件提交
- `npx prisma db push` 会创建本地开发数据库和表结构
- `npx tsx prisma/seed.ts` 会写入一份基础开发数据
- 本地 `dev.db` 应视为可重建文件，而不是需要从 git 同步的资产

常用命令：

```bash
npm run dev
npm test
npm run lint
npm run build
```

## 生产运行

当前约定：

- `E:\Projects\share-project` 是生产代码目录
- `E:\data\share-project\prod.db` 是生产数据库

生产环境的 `.env` 应使用：

```env
DATABASE_URL="file:/E:/data/share-project/prod.db"
WEWORK_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
```

`WEWORK_WEBHOOK_URL` 为可选配置。配置后，管理员发布本周战报时会自动向对应企业微信群机器人推送 markdown 周报；未配置时发布流程正常完成，只跳过企业微信推送。

标准生产启动流程：

```bash
npm install
npm run build
npm start
```

## 使用 PM2 启动生产服务

Windows 下不要直接用 `pm2 start npm --name ... -- start`，因为容易踩到 `npm.cmd` / PowerShell 的执行问题。

推荐直接托管 Next.js 可执行文件，并显式带上生产数据库环境变量：

```powershell
cd E:\Projects\share-project
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 start node_modules\next\dist\bin\next --name share-project -- start -p 3000"
```

更新代码后的推荐流程：

```powershell
cd E:\Projects\share-project
git pull origin main
npm install
npm run build
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 restart share-project --update-env"
```

常用 PM2 命令：

```powershell
cmd /c pm2 status share-project
cmd /c pm2 logs share-project --lines 100
cmd /c pm2 restart share-project --update-env
cmd /c pm2 stop share-project
cmd /c pm2 delete share-project
```

## 数据库约定

项目区分生产数据库和开发数据库。

### 生产数据库

- 路径：`E:\data\share-project\prod.db`
- 用途：真实业务数据
- 不进 git

### 开发数据库

- 默认路径：`prisma/dev.db`
- 用途：本地开发、调试、跑种子
- 不作为生产数据源
- 不应再作为多人同步数据库的方式
- 新同学拉取项目后，需要自行通过 `db push` + `seed` 初始化

## 推荐目录策略

建议把生产和开发分成两个目录，不要混用：

- `E:\Projects\share-project`：生产目录
- `E:\Projects\share-project-dev`：开发目录

这样做的好处：

- 生产 `.env` 不会被开发配置覆盖
- 不容易误连生产数据库做开发操作
- `npm run dev`、`prisma db push`、`seed` 不会误打到生产环境

## 注意事项

- 生产目录不要运行 `npm run dev`
- 生产目录不要执行 `npx prisma db push`
- 生产目录不要执行 `npx tsx prisma/seed.ts`
- 数据库结构变更应在开发目录完成，并通过代码提交和部署上线
- 生产数据库文件不应放进 git
- 本地开发库可以重建，生产库必须先备份再操作

## 提交和发布建议

日常开发建议在开发目录完成：

1. 修改代码
2. 如有 schema 变化，执行 `npx prisma db push` 或 migration 流程
3. 本地测试
4. 提交代码
5. 合并到 `main`
6. 在生产目录拉取代码并重启服务

生产发布前建议至少确认：

- `.env` 指向生产库
- `npm run build` 成功
- PM2 进程状态正常
- `/login` 可访问

## 相关文件

- `AGENTS.md`：仓库内的开发说明
- `.env.example`：本地开发默认环境变量示例
- `docs/database-workflow.md`：数据库工作流说明
