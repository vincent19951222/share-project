# 牛马补给站 AI 生图：IPStudio 迁移方案

> 状态：迁移设计稿。
> 更新时间：2026-07-06

## 关系与边界

本文是 `docs/superpowers/specs/2026-06-26-supply-station-ai-incentive-design.md` 的技术迁移补充。

- 0626 文档回答「牛马补给站 AI 生图 MVP 做什么」。
- 本文回答「如何复用 `/Users/vincent/Projects/IPStudio` 当前工作区，把生图能力迁移到 share-project」。

本文不改变 0626 文档的产品范围。猜盐 / 海龟汤、图片公开广场、主题直购、后台审核队列、IPStudio 整站迁移都不进入本迁移范围。

## 迁移源

迁移源为本地目录：

```text
/Users/vincent/Projects/IPStudio
```

迁移源以当前 dirty 工作区为准，而不是只以最近提交为准。

当前源状态记录：

- 当前 HEAD：`be4578a`
- 当前工作区包含未提交改动，主要集中在：
  - `screens/UnifiedCreation.tsx`
  - `services/generationTaskService.ts`
  - `lib/server/generationTaskApi.ts`
  - `lib/server/playgroundTaskRepository.ts`
  - `lib/server/generationRepository.ts`
  - `lib/server/themeConfigRepository.ts`
  - `types.ts`
  - 相关测试文件
  - 新增 retry routes
  - 新增 `lib/server/sqlite.ts`

实施前必须先冻结迁移源快照：

1. 记录 `git -C /Users/vincent/Projects/IPStudio rev-parse HEAD`。
2. 记录 `git -C /Users/vincent/Projects/IPStudio status --short`。
3. 导出当前 dirty diff，保存为实施计划中的源证据。
4. 后续迁移只按该快照执行；若 IPStudio 再变化，需要重新确认是否纳入迁移。

## 迁移目标

把 IPStudio 已验证的生图能力接入牛马补给站 AI 生图 MVP：

- 用户在补给站选择已解锁主题。
- 用户可上传参考图，最多 3 张；不上传参考图时也可以只用主题和补充描述生成。
- 用户可输入一段补充描述。
- 前端不暴露黑盒主题 prompt。
- 后端组合主题 prompt + 用户补充描述 + 参考图。
- 后端调用生图 provider。
- 生成结果上传到 COS。
- 生成任务和作品记录进入 share-project 数据库。
- 生成成功后作品进入背包作品集。
- 生图消耗金币。

## 明确复用范围

### 1. 生图 provider 调用

复用 IPStudio 的 provider 封装思路：

- 支持 `gpt-image-2`。
- 支持纯文本生成。
- 支持带参考图的 image edit。
- 支持最多 3 张参考图。
- 使用 `BOLUOPETS_API_KEY` 或同等服务端环境变量。
- 默认 endpoints：
  - `https://api.boluopets.com/v1/images/generations`
  - `https://api.boluopets.com/v1/images/edits`

迁移到 share-project 后，代码应放在 share-project 自己的服务层，例如：

```text
lib/gamification/ai-image/provider.ts
```

不直接 import IPStudio 文件，不在运行时依赖 `/Users/vincent/Projects/IPStudio`。

### 2. COS 上传

复用 IPStudio 的后端上传 COS 思路：

- provider 返回 `b64_json` 或 URL。
- share-project 后端负责将生成图片上传到 COS。
- 应保留稳定 public URL。
- COS key 采用 share-project 自己的命名空间，建议：

```text
share-project/ai-images/{userId}/{yyyy}/{mm}/{dd}/{generationId}/original.{ext}
```

需要的环境变量沿用或兼容 IPStudio：

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_PUBLIC_BASE_URL`

如果使用 `<img>` 直接展示 COS URL，可以不依赖 Next Image remote pattern；如果使用 `next/image`，需要更新 `next.config.ts`。

### 3. 异步任务与轮询

复用 IPStudio 的任务化思路：

- 创建生成任务。
- 任务进入 `queued` / `running` / `completed` / `failed` 状态。
- 前端轮询任务详情。
- 成功结果以 item 形式展示。
- 支持失败信息展示。
- 本次不迁移 IPStudio 的 retry 能力；失败后用户重新提交。

share-project 不使用 IPStudio 的自管 SQLite repository。任务和 item 必须翻译成 Prisma model。

### 4. UI 交互骨架

复用 `screens/UnifiedCreation.tsx` 的交互模式，而不是照搬整页视觉：

- 上传参考图。
- 删除参考图。
- 可选用户补充描述。
- 提交生成任务。
- 提交成功后清空临时输入。
- 轮询任务状态。
- 展示生成中、失败、完成。
- 图片预览。
- 最近任务 / 作品入口。

迁移后 UI 应换成牛马补给站语境，不保留 IPStudio 的「实验生成 / 拍摄生成 / Playground」产品表述。

## 明确不迁范围

以下内容不进入本次迁移：

- IPStudio 整站路由。
- IPStudio 首页、Gallery、CreatorSpace、IpDetail。
- IPStudio 登录体系。
- IPStudio `themes-admin` 管理后台。
- IPStudio admin theme publish / restore 流程。
- IPStudio Playground 调试页。
- IPStudio `node:sqlite` / `DatabaseSync` 原仓库实现。
- IPStudio 手势光标、CameraBooth、拍摄生成模式。
- IPStudio 1 / 2 / 4 多图并发选择。
- IPStudio 失败任务 retry UI 和 retry API。
- IPStudio admin images 页面。
- IPStudio 默认 13 个通用主题整体搬运。

## share-project 数据模型

需要在 Prisma 中新增 AI 生图专用模型。建议拆成四类：

### 1. 主题定义

主题定义可以先用代码常量，不必入库：

```text
lib/gamification/ai-image/themes.ts
```

每个主题至少包含：

- `id`
- `name`
- `description`
- `previewImageUrl`
- `promptTemplate`
- `defaultUnlocked`
- `enabled`
- `sortOrder`

黑盒 prompt 只在服务端使用，不进入前端 snapshot。

### 2. 用户主题解锁

新增 `AiImageThemeUnlock`：

- `id`
- `userId`
- `teamId`
- `themeId`
- `source`：`default` / `draw`
- `createdAt`

约束：

- `@@unique([userId, themeId])`
- 默认主题不一定需要写入 unlock 表，但前端 snapshot 必须视为已解锁。

### 3. 生成任务

新增 `AiImageGenerationTask`：

- `id`
- `userId`
- `teamId`
- `themeId`
- `userPrompt`
- `status`：`queued` / `running` / `completed` / `failed`
- `coinCost`
- `coinRefunded`
- `providerModel`
- `errorMessage`
- `createdAt`
- `updatedAt`

MVP 每个任务只生成 1 张图。后续如果要多图，再加 item 层。

### 4. 作品记录

新增 `AiImageArtwork`：

- `id`
- `taskId`
- `userId`
- `teamId`
- `themeId`
- `imageUrl`
- `cosKey`
- `promptSnapshotJson`
- `createdAt`

作品集直接读 `AiImageArtwork`。

### 5. 参考图存储

MVP 不长期保存用户上传的参考图原图。

创建任务时可以将参考图 data URL 暂存在任务执行内存中，用于启动当前 in-process runner。考虑隐私和数据库体积，MVP 默认不支持自动 retry，失败后用户重新提交。

## 金币与计费规则

金币扣费必须接入 share-project 的 `User.coins`。

建议规则：

- 创建任务前检查用户是否已解锁主题。
- 创建任务前检查金币是否足够。
- 创建任务时扣除金币，并写入任务记录。
- 任务成功后不再二次扣费。
- 任务失败时自动退回金币，并标记 `coinRefunded = true`。
- 如果服务端进程中断导致任务长时间停留 `running`，任务详情接口应能将超时任务标记失败并退币。

金币价格本迁移 spec 不硬编码，实施计划中再落具体数值。服务层应集中定义价格，例如：

```text
AI_IMAGE_GENERATION_COIN_COST
AI_IMAGE_THEME_DRAW_COIN_COST
```

## 主题扭蛋接入

主题扭蛋不复用 IPStudio 的主题管理后台。

MVP 扭蛋逻辑：

- 用户消耗金币抽主题。
- 奖池只包含该用户未解锁且 enabled 的主题。
- 抽中后写入 `AiImageThemeUnlock`。
- 如果全部主题已解锁，接口返回「主题已集齐」，不扣金币。
- 不返金币。
- 不出旧道具。
- 不出旧实体兑换奖励。

## SupplyStation snapshot 改造

当前 `SupplyStationProductionSnapshot` 仍围绕旧任务、抽奖券、道具、商店和兑换组织。AI 生图 MVP 需要新的 snapshot 区域，不能把 AI 生图硬塞进旧 `dashboard.dailyQuests` 或旧 `backpack.groups`。

建议新增：

```text
supplyAiImage: {
  wallet: {
    coins: number;
  };
  themes: {
    unlocked: AiImageThemeSnapshot[];
    locked: AiImageThemeSnapshot[];
    allUnlocked: boolean;
  };
  recentTasks: AiImageGenerationTaskSummary[];
  recentArtworks: AiImageArtworkSnapshot[];
}
```

旧区域处理：

- `resources.ticket` 不再前台展示。
- `dashboard.dailyQuests` 不再作为补给站首页主体。
- `shop` 不再展示。
- 旧 `backpack` 不作为主背包，只在「旧补给存档」入口使用。
- `/api/gamification/supply/state` 不应再主动 `ensureTodayTaskAssignments()`。

## API 设计

新增 API 建议：

```text
GET  /api/gamification/supply/state
POST /api/gamification/ai-image/tasks
GET  /api/gamification/ai-image/tasks/[taskId]
POST /api/gamification/ai-image/themes/draw
```

其中 `GET /api/gamification/supply/state` 继续作为补给站总 snapshot 入口，但返回内容要包含 AI 生图 snapshot。

`POST /api/gamification/ai-image/tasks`：

- 校验登录。
- 校验主题存在且已解锁。
- 校验金币。
- 校验参考图数量不超过 3，允许 0 张。
- 创建任务并扣金币。
- 启动后端生成。
- 返回 `{ taskId }`。

`GET /api/gamification/ai-image/tasks/[taskId]`：

- 校验登录。
- 只能读取自己的任务。
- 返回任务状态和作品 URL。
- 对超时 running 任务执行失败结算和退币。

`POST /api/gamification/ai-image/themes/draw`：

- 校验登录。
- 校验金币。
- 从未解锁主题中抽一个。
- 写入 unlock。
- 返回新主题和刷新后的 AI 生图 snapshot。

## UI 设计

新增或改造组件建议：

```text
components/gamification/production/SupplyAiImageStudioPanel.tsx
components/gamification/production/SupplyThemeGachaPanel.tsx
components/gamification/production/SupplyArtworkBackpackPanel.tsx
components/gamification/production/SupplyLegacyArchivePanel.tsx
```

MVP 首页优先展示 `SupplyAiImageStudioPanel`：

- 金币余额。
- 已解锁主题选择。
- 主题预览。
- 参考图上传，最多 3 张。
- 每张参考图可删除。
- 用户补充描述输入。
- 生成按钮显示金币消耗。
- 生成中状态。
- 失败提示。
- 完成结果预览。
- 最近作品。

保留补给站品牌语言，但不要照搬 IPStudio 的「指意」「实验生成」「拍摄生成」「Playground」标签。

## 旧系统下线配合

本迁移需要配合 0626 文档中的旧系统收束：

- 旧四维任务入口下线。
- 旧任务完成 / 换任务 / 领券入口下线。
- 旧抽奖券前台隐藏。
- 旧抽奖机改为主题扭蛋。
- 旧商店隐藏。
- 旧实体兑换入口隐藏。
- 旧道具仅进入旧补给存档。

数据库表先保留，不在本迁移中物理删除。

## 错误处理

必须覆盖以下错误：

- 未登录。
- 主题不存在。
- 主题未解锁。
- 金币不足。
- 参考图数量超过 3。
- 参考图格式不是 data URL。
- provider 缺少 API key。
- provider 返回失败。
- COS 上传失败。
- 任务不存在或不是当前用户的任务。
- 任务超时。

用户可见错误要使用中文，不暴露黑盒 prompt 和服务端密钥信息。

## 测试策略

### 服务层测试

- prompt 组合只发生在服务端。
- 未解锁主题不能生成。
- 金币不足不能创建任务。
- 创建任务扣金币。
- provider 失败后退金币。
- COS 上传失败后任务失败并退金币。
- 主题扭蛋只抽未解锁主题。
- 主题全解锁时不扣金币。

### API 测试

- 未登录返回 401。
- 创建任务返回 taskId。
- 查询任务只能查询自己的任务。
- 超时 running 任务会失败结算。
- 主题抽取返回新解锁主题。

### UI 测试

- 已解锁主题可选择。
- 未解锁主题不可生成。
- 可上传并删除参考图。
- 最多 3 张参考图。
- 提交成功后清空临时输入。
- 生成中 / 失败 / 完成状态可见。
- 完成图片进入作品集。
- 前台不出现抽奖券、生活券、旧四维任务、商店主入口。

### 验证命令

实施完成后至少运行：

```bash
npm run lint
npm test
npm run build
```

若涉及真实 COS / provider，需要额外做一次手动 smoke：

1. 登录测试用户。
2. 打开牛马补给站。
3. 使用默认主题上传一张参考图。
4. 生成图片。
5. 确认扣金币。
6. 确认图片展示并进入作品集。
7. 确认刷新后作品仍存在。

## 实施切片建议

后续 implementation plan 应按以下顺序拆：

1. 冻结 IPStudio 迁移源快照。
2. 新增 Prisma 模型和类型。
3. 迁移 provider + COS 服务层。
4. 实现 AI 生图任务 API 和 runner。
5. 实现主题定义、默认解锁和主题扭蛋。
6. 改造 supply snapshot，停止旧任务自动生成。
7. 接入 AI 生图 UI。
8. 接入作品集和旧补给存档。
9. 清理前台旧券、旧任务、商店、兑换入口。
10. 完整验证和浏览器 smoke。

## 成功标准

- 迁移后 share-project 不依赖 IPStudio 运行时目录。
- 生图 provider、COS 上传、任务轮询能力可在 share-project 内独立运行。
- 用户只看到金币，不看到抽奖券体系。
- 默认主题可直接生成图片。
- 主题扭蛋可解锁新主题。
- 作品进入背包作品集。
- 黑盒 prompt 不暴露到客户端。
- 猜盐 / 海龟汤没有入口。
- 旧四维任务不会因为打开补给站而继续生成。
