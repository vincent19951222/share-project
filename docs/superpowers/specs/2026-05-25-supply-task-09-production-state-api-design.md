# Supply Task 09：生产补给站 State API 设计

> 第三阶段任务级 spec。本文对应 `docs/superpowers/plans/2026-05-25-supply-production-integration.md` 中的 Task 9：Production Supply State API。

## 背景

Task 8 已经新增 `SupplyStationProductionSnapshot` 和 `buildSupplyStationViewModelForUser()`，把真实游戏化状态、用户资料、资源栏、商店 catalog 和任务记录占位结构聚合成生产补给站可消费的 view-model。

Task 9 负责把这个 view-model 暴露为生产 API，并在 `lib/api.ts` 增加客户端 helper。后续 production shell 和各 mutation 成功后的刷新都应读取这个专用 supply snapshot，而不是继续让新 UI 直接消费旧的 `GamificationStateSnapshot`。

## 目标

- 新增 `GET /api/gamification/supply/state`。
- API 使用 httpOnly `userId` cookie 鉴权。
- API 在构建 snapshot 前调用 `ensureTodayTaskAssignments({ userId })`，确保生产补给站打开时四维任务已生成。
- API 调用 `buildSupplyStationViewModelForUser(userId)` 返回 `{ snapshot }`。
- 未登录返回 `401 { error: "未登录" }`。
- cookie 指向不存在用户时返回 `401 { error: "用户不存在" }`。
- 未预期异常返回 `500 { error: "服务器错误" }`。
- 在 `lib/api.ts` 新增 `fetchSupplyStationState()`，返回 `SupplyStationProductionSnapshot`。

## 范围

本任务修改：

- `app/api/gamification/supply/state/route.ts`
- `lib/api.ts`
- `__tests__/gamification-supply-state-api.test.ts`
- 本 spec 文件
- 对应 implementation plan 文件

本任务不修改：

- `lib/gamification/supply-view-model.ts`
- `lib/gamification/tasks.ts`
- `app/api/gamification/shop/purchase/route.ts`
- `components/gamification/SupplyStation.tsx`
- `components/gamification/production/*`

## API 设计

### Route

`GET /api/gamification/supply/state`

请求：

- 不需要 query 参数。
- 从 `userId` cookie 读取登录用户。

成功响应：

```ts
{
  snapshot: SupplyStationProductionSnapshot;
}
```

执行顺序：

1. 解析 `userId` cookie。
2. 未登录直接返回 401。
3. 调用 `ensureTodayTaskAssignments({ userId })`。
4. 调用 `buildSupplyStationViewModelForUser(userId)`。
5. 如果 snapshot 为 `null`，返回 401。
6. 返回 `{ snapshot }`。

说明：

- 第 3 步的返回值不直接返回给客户端；它只负责生成当天任务。
- 第 4 步重新构建 production supply snapshot，确保响应结构和 Task 8 view-model 一致。

### 错误响应

| 场景 | status | body |
| --- | ---: | --- |
| 未登录 | 401 | `{ "error": "未登录" }` |
| cookie 用户不存在 | 401 | `{ "error": "用户不存在" }` |
| `GamificationTaskError` | `error.status` | `{ "error": error.message }` |
| 未预期异常 | 500 | `{ "error": "服务器错误" }` |

## Client Helper 设计

在 `lib/api.ts` 新增：

```ts
export async function fetchSupplyStationState(): Promise<SupplyStationProductionSnapshot>
```

行为：

- `GET /api/gamification/supply/state`
- `cache: "no-store"`
- `credentials: "same-origin"`
- 使用现有 `readApiResult()` 解析 `{ snapshot }`
- 成功时只返回 `payload.snapshot`
- 失败时抛 `ApiError`

## 测试策略

新增 `__tests__/gamification-supply-state-api.test.ts`：

- 每个测试前运行 `seedDatabase()`，读取用户 `li`。
- 未登录：
  - 不带 cookie。
  - 断言返回 401 和 `{ error: "未登录" }`。
- 正常读取：
  - 带有效 cookie。
  - 断言返回 200。
  - 断言 `snapshot.currentUserId`、`dayKey`、`resources.coins.label`。
  - 断言 `snapshot.dashboard.dailyQuests` 有 4 项。
  - 查询数据库确认当天 `DailyTaskAssignment` 有 4 条。
- 不存在用户：
  - cookie 写入 `missing-user`。
  - 断言返回 401 和 `{ error: "用户不存在" }`。

## 验收标准

- `GET /api/gamification/supply/state` 能返回 Task 8 定义的生产 supply snapshot。
- 首次打开补给站时会确保当天四维任务存在。
- 401/500 错误文案可直接展示给 UI。
- `fetchSupplyStationState()` 与现有 `lib/api.ts` helper 风格一致。
- `npm test -- __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts` 通过。
- `npm run lint` 通过。

## 后续衔接

Task 10 之后的 production panels 和 Task 16 的 production shell 应统一读取 `fetchSupplyStationState()`。购买、抽奖、道具使用等 mutation 可以先返回旧 snapshot，最终由 shell 调用 supply state API 做统一刷新。
