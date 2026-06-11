# 训练小票结构化记录设计

## 背景

当前“今日训练小票”已经作为原型 UI 接入今日健身打卡入口，但用户选择的训练类型、有氧项目、力量部位和训练时长仍停留在前端本地状态。确认打卡时仍只创建原有 `PunchRecord`，训练内容不会提交、落库或进入后续统计。

下一阶段需要把训练小票实装为可统计数据，支持后续按月统计“胸练了 10 次、腹练了 5 次、跑步机 8 次”等维度。

## 目标

- 保持 `PunchRecord` 作为每日健身打卡与奖励体系的唯一事实来源。
- 新增结构化训练记录，让每次有效健身打卡都拥有一张训练小票。
- 支持一次训练包含多个统计明细，例如跑步机、胸、肩、腹。
- 总训练时长只记录在整次训练上，不要求用户为每个力量部位填写时长。
- 为历史有效打卡回填默认训练记录，保证统计查询不漏掉旧数据。

## 非目标

- 不支持一天多次训练小票。
- 不记录动作、组数、重量、配速或距离。
- 不要求填写每个力量部位的单独时长。
- 不在本轮完成完整统计大屏或周报改版，但数据模型必须支持后续统计。

## 数据模型

### PunchRecord

`PunchRecord` 继续表示“某用户某天是否完成健身打卡”，维持现有 `@@unique([userId, dayKey])` 约束和奖励、连签、赛季、boost、健身券逻辑。

本轮不把训练明细字段直接塞进 `PunchRecord`，避免后续统计依赖 JSON 或宽表字段。

`PunchRecord` 需要增加可选反向关系 `workoutRecord`，删除今日打卡时必须同步删除关联训练记录。实现上可以使用 Prisma 关系 `onDelete: Cascade`，也可以在撤销事务里先删除 `WorkoutEntry` 和 `WorkoutRecord`，再删除 `PunchRecord`；推荐显式删除，便于测试撤销行为。

### WorkoutRecord

新增 `WorkoutRecord`，表示一次训练小票，和 `PunchRecord` 一对一。

建议字段：

```prisma
model WorkoutRecord {
  id              String         @id @default(cuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id])
  teamId          String
  team            Team           @relation(fields: [teamId], references: [id])
  punchRecordId   String         @unique
  punchRecord     PunchRecord    @relation(fields: [punchRecordId], references: [id], onDelete: Cascade)
  dayKey          String
  trainingType    String
  durationMinutes Int?
  entries         WorkoutEntry[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([userId, dayKey])
  @@index([teamId, dayKey])
}
```

`durationMinutes` 对新记录来自小票选择，范围为 10 到 180，步进 10。历史回填记录填 `null`，表示未知，避免制造伪时长数据。

### WorkoutEntry

新增 `WorkoutEntry`，表示小票里的一个统计维度。

建议字段：

```prisma
model WorkoutEntry {
  id              String        @id @default(cuid())
  workoutRecordId String
  workoutRecord   WorkoutRecord @relation(fields: [workoutRecordId], references: [id])
  category        String
  code            String
  label           String
  createdAt       DateTime      @default(now())

  @@unique([workoutRecordId, category, code])
  @@index([category, code])
}
```

示例：

- 跑步机：`category = "cardio"`, `code = "treadmill"`, `label = "跑步机"`
- 胸：`category = "strength"`, `code = "chest"`, `label = "胸"`
- 腹：`category = "strength"`, `code = "abs"`, `label = "腹"`

## 小票提交规则

前端 `FitnessPunchTicket` 在确认时传出结构化 payload：

```ts
type WorkoutTicketPayload = {
  trainingType: "cardio" | "strength" | "both";
  cardioItem: "treadmill" | "elliptical" | "swim" | null;
  strengthParts: Array<"chest" | "back" | "shoulder" | "glutes" | "legs" | "abs">;
  durationMinutes: number;
};
```

校验规则：

- `cardio`：必须有 `cardioItem`，`strengthParts` 可以为空。
- `strength`：必须至少有一个 `strengthParts`，`cardioItem` 可以为空。
- `both`：必须有 `cardioItem`，且至少有一个 `strengthParts`。
- `durationMinutes` 必须为 10 到 180 之间的整数，并且是 10 的倍数。

服务端必须重复执行同样校验，不能只信任前端状态。

## 写入流程

今日打卡确认后，`POST /api/board/punch` 接收训练 payload。服务端在现有打卡事务里完成：

1. 创建 `PunchRecord`。
2. 结算银子、连签、赛季、boost、健身券和经验。
3. 创建一条 `WorkoutRecord`。
4. 按 payload 创建多条 `WorkoutEntry`。
5. 创建活动流事件。

这些写入必须在同一个事务中完成，避免出现“打卡成功但训练记录缺失”的半成功状态。

重复打卡仍沿用现有唯一约束，返回 `duplicate-punch`。

补签昨天和管理员补卡当前没有训练小票 UI，但它们也会创建有效 `PunchRecord`。这两条路径应创建默认训练记录：`trainingType = "cardio"`，entry 为 `cardio/treadmill/跑步机`，`durationMinutes = null`。这样统计口径保持“每条有效打卡都有训练记录”。

撤销今日打卡时，应在同一事务中删除关联 `WorkoutEntry` 和 `WorkoutRecord`。撤销后不再计入训练统计。

## 活动流摘要

打卡成功后的活动流可以展示训练摘要，但活动流不是统计数据来源。

摘要规则：

- `cardio`：`跑步机 · 60 分钟`
- `strength`：`胸 / 肩 / 腹 · 60 分钟`
- `both`：`跑步机 + 胸 / 肩 / 腹 · 60 分钟`

现有奖励和 boost 文案继续保留，例如：

`li 刚刚打卡，跑步机 + 胸 / 肩 / 腹 · 60 分钟，拿下 20 银子`

## 统计口径

后续统计直接基于 `WorkoutEntry` 聚合：

- 胸 10 次 = 指定周期内有 10 个 `strength/chest` entry。
- 腹 5 次 = 指定周期内有 5 个 `strength/abs` entry。
- 跑步机 8 次 = 指定周期内有 8 个 `cardio/treadmill` entry。

由于一张小票内同一个 `category + code` 唯一，单日重复选择同一部位不会重复计数。

训练总时长基于 `WorkoutRecord.durationMinutes` 聚合，只统计非空值。力量部位不分摊整次训练时长。

## 历史数据回填

为所有现有有效 `PunchRecord` 创建默认训练记录：

- `WorkoutRecord.trainingType = "cardio"`
- `WorkoutRecord.durationMinutes = null`
- 创建一个 `WorkoutEntry`：`cardio/treadmill/跑步机`
- 不创建力量 entry

回填必须幂等：如果某条 `PunchRecord` 已经有关联 `WorkoutRecord`，跳过。

## 前端调整

- `FitnessPunchTicket` 继续作为小票 UI 组件，但确认时必须传出 payload。
- `PunchPopup` 的 `fitness-ticket` 变体接收并转发 payload。
- `HeatmapGrid` 的今日 `+` 提交流程调用 `submitTodayPunch(payload)`。
- 原型路由保留，用于视觉检查和组件回归。
- 肌肉图高亮可继续使用当前静态图；动态高亮不是本轮必要项。

## 测试策略

- 组件测试：确认小票点击确认时传出正确 payload。
- API 测试：有效 payload 会创建 `PunchRecord`、`WorkoutRecord` 和多条 `WorkoutEntry`。
- API 测试：无效 payload 返回 400，不创建打卡记录。
- API 测试：重复打卡仍返回 409，不额外创建训练记录。
- API 测试：撤销今日打卡会删除关联训练记录。
- API 测试：补签昨天和管理员补卡会创建默认 `cardio/treadmill` 训练记录。
- 回填测试：历史 `PunchRecord` 会获得默认 `cardio/treadmill` 训练记录，重复运行不重复创建。
- 现有打卡、撤销、补签、管理员补卡测试继续通过。

## 验收标准

- 用户点击今日 `+` 后填写小票并确认，刷新后数据库中保留结构化训练数据。
- 一次训练选择多个力量部位时，会创建多个 `WorkoutEntry`。
- 历史打卡可统一回填为跑步机有氧记录，历史时长为空。
- 后续可以用 SQL/Prisma 直接按 `WorkoutEntry.category + code` 统计训练次数。
- 没有引入一天多练、动作详情或部位单独时长的交互复杂度。
