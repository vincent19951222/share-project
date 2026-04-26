# SQLite + Prisma Database Workflow

> 适用于当前 `share-project` 的数据库协作、发布和快照流程。

## Goal

这份文档解决四件事：

- 本地如何基于线上快照开发
- 新字段 / 新表上线时，如何安全发布到服务器
- 合并到 `main` 之后，服务器会发生什么
- 线上数据更新后，本地如何拿到新的快照

## Short Answer

结论先写在前面：

- `git` 负责同步代码、`schema.prisma`、`prisma/migrations`
- 线上真实数据库文件不走 `git`
- 本地开发数据库文件也不作为发布物
- 上线数据库结构变更靠 `npx prisma migrate deploy`
- 本地需要真实数据时，从服务器手动导出一份 sqlite 快照

## Current Repo State

当前仓库还是混合状态：

- `.env` 里本地 `DATABASE_URL` 指向 `file:./prisma/dev.db`
- `prisma/dev.db` 目前仍然被 git 跟踪
- `prisma/migrations` 已经存在，说明项目已经具备正式 migration 能力

这意味着：

- 现在本地开发还能继续用 sqlite
- 但后续不能再把 `prisma/dev.db` 当成线上同步机制
- 推荐目标是把本地开发库迁到 `.local/dev.db`

## Recommended Model

推荐把数据库分成三类：

1. `local dev db`
   你本地开发用的数据库，可以是线上快照，也可以是自己临时测试数据。

2. `prod db`
   服务器真实数据库，保存线上真实用户数据。

3. `migration history`
   放在 git 里，描述数据库结构如何从旧版本升级到新版本。

流程关系如下：

```text
+-------------------+        +------------------------+
| local snapshot db | -----> | local code + migration |
+-------------------+        +------------------------+
                                      |
                                      v
                             +------------------+
                             | git branch/main  |
                             +------------------+
                                      |
                                      v
                             +------------------+
                             | server pulls code|
                             +------------------+
                                      |
                                      v
                             +----------------------+
                             | prisma migrate deploy|
                             +----------------------+
                                      |
                                      v
                             +----------------------+
                             | existing prod db     |
                             | upgraded in place    |
                             +----------------------+
```

## Golden Rules

- 不要用本地 `dev.db` 直接覆盖服务器真实库
- 不要指望 `git pull prisma/dev.db` 来同步线上真实数据
- 结构变更必须通过 migration 上线
- 上线前先备份服务器数据库
- 拉线上数据到本地时，用“导出快照”思路，不用“git 同步数据库文件”思路

## Should `.db` Files Be In Git

推荐决策：

- `prod.db`: 不进 git
- `snapshot db`: 不进 git
- `.local/dev.db`: 不进 git
- `prisma/dev.db`: 逐步退场，不再作为开发默认路径

原因很实际：

- sqlite 是二进制文件，不适合多人合并
- 本地调试数据和线上真实数据不是同一种东西
- 把 `.db` 放进 git，拿到的是一个“整库快照”，不是“升级步骤”
- 多人同时改库时，git 没法聪明合并两份 sqlite 文件

一句话：

```text
git 管“结构和代码”
db 文件管“真实数据”
```

## Standard Workflows

### 1. Local Development From a Production Snapshot

当你要做一个新功能，比如 `TeamDynamic`：

```text
[server prod db]
       |
       | export/copy snapshot
       v
[local snapshot db]
       |
       | point local DATABASE_URL to snapshot
       | develop feature
       | update schema.prisma
       | create migration
       v
[feature branch ready]
```

推荐步骤：

1. 从服务器导出一份最新快照
2. 放到本地，例如 `.local/dev.db` 或者 `.local/snapshots/<date>.db`
3. 本地开发代码
4. 修改 `prisma/schema.prisma`
5. 执行：

```bash
npx prisma migrate dev --name add-team-dynamics
```

6. 本地测试
7. 提交代码和 migration

注意：

- 本地这份库只是开发辅助，不是上线产物
- 你的本地快照可以只有 5 条数据，线上可以有 10 条，这不影响 migration 发布

### 2. Shipping a Schema Change

你开发了新功能，有字段增加、新表增加，推荐流程如下：

```text
[edit schema.prisma]
        |
        v
[npx prisma migrate dev --name ...]
        |
        v
[new migration generated]
        |
        v
[commit code + schema + migration]
        |
        v
[push feature branch]
```

应该提交的内容：

- application code
- `prisma/schema.prisma`
- `prisma/migrations/...`

不应该提交的内容：

- 用于开发的本地数据快照
- 想拿来替代服务器的 `.db` 文件

### 3. Merge to `main` and Deploy

合并到 `main` 以后，不是“数据库自动变新结构”，而是：

```text
[merge feature branch into main]
              |
              v
[server git pull origin main]
              |
              v
[server backup prod db]
              |
              v
[server npx prisma migrate deploy]
              |
              v
[prod db keeps old data + gains new structure]
```

部署时服务器应该执行：

```bash
git pull origin main
npx prisma migrate deploy
npm run build
npm start
```

如果你们有自己的重启方式，比如 `pm2` 或 systemd，就把启动命令替换掉。

### 4. Refresh Local Data From Production

当线上数据更新后，你本地想拿一份新的真实快照：

```text
[server prod db]
       |
       | backup current prod db
       v
[server backup file]
       |
       | copy to local machine
       v
[new local snapshot db]
       |
       | replace local dev db
       | or switch DATABASE_URL
       v
[continue development]
```

推荐做法：

- 每次开始一个较大的新功能前，重新拉一次线上快照
- 快照文件名带日期
- 本地保留 1 到 3 份最近快照即可

## What Happens to Existing Data

如果迁移类型是下面这些，通常不会伤已有数据：

- 新增表
- 新增可空字段
- 新增带默认值的字段
- 新增索引

如果迁移类型是下面这些，要格外小心：

- 删除字段
- 字段改类型
- 可空改非空
- 重命名字段
- 拆表并回填数据

可以这样理解：

```text
safe-ish change:
old rows stay where they are
new structure is added around them

risky change:
old rows may need transform/backfill/manual SQL
```

`TeamDynamic` 这种需求，理想做法是新增独立表，属于风险较低的迁移类型。

## Production Setup Recommendation

服务器生产环境建议不要继续使用仓库内的 `prisma/dev.db`。

推荐 Windows 生产路径：

```text
repo code path:
  E:\Projects\share-project

prod database path:
  E:\data\share-project\prod.db
```

Linux 也可以用仓库外目录，思路相同，例如：

```text
repo code path:
  /srv/share-project

prod database path:
  /srv/share-project-data/prod.db
```

Windows 环境变量示例：

```bash
DATABASE_URL="file:/E:/data/share-project/prod.db"
```

Linux 环境变量示例：

```bash
DATABASE_URL="file:/srv/share-project-data/prod.db"
```

这样做的好处：

- `git pull` 不会动真实数据库文件
- 代码目录和数据目录解耦
- 备份数据库更清晰

## Recommended Day-to-Day SOP

### Daily Development

```text
[pull latest main]
       |
       v
[refresh local snapshot if needed]
       |
       v
[develop locally]
       |
       v
[migrate dev]
       |
       v
[test]
       |
       v
[push branch]
```

### Release

```text
[merge to main]
       |
       v
[backup prod db]
       |
       v
[git pull]
       |
       v
[prisma migrate deploy]
       |
       v
[restart app]
```

## Suggested Commands

### Local

```bash
npx prisma migrate dev --name add-team-dynamics
npx prisma generate
npm test
npm run build
```

### Server

```bash
git pull origin main
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

### Backup Production DB

Windows example:

```powershell
Copy-Item E:\data\share-project\prod.db E:\data\share-project\backups\prod-2026-04-26.db
```

Linux example:

```bash
cp /srv/share-project-data/prod.db /srv/share-project-data/backups/prod-2026-04-26.db
```

### Refresh Local Dev Snapshot

Windows example:

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item E:\data\share-project\prod.db .\.local\dev.db
```

如果你想先保留本地当前库，再覆盖：

```powershell
New-Item -ItemType Directory -Force .local\backups
Copy-Item .\.local\dev.db .\.local\backups\dev-$(Get-Date -Format "yyyy-MM-dd-HHmmss").db
Copy-Item E:\data\share-project\prod.db .\.local\dev.db
```

说明：

- `.local\dev.db` 是当前开发默认数据库
- `E:\data\share-project\prod.db` 是线上真实数据库
- 复制方向永远是 “prod snapshot -> local dev db”，不要反过来

## One-Time Cleanup Plan

为了让这个 workflow 真正稳定下来，建议尽快做这几个整理动作：

1. 服务器把生产 `DATABASE_URL` 切到仓库外的 sqlite 文件
2. 停止把服务器真实数据库与 `prisma/dev.db` 绑定
3. 后续结构变更统一走 migration
4. 把本地开发数据库默认位置改成 `.local/dev.db`
5. 把 `prisma/dev.db` 从 git 跟踪中移除

目标状态如下：

```text
before:
  git repo ~= code + local db + implied prod db

after:
  git repo  = code + schema + migrations
  server db = real production data
  local db  = disposable development snapshot
```

一次性清理命令：

```bash
git rm --cached prisma/dev.db
```

这条命令只会把 `prisma/dev.db` 从 git 跟踪里移除，不会删除你本地文件。

## Final Rule

以后遇到数据库相关问题，先问自己一句：

```text
这次我要同步的是“数据文件”，还是“结构升级步骤”？
```

如果答案是：

- “真实业务数据” -> 用数据库备份 / 快照
- “代码对应的新结构” -> 用 migration + deploy

这条分界一清楚，后面的流程就不会乱。
