# 牛马水铺生产升级 Design Spec

> 将现有 `续命咖啡` 生产功能升级为 `牛马水铺`。本 spec 覆盖数据模型、API、状态层、生产 UI、月历、战报、周报、活动流和上线迁移策略。目标 UI 以 `app/ui-prototypes/drink-update` 为准。

## 背景

当前 `/drink` 是 `续命咖啡` 页面，核心数据来自 `CoffeeRecord`。这张表只表达“一杯咖啡事件”，没有饮品类型、备注、最近一杯详情或饮品流水。新的 `ui-prototypes/drink-update` 原型已经验证了 `牛马水铺` 的交互方向：

- 记录五类饮品：水、奶茶、美式、拿铁、其他。
- 记录时先弹出确认单，包含时间、饮品、杯数和可编辑备注。
- 今日主面板展示总杯数、最近一杯、饮品排行、目标进度和今日流水。
- 团队月历仍是低优先级，但要保留团队饮品打卡能力。

升级不是简单换 UI。咖啡数据被月历、战报中心、周报、活动事件、企业微信摘要和测试引用，所以生产落地应把 coffee 域泛化为 drink 域，再把历史咖啡记录迁移为饮品记录。

## 目标

- `/drink` 继续作为生产入口，但页面标题和导航改为 `牛马水铺`。
- 旧咖啡记录迁移为饮品记录，默认饮品类型为 `americano`，不丢失历史杯数。
- 新增饮品记录支持 `drinkType` 和 `note`。
- 新 API 支持记录、撤销、读取饮品状态。
- 生产 UI 使用 `ui-prototypes/drink-update` 的布局语言，但接真实数据和真实 mutation。
- 月历、战报、周报、活动流统一从 drink 记录读取统计。
- 保留短期 coffee 兼容 API，避免一次性破坏已有测试和外部调用。

## 非目标

- 不引入积分、抽奖券、惩罚或饮品奖励。
- 不做 admin 饮品管理后台。
- 不支持自定义无限饮品种类；第一版固定五类。
- 不重做生产团队月历视觉，先保留现有可用结构并替换数据口径。
- 不删除 `CoffeeRecord` 表作为第一版上线动作；删除和重命名清理放到验证后的后续版本。

## 饮品模型

### 饮品类型

第一版固定枚举：

```ts
export const DRINK_TYPES = ["water", "milkTea", "americano", "latte", "other"] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];
```

展示文案：

- `water`: 水
- `milkTea`: 奶茶
- `americano`: 美式
- `latte`: 拿铁
- `other`: 其他

历史咖啡迁移默认：

- 原 `CoffeeRecord` -> `DrinkRecord.drinkType = "americano"`
- `note = "历史咖啡记录"`

## 数据库设计

新增 `DrinkRecord`，保留 `CoffeeRecord`：

```prisma
model Team {
  drinkRecords DrinkRecord[]
}

model User {
  drinkRecords DrinkRecord[]
}

model DrinkRecord {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  teamId    String
  team      Team      @relation(fields: [teamId], references: [id])
  dayKey    String
  drinkType String
  note      String?
  createdAt DateTime  @default(now())
  deletedAt DateTime?

  @@index([teamId, dayKey, createdAt])
  @@index([userId, dayKey, createdAt])
  @@index([teamId, drinkType, dayKey])
}
```

迁移策略：

1. `npx prisma db push` 创建 `DrinkRecord`。
2. 运行一次性回填脚本，把所有未删除和已删除的 `CoffeeRecord` 都复制到 `DrinkRecord`。
3. 回填脚本使用确定性迁移标记，避免重复插入。
4. 回填后比较 `CoffeeRecord` 与 `DrinkRecord` 的数量、用户分布、日期分布。
5. 第一版代码读 `DrinkRecord`，保留 `CoffeeRecord` 表不再写入。

为避免重复回填，脚本应按 `CoffeeRecord.id` 生成稳定 id，例如 `drink_${coffeeRecord.id}`。

## API Contract

### `GET /api/drinks/state`

返回当前用户所在团队当月和今日饮品状态。

```ts
interface DrinkSnapshot {
  members: DrinkMemberSnapshot[];
  gridData: DrinkDayCell[][];
  today: number;
  totalDays: number;
  currentUserId: string;
  todayEvents: DrinkEventSnapshot[];
  stats: {
    todayTotalCups: number;
    todayDrinkers: number;
    currentUserTodayCups: number;
    drinkKing: DrinkKingSnapshot | null;
    favoriteDrink: DrinkCountSnapshot | null;
    latestDrink: DrinkEventSnapshot | null;
    drinkCounts: Record<DrinkType, number>;
  };
}
```

`gridData` 第一版仍按每日总杯数聚合，避免重做团队月历。详细饮品类型通过 `todayEvents` 和 `drinkCounts` 提供。

### `POST /api/drinks/records`

请求：

```ts
{
  drinkType: "water" | "milkTea" | "americano" | "latte" | "other";
  note?: string;
}
```

行为：

- 校验登录。
- 校验 `drinkType` 是固定枚举。
- `note` trim 后最多 80 个字符；空字符串存为 `null`。
- 写入 `DrinkRecord`。
- 写入 `ActivityEvent`，类型为 `DRINK_ADD`。
- 返回最新 `DrinkSnapshot`。

### `DELETE /api/drinks/records/latest`

请求：

```ts
{
  drinkType?: DrinkType;
}
```

行为：

- 如果传 `drinkType`，撤销当前用户今日该饮品最新一条。
- 如果不传，撤销当前用户今日最新一条任意饮品。
- 软删除：写 `deletedAt`。
- 写入 `ActivityEvent`，类型为 `DRINK_REMOVE`。
- 返回最新 `DrinkSnapshot`。

### Coffee 兼容 API

短期保留：

- `GET /api/coffee/state`
- `POST /api/coffee/cups`
- `DELETE /api/coffee/cups/latest`

兼容语义：

- GET 返回从 drink snapshot 映射出的 coffee-shaped snapshot。
- POST 写入 `drinkType = "americano"`。
- DELETE 删除当前用户今日最新 `americano`。
- 兼容 API 写入 `COFFEE_ADD/COFFEE_REMOVE` 活动事件；新 drink API 写入 `DRINK_ADD/DRINK_REMOVE`。

兼容 API 只服务旧调用和迁移期测试，不作为新 UI 的依赖。

## 前端状态层

新增 `lib/drink-store.tsx`，替代生产 `/drink` 页面里的 `CoffeeProvider`。

对外能力：

- `snapshot`
- `busy`
- `error`
- `openConfirm(drinkType)`
- `confirmDrink({ drinkType, note })`
- `removeLatestDrink(drinkType?)`
- `refresh()`

成功 mutation 后继续触发：

- `calendar:refresh`
- `activity-events:refresh`

轮询策略复用 coffee store 的既有边界：

- 只在 `/drink` 和 `/report` 同步。
- 保持 5 秒轮询。
- 后续性能优化沿用现有 `document.hidden` 和 route gate 的经验。

## 生产 UI

新建生产组件目录：

```text
components/drink-checkin/
  DrinkCheckin.tsx
  DrinkReceipt.tsx
  DrinkActivityFeed.tsx
  DrinkTeamGrid.tsx
  drink-entry.ts
  drink-catalog.ts
```

UI 来源：

- 从 `app/ui-prototypes/drink-update/page.tsx` 和 `DrinkUpdatePrototype.module.css` 提取结构与视觉语言。
- 生产组件不能依赖 prototype route。
- 饮品图片优先复用 `public/assets/ui-prototypes/drink-update/generated/*.png`，若后续压缩或迁移到 COS，可单独做资源任务。

行为要求：

- 点击饮品 `+` 打开确认弹窗。
- 弹窗显示当前时间、饮品、`1 杯`、备注输入和备注候选。
- 确认后调用真实 API。
- 右侧状态贴纸板读取真实 `DrinkSnapshot.stats`。
- 今日流水读取真实 `todayEvents`。
- 团队月历读取 `gridData`。
- 通用 `+ 记录一杯` 默认选择水，并允许在弹窗切换饮品。

## 下游统计

### 月历

`CalendarMonthSnapshot` 第一版把 `coffeeCups` 改为 `drinkCups`，或保留兼容字段同时新增 `drinkCups`。推荐兼容期同时返回两者：

- `drinkCups`: 新 UI 使用。
- `coffeeCups`: 老测试和旧组件兼容，值等于当日饮品总杯数。

### 战报中心

`CoffeeReportPanel` 第一版改造成 `DrinkReportPanel`，展示：

- 今日饮品总杯数
- 今日饮品人数
- 本月饮品总杯数
- 本周饮品王
- 最近几日饮品趋势

报告字段从 `coffee` 迁到 `drink`。兼容期可让 `coffee` 仍存在，但取同一份 drink 聚合。

### 周报

`weekly-report-service` 从 `coffeeRecord` 读取改为 `drinkRecord`。文案从“咖啡”改为“饮品”或“水铺”。

### 活动事件

新增事件类型：

- `DRINK_ADD`
- `DRINK_REMOVE`

`kind=drink` 返回 `DRINK_ADD/DRINK_REMOVE` 事件。兼容期 `kind=coffee` 继续返回 `COFFEE_ADD/COFFEE_REMOVE` 事件；旧 `/api/coffee/*` 可以写入 `DrinkRecord(drinkType = "americano")`，但活动事件仍使用 coffee 类型，避免旧动态流和旧测试一次性断裂。新 UI 只依赖 `kind=drink`。

## 测试要求

必须覆盖：

- `DrinkRecord` schema 字段和回填脚本。
- 旧 `CoffeeRecord` 能迁移到 `DrinkRecord`。
- `POST /api/drinks/records` 写入指定 drink type 和 note。
- `DELETE /api/drinks/records/latest` 支持指定 drink type 和不指定 drink type。
- `GET /api/drinks/state` 返回今日流水、饮品 count、最近一杯、最常喝。
- `/api/coffee/*` 兼容行为。
- `DrinkCheckin` 弹窗确认流程。
- 月历按 drink record 聚合。
- 战报和周报按 drink record 聚合。
- activity events 支持 `kind=drink`。

## 上线与回滚

生产发布按当前项目口径：

1. 停止 PM2。
2. 备份生产 SQLite 数据库。
3. 更新代码。
4. `npm install`。
5. `npx prisma generate`。
6. `npx prisma db push`。
7. 在生产库上运行回填脚本。
8. 运行回填校验脚本。
9. `npm run build`。
10. PM2 带 live `DATABASE_URL` 重启。
11. HTTP smoke test 和浏览器 smoke test。

回滚：

- 如果代码回滚但 `DrinkRecord` 表仍在，不影响旧 `CoffeeRecord`。
- 第一版不删除 `CoffeeRecord`，所以可以回到旧 coffee 代码。
- 如果回填脚本失败，恢复 DB 备份，不继续启动新代码。

## 验收标准

- 旧咖啡数据在新水铺里显示为美式记录。
- 用户可以记录水、奶茶、美式、拿铁、其他，并保存备注。
- `/drink` 页面展示 `牛马水铺`，不再展示生产 coffee UI。
- 月历、战报、周报统计不丢失旧杯数。
- 新 activity feed 显示饮品记录。
- `npm test`、`npm run lint`、`npm run build` 通过。
- 浏览器 smoke test 覆盖 `/drink` 加一杯、备注入账、月历刷新、战报刷新。
