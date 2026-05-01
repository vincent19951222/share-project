# GM-16 Card Pool Tuning Design

> 将牛马补给站抽奖奖池调整为“可上线、可解释、可验证”的第一版正式奖池。GM-16 只做奖池内容、权重和校验，不新增未完成道具的使用逻辑。

## 背景

GM-01 到 GM-15 已经完成了补给站主闭环：

```text
四维任务 / 健身打卡 -> 抽奖券
抽奖券 -> 银子 / 背包道具 / 真实福利
背包道具 -> boost / 请假保护 / 弱社交 / 线下兑换
高价值事件 -> 团队动态 / 周报
```

当前抽奖系统可以运行，但奖池还处在早期草案状态：

- 当前启用权重总和不是 `100`。
- 实际层级比例和 `2026-04-25-gamification-card-pools.md` 不完全一致。
- 部分已经定义的道具还没有开放使用入口，不应直接放进正式奖池。
- `grant_title` 已能出现在抽奖结果里，但暂时没有持久化收藏或称号库存，不适合作为正式奖励。

GM-16 的目标是把奖池从“能抽”推进到“可以放心让用户抽”。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-08-today-effective-item-use-design.md`
- `docs/superpowers/specs/2026-04-26-gm-09-boost-settlement-integration-design.md`
- `docs/superpowers/specs/2026-04-26-gm-10-real-world-redemption-design.md`
- `docs/superpowers/specs/2026-04-26-gm-12-weak-social-invitations-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 正式奖池总权重调整为 `100`，权重可以直接理解为百分比。
2. 普通银子层保持 `45%`，直接银子期望值保持 `8.75`。
3. 启用奖励必须可以被当前系统正确结算、展示、使用或兑换。
4. 十连保底规则保持不变：至少出现 `utility / social / rare` 之一，不保证稀有。
5. 不让用户抽到“背包里有、但点了没法用”的奖励。
6. 用自动化测试锁住权重、EV、奖励引用和可用性边界。

## 非目标

- 不实现 `保底升级券` 的单抽保底逻辑。
- 不实现 `九折购券卡` 的购券折扣逻辑。
- 不实现 `补水加班费`、`站立补贴` 等维度银子加成。
- 不实现收藏、称号、日历贴纸或高光贴纸库存。
- 不新增数据库表。
- 不新增独立后台或运营配置页面。
- 不改变抽奖券获取、购买、消耗规则。
- 不改变背包使用状态机。
- 不改变真实福利兑换状态机。
- 不改变 GM-15 周报口径，除非顺手修复已有统计 bug 被单独纳入实现计划。

## 奖池分层

`2026-04-25-gamification-card-pools.md` 原始建议为：

| 层级 | 概率 |
| --- | ---: |
| 普通银子 | 45% |
| 实用道具 | 27% |
| 弱社交道具 | 18% |
| 趣味收藏 | 6% |
| 稀有暴击 | 4% |

GM-16 第一版暂时不启用 `趣味收藏`，原因是当前没有持久化收藏或称号系统。为了不让 6% 权重落到不可用奖励上，先将这部分并入弱社交/轻体验层。

GM-16 active pool：

| 层级 | 权重 | 说明 |
| --- | ---: | --- |
| `coin` | 45 | 银子奖励，不靠它回本 |
| `utility` | 27 | 当前已经有使用入口的个人道具 |
| `social` | 24 | 当前已经有发起和响应链路的弱社交道具 |
| `rare` | 4 | 强 boost 和真实福利 |

`cosmetic` 层级保留类型定义，但 GM-16 active pool 中不启用。

## Active Reward Pool

GM-16 正式启用以下奖励。

### 普通银子

| rewardId | 奖励 | tier | weight |
| --- | --- | --- | ---: |
| `coins_005` | `+5 银子` | `coin` | 15 |
| `coins_010` | `+10 银子` | `coin` | 12 |
| `coins_020` | `+20 银子` | `coin` | 10 |
| `coins_040` | `+40 银子` | `coin` | 5 |
| `coins_080` | `+80 银子` | `coin` | 2 |
| `coins_120` | `+120 银子` | `coin` | 1 |

直接银子 EV：

```text
5 * 15% + 10 * 12% + 20 * 10% + 40 * 5% + 80 * 2% + 120 * 1%
= 8.75
```

`8.75` 明显低于 `40` 银子抽奖券成本，避免银子买券形成套利。

### 实用道具

| rewardId | itemId | 奖励 | tier | weight |
| --- | --- | --- | --- | ---: |
| `reward_task_reroll` | `task_reroll_coupon` | 任务换班券 | `utility` | 10 |
| `reward_small_boost` | `small_boost_coupon` | 小暴击券 | `utility` | 9 |
| `reward_fitness_leave` | `fitness_leave_coupon` | 健身请假券 | `utility` | 8 |

选择标准：

- 三个道具都已经有服务端使用逻辑。
- 三个道具都能在背包展示。
- 三个道具不会直接绕过真实健身打卡产生无限收益。
- 健身请假券只保护连续记录，不发券、不发银子、不推进赛季。

### 弱社交 / 轻体验

| rewardId | itemId | 奖励 | tier | weight |
| --- | --- | --- | --- | ---: |
| `reward_drink_water_ping` | `drink_water_ping` | 点名喝水令 | `social` | 5 |
| `reward_walk_ping` | `walk_ping` | 出门溜达令 | `social` | 5 |
| `reward_team_standup_ping` | `team_standup_ping` | 全员起立令 | `social` | 4 |
| `reward_chat_ping` | `chat_ping` | 今日闲聊令 | `social` | 4 |
| `reward_share_info_ping` | `share_info_ping` | 红盘情报令 | `social` | 4 |
| `reward_team_broadcast` | `team_broadcast_coupon` | 团队小喇叭 | `social` | 2 |

团队级道具权重略低，原因是它们有团队每日频率限制，过多产出容易造成背包堆积。

弱社交道具仍遵守 GM-12 规则：

- 对方可以忽略。
- 不扣分。
- v1 不发银子。
- 响应只用于记录、展示、团队动态和周报素材。

### 稀有暴击

| rewardId | itemId | 奖励 | tier | weight |
| --- | --- | --- | --- | ---: |
| `reward_double_niuma` | `double_niuma_coupon` | 双倍牛马券 | `rare` | 2 |
| `reward_season_sprint` | `season_sprint_coupon` | 赛季冲刺券 | `rare` | 1 |
| `reward_luckin_coffee` | `luckin_coffee_coupon` | 瑞幸咖啡券 | `rare` | 1 |

`coin_rich_coupon` 暂不进入 active pool。它只影响个人银子，容易和银子层一起放大个人资产产出；第一版稀有层优先保留赛季高光和真实福利。

## 暂不入池内容

以下内容可以继续保留在 `ItemDefinition` 中，但 GM-16 active reward pool 不启用：

| itemId / reward | 原因 |
| --- | --- |
| `single_draw_guarantee_coupon` | 尚未实现单抽保底使用逻辑 |
| `ticket_discount_90` | 尚未实现购券折扣使用逻辑 |
| `hydration_bonus` | 尚未实现维度银子加成结算 |
| `movement_bonus` | 尚未实现维度银子加成结算 |
| `coin_rich_coupon` | 经济膨胀风险较高，后续再评估 |
| `grant_title` / `reward_today_title` | 尚未实现持久化收藏或称号库存 |

这些内容不是废弃，只是不进入本次可上线奖池。

## 抽奖规则

GM-16 不改变 GM-06 的抽奖规则。

保持：

- 单抽消耗 `1` 张抽奖券。
- 十连消耗 `10` 张抽奖券。
- 抽奖券价格为 `40` 银子 / 张。
- 每日银子补券上限为 `3` 张。
- 十连至少需要先拥有 `7` 张券，最多用银子补齐 `3` 张。
- 单抽没有保底。
- 十连至少保底 `1` 个 `utility / social / rare`。
- 十连保底不保证 `rare`。
- 如果十连自然结果全是 `coin`，替换其中一个结果为 `utility`。

保底替换仍只从 `utility` 池抽取，避免十连保底间接提高稀有和弱社交产出。

## 内容校验

GM-16 应新增或强化内容层测试，而不是依靠人工检查奖池。

建议校验：

1. 所有 `enabled` 且 `weight > 0` 的奖励权重总和等于 `100`。
2. 各 tier 权重分别为：
   - `coin = 45`
   - `utility = 27`
   - `social = 24`
   - `rare = 4`
   - `cosmetic = 0`
3. 直接银子 EV 等于 `8.75`。
4. `grant_item` 和 `grant_real_world_redemption` 的 `itemId` 必须存在。
5. 入池 item 必须 `enabled = true`。
6. 入池 item 的 effect 必须属于当前已开放入口：
   - `task_reroll`
   - `fitness_coin_multiplier`
   - `fitness_season_multiplier`
   - `fitness_coin_and_season_multiplier`
   - `leave_protection`
   - `social_invitation`
   - `real_world_redemption`
7. `grant_title` 在 GM-16 active pool 中不允许启用。
8. 不允许 `weight <= 0` 的奖励参与抽奖。

## UI 影响

GM-16 理论上不需要新增 UI。

供应站现有 UI 会自然展示：

- 抽奖结果。
- 背包道具库存。
- 可用道具按钮。
- 真实福利申请兑换。
- 弱社交发起入口。

需要注意：

- 如果当前 UI 仍有类似“后续 GM-08 再开放”的遗留文案，应在实现计划中顺手清理。
- 不新增“概率公示”页面；若后续要展示概率，可在 Docs Center 规则页单独做。

## 数据与迁移

GM-16 不需要 Prisma schema 变更。

原因：

- 奖池内容来自 `content/gamification/reward-pool.ts`。
- 道具定义来自 `content/gamification/item-definitions.ts`。
- 抽奖历史已保存 reward snapshot，调整奖池不会影响历史抽奖记录。
- 背包、兑换、道具使用状态机均已存在。

## 测试策略

### 内容测试

覆盖：

- active pool 总权重为 `100`。
- tier 权重和设计一致。
- 银子 EV 为 `8.75`。
- 每个入池 reward 的 id 唯一。
- 每个入池 item 存在且 enabled。
- 未开放效果不进入 active pool。
- `grant_title` 不进入 active pool。

### 抽奖服务测试

覆盖：

- `getDirectCoinExpectedValue()` 返回 `8.75`。
- 十连全 coin 时触发保底。
- 十连保底替换结果来自 `utility`。
- 十连自然出现 `utility / social / rare` 时不触发保底。
- 稀有奖励仍会进入背包或真实福利库存。

### 回归测试

运行：

```bash
npm test
npm run lint
npm run build
```

GM-16 是内容和校验变更，但必须跑完整回归，因为 reward pool 会影响抽奖、背包、兑换、团队动态和周报。

## Acceptance Criteria

GM-16 完成时应满足：

1. active reward pool 总权重为 `100`。
2. 奖池层级为 `coin 45 / utility 27 / social 24 / rare 4`。
3. 普通银子直接 EV 为 `8.75`。
4. 用户不会抽到当前没有使用、展示或兑换闭环的奖励。
5. `reward_today_title` 或任何 `grant_title` 奖励不在 active pool 中启用。
6. `single_draw_guarantee_coupon`、`ticket_discount_90`、`hydration_bonus`、`movement_bonus` 不在 active pool 中启用。
7. 十连保底行为保持 GM-06 规则不变。
8. 所有奖池内容校验测试通过。
9. 完整测试、lint、build 通过。

## Follow-Up Stories

GM-16 之后可以单独拆：

- `GM-17 Lottery Utility Expansion`：实现保底升级券、九折购券卡。
- `GM-18 Dimension Bonus Items`：实现补水加班费、站立补贴等维度加成。
- `GM-19 Cosmetic Collection`：实现称号、贴纸、日历装饰和趣味收藏库存。
- `GM-20 Probability Disclosure`：在 Docs Center 展示当前奖池概率。
