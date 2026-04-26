# 游戏化交付风控 Checklist

> 目标：把游戏化主设计和 story roadmap 转成一份可执行的检查清单，用于每个 GM story 开发、验收、灰度和上线前风险评审。

## 使用方式

- 每个 GM story 完成前，先过对应的「本 story 必查」。
- 每个 release slice 对外灰度前，过「技术风控清单」「产品上线前验收清单」「最小可上线灰度策略」。
- 只要账本一致性、时间边界、撤销/回滚、库存扣减、外部通知任一项没有说清楚，就不要把当前 story 视为完成。
- 这份文档不替代 story spec / implementation plan；它是实现过程中的风控门禁。

参考文档：

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

---

## 技术风控清单

### 账本和事务一致性

- [ ] 所有会改变余额、券、库存、道具状态、兑换状态的操作都在同一个事务内完成。
- [ ] 不会出现「券扣了但抽奖记录没写」「库存扣了但道具使用没写」「兑换申请失败但库存没退」这类半状态。
- [ ] 每一笔 ticket 变化都有 `LotteryTicketLedger` 记录，并能通过 `sourceType/sourceId` 追溯来源。
- [ ] 每一笔抽奖结果都有快照，后续配置文案变化不会改写历史展示。
- [ ] 每一个库存扣减路径都能证明不会把 quantity 扣成负数。
- [ ] 重试、双击、多标签页并发不会造成重复发券、重复抽奖、重复结算或重复扣库存。

### 时间边界

- [ ] 所有 today / dayKey / this week / expired today 统一使用同一个上海时区工具。
- [ ] 每日任务、每日 reroll、每日 life ticket、每日 fitness ticket、每日 coin top-up cap 使用同一套 dayKey 规则。
- [ ] 道具 pending / settled / expired 在 23:59 到 00:01 的边界行为有测试。
- [ ] 社交邀请的 same-day expiry 与任务、道具、报表使用一致的日界线。
- [ ] 强 boost 的每周限制有明确 week key，且跨周边界有测试。

### 撤销、回滚和过期

- [ ] `undo punch` 对当前已经接入的游戏化副作用都有明确处理。
- [ ] 健身打卡送出的 ticket 未花掉时，可以随打卡撤销一起回滚。
- [ ] 健身打卡送出的 ticket 已花掉时，撤销被阻止，并给出清晰用户文案。
- [ ] boost 对金币和赛季贡献的影响可以被一致地回滚，且不会回滚两次。
- [ ] pending 道具当天未触发时过期，不消耗库存。
- [ ] cancelled redemption 只退还一次库存；confirmed redemption 不能再取消。

### 经济和概率安全

- [ ] 免费 ticket 每日供给上限清楚，可解释，不会被重复领取绕过。
- [ ] 十连补券只能在十连确认中发生，没有独立买券接口。
- [ ] 每日 coin top-up 上限 `3` 不能被并发或重试绕过。
- [ ] 直接金币奖励期望值低于单张 ticket 价格 `40`。
- [ ] 十连保底不会误保 rare boost，只保证 utility-or-better。
- [ ] 强 boost 掉率和使用频率不会让抽奖副经济压过健身/赛季主经济。

### API、权限和并发

- [ ] 所有 mutation API 都校验登录态、payload、资源归属和当前状态。
- [ ] 所有 mutation API 的错误返回能区分未登录、参数错误、业务冲突和服务异常。
- [ ] 所有 mutation 成功后返回的 aggregate snapshot 与数据库最终状态一致。
- [ ] 高风险 service 有并发测试或至少有事务/唯一约束说明。
- [ ] 用户不可操作别人团队、别人邀请、别人 redemption、别人 inventory。

### 可观测性和支持

- [ ] 高风险操作记录足够 metadata，支持排查「为什么我的券/道具/兑换变了」。
- [ ] admin confirm/cancel 有操作者、时间和状态变更记录。
- [ ] 企业微信发送失败可排查，但不会静默破坏本地业务状态。
- [ ] 每个 release slice 有上线后可跑的 sanity query 或后台检查点。

---

## 产品上线前验收清单

### 用户理解

- [ ] 用户能看懂今天怎么拿 ticket。
- [ ] 用户能看懂为什么今天拿了 0 / 1 / 2 张 ticket。
- [ ] 用户能看懂道具是立即生效、今日 pending、已过期，还是需要手动兑换。
- [ ] 用户能看懂十连为什么需要补券，以及补券会花多少金币。
- [ ] 用户能看懂哪些操作不可撤销，哪些操作需要 admin 确认。

### 交互和状态

- [ ] Supply Station 在未解锁后续玩法时有合理空状态，不像坏掉的页面。
- [ ] 按钮 disabled 时，用户能知道缺什么条件。
- [ ] ticket、coin、inventory、pending effect 在操作成功后立即刷新。
- [ ] 操作失败时不会留下「看起来成功」的 UI 状态。
- [ ] 手机端可以完成当前 slice 的核心流程。

### 公平感和信任

- [ ] 抽奖结果可见、可回看，不只是一闪而过。
- [ ] 影响公平的规则写清楚：reroll 次数、ticket 来源、十连保底、补券上限、boost 上限、过期规则。
- [ ] leave protection 明确是保护 streak，不给 ticket、金币、赛季贡献。
- [ ] 现实奖励明确是 admin-confirmed offline fulfillment。
- [ ] 弱社交看起来是邀请和提醒，不像强制协作或消息轰炸。

### 当前 slice 是否可上线

- [ ] 当前 slice 单独上线也有完整价值，不依赖未来 story 才能解释。
- [ ] placeholder 不压过当前可用功能。
- [ ] 用户文案与真实实现一致，没有提前承诺未实现能力。
- [ ] 运营/管理员知道当前 slice 出问题时怎么处理。

---

## 最小可上线灰度策略

### 灰度顺序

1. 内部/dev team only。
2. 一个小团队 pilot。
3. 多个真实团队，但只开低风险奖励。
4. 当前 slice 全量。
5. 进入下一个 slice。

### 灰度开关

- [ ] Supply Station 导航入口可以按环境或团队隐藏。
- [ ] lottery 可以独立关闭，不影响 daily tasks。
- [ ] real-world redemption 可以独立关闭，不影响 inventory。
- [ ] 企业微信发送可以独立关闭，不影响站内邀请。
- [ ] Team Dynamics 写入可以独立关闭，不影响核心玩法。

### 灰度观测指标

- [ ] 每日 ticket grant 数量。
- [ ] 每日 ticket spend 数量。
- [ ] 每日 coin top-up 数量。
- [ ] draw API 失败率。
- [ ] ledger 与 `User.ticketBalance` 不一致次数。
- [ ] inventory quantity 负数或异常次数。
- [ ] blocked undo punch 次数。
- [ ] pending item expired 次数。
- [ ] 企业微信发送失败次数。
- [ ] redemption request backlog。

### 立即暂停/回滚条件

- [ ] 出现需要手动修库的账本不一致。
- [ ] 出现可复现的重复结算、重复扣券、重复发奖。
- [ ] 出现跨日重复领取或跨日错误过期。
- [ ] 出现十连补券或保底规则绕过。
- [ ] 出现现实兑换库存和状态不一致。
- [ ] 出现企业微信错误收件人或高频骚扰。

---

## GM-01 Content Config Foundation

### 本 story 必查

- [ ] 四个 dimension key 固定为 `movement / hydration / social / learning`。
- [ ] task cards、reward pool、item definitions 都来自本地结构化配置。
- [ ] 没有把 reward/item/task 规则硬编码在 UI 文案里。
- [ ] 配置 ID 唯一，非法 enum、非法引用、disabled item 都会被测试抓住。
- [ ] reward effect 和 item effect 的 payload shape 有校验。

### 进入下一步前

- [ ] 后续 story 可以稳定引用 `taskCardId / rewardId / itemId`。
- [ ] tier、category、effect type 命名没有歧义。

## GM-02 Database Foundation

### 本 story 必查

- [ ] Prisma schema 覆盖 daily assignment、ticket ledger、inventory、item use、lottery、social invitation、real-world redemption。
- [ ] `User.ticketBalance` 已添加，并能与 ledger 同事务更新。
- [ ] config ID 使用 string 存储，不误建成配置表外键。
- [ ] daily task assignment 有用户、日期、维度唯一约束。
- [ ] service 层能防止 inventory quantity 变负。

### 进入下一步前

- [ ] seed/test setup 可以构造后续 story 所需的基础数据。
- [ ] migration 在本地和测试环境可稳定执行。

## GM-03 Supply Station Shell

### 本 story 必查

- [ ] 导航入口可访问，桌面和移动端都能打开。
- [ ] `GET /api/gamification/state` 返回完整 aggregate snapshot。
- [ ] 页面能展示今日任务、奖励状态、抽奖占位、背包摘要、社交占位。
- [ ] 未开放功能的 empty state 明确说明当前状态。
- [ ] 不依赖 Team Dynamics、Report Center、Enterprise WeChat。

### 进入下一步前

- [ ] snapshot shape 足够稳定，后续 story 是扩展而不是重写。
- [ ] loading、error、empty 状态已经有基本承接。

## GM-04 Daily Tasks And Life Ticket

### 本 story 必查

- [ ] 每个用户每天每个维度只有一个当前任务。
- [ ] 每个维度每天最多 reroll 一次。
- [ ] 四维任务全部完成后，才允许显式 claim 一张 life ticket。
- [ ] 同一天重复 claim 被阻止。
- [ ] 完成任务不会产生 fitness punch、season contribution 或 coin。
- [ ] complete/reroll/claim 后 snapshot 立即刷新。

### 进入下一步前

- [ ] `DAILY_TASKS_GRANTED` ledger 记录清楚。
- [ ] UI 能解释 life ticket 为什么可领、已领或不可领。

## GM-05 Fitness Ticket Hook

### 本 story 必查

- [ ] 真实健身打卡每天最多给一张 fitness ticket。
- [ ] leave coupon 或非真实打卡不会给 fitness ticket。
- [ ] 打卡结算和 ticket ledger 写入在同一事务中。
- [ ] ticket 未花掉时，撤销打卡能撤回 ticket。
- [ ] ticket 已花掉时，撤销打卡被阻止，并保留 punch。
- [ ] 不引入负余额、补偿债务或 admin 隐式修正路径。

### 进入下一步前

- [ ] punch settlement 已有清晰扩展点，后续 boost 可接入。
- [ ] blocked undo 的用户文案可读。

## GM-06 Lottery V1

### 本 story 必查

- [ ] 单抽只花一张 ticket。
- [ ] 十连只花十张 ticket。
- [ ] 少于七张 ticket 不能启动十连。
- [ ] 十连补券只发生在十连确认内。
- [ ] 每日 coin-purchased ticket cap 为 `3`，并发不可绕过。
- [ ] ticket price 为 `40 coins`。
- [ ] 十连保底至少一个 utility-or-better，但不保证 rare boost。
- [ ] 直接金币期望值低于 `40`。
- [ ] draw、ticket spend、coin spend、reward settlement、history record 在同一事务。
- [ ] draw history 使用 reward snapshot。

### 进入下一步前

- [ ] 用户已经可以稳定获得 inventory-bearing reward。
- [ ] 抽奖后 ticket、coin、recentDraws 展示一致。

## GM-07 Backpack V1

### 本 story 必查

- [ ] 背包展示 owned items 和 quantity。
- [ ] quantity 为 0 的 item 不作为可用库存展示。
- [ ] item 按 boost、protection、social、lottery、cosmetic、real-world 分类。
- [ ] item detail 展示 effect、使用限制、是否需要 admin confirmation。
- [ ] 今日 pending effect 与永久库存有明显区分。

### 进入下一步前

- [ ] 用户能在使用前理解 item 做什么。
- [ ] inventory read model 足够支撑后续 `items/use`。

## GM-08 Today-Effective Item Use

### 本 story 必查

- [ ] `items/use` 能创建 pending 或 immediate same-day use record。
- [ ] pending boost 在成功结算前不消耗库存。
- [ ] 当天未真实打卡时，pending boost 过期且不扣库存。
- [ ] small boost 和 strong boost 不能同日叠加。
- [ ] strong boost 每用户每周最多一次。
- [ ] leave protection 只保护 streak 和奖励档位，不给 ticket、coin、season contribution。

### 进入下一步前

- [ ] `pending / settled / expired / cancelled` 状态可测试、可展示、可排查。
- [ ] 跨日过期行为有测试。

## GM-09 Boost Settlement Integration

### 本 story 必查

- [ ] boost 正确影响个人金币、赛季贡献或二者。
- [ ] settlement 幂等，重复请求不会重复放大。
- [ ] punch undo 能准确回滚 boost 影响。
- [ ] season cap 规则在 multiplier 后仍然生效。
- [ ] 用户能在打卡结果中看到 boost 生效文案。

### 进入下一步前

- [ ] 主 P3 经济没有因为 boost 变得不可解释。
- [ ] punch result 与 game settlement result 没有不一致。

## GM-10 Real-World Redemption

### 本 story 必查

- [ ] 只有库存足够时才能发起兑换。
- [ ] request 时库存被占用或扣减一次。
- [ ] admin confirm 将状态改为 `CONFIRMED`，不能重复确认造成副作用。
- [ ] admin cancel 只能取消 `REQUESTED`，并只退库存一次。
- [ ] `CONFIRMED` 不可取消。
- [ ] 用户能看到 redemption status。

### 进入下一步前

- [ ] admin/运营知道如何处理待确认、确认、取消。
- [ ] 延迟履约或拒绝履约有支持路径。

## GM-11 Enterprise WeChat Sender Foundation

### 本 story 必查

- [ ] webhook 缺失时 graceful fail。
- [ ] 发送失败有日志，能查到原因、目标、消息类型。
- [ ] 外部发送失败不会破坏本地业务状态。
- [ ] sender 和 formatter 可被 weekly report 与 weak social 复用。
- [ ] 不把 webhook 暴露给客户端。

### 进入下一步前

- [ ] 错误收件人风险已经通过配置和 formatter 检查。
- [ ] 社交流程可以安全接入 sender。

## GM-12 Weak Social Invitations V1

### 本 story 必查

- [ ] social item use 能创建 `SocialInvitation`。
- [ ] invitation 能按 item type 指向单人或团队。
- [ ] 企业微信发送失败时，站内 invitation 仍然存在。
- [ ] invitation same-day expiry 生效。
- [ ] recipient respond / ignore 不会重复结算。
- [ ] expired invitation 不结算奖励。
- [ ] team broadcast item 遵守团队每日上限。

### 进入下一步前

- [ ] 社交流程不会对同一团队产生高频骚扰。
- [ ] UI 清楚展示 pending、responded、expired、cancelled。

## GM-13 Team Dynamics Integration

### 本 story 必查

- [ ] 只写入高价值事件：rare prize、多人成就、四维连续完成、关键 boost 里程碑等。
- [ ] 普通任务完成、普通得币、普通邀请不刷 Team Dynamics。
- [ ] dynamic payload 带足够 snapshot，后续配置变化不会影响历史渲染。
- [ ] Team Dynamics 不可用时，核心游戏化仍然可用。

### 进入下一步前

- [ ] feed 信息密度仍然可读。
- [ ] 没有低价值事件默认写入共享团队面板。

## GM-14 Docs Center Rule Pages

### 本 story 必查

- [ ] 文档解释 ticket 来源、十连、补券、背包、boost、leave protection、weak social、现实兑换。
- [ ] 文档中的限制和实现一致，尤其是每日/每周限制、保底、过期规则。
- [ ] Supply Station 的 changelog 已添加。
- [ ] 新用户能通过文档理解为什么今天拿到一张或两张 ticket。

### 进入下一步前

- [ ] 支持和公平性问题能通过文档回答，不依赖临时口头解释。

## GM-15 Weekly Report / Report Center Integration

### 本 story 必查

- [ ] 报表使用已存储记录聚合，不实时重算随机结果。
- [ ] 没有游戏化数据时，report center 仍能渲染。
- [ ] 四维完成统计按用户、团队、日期维度准确。
- [ ] ticket earned、ticket spent、lottery participation 与 ledger/draw history 对得上。
- [ ] rare prize 和 weak social highlight 只展示有意义事件。
- [ ] 周报文案不暴露过多低价值流水。

### 关闭 P4 主线前

- [ ] recap 能讲清楚游戏循环价值，但不暴露内部结算复杂度。
- [ ] 报表层失效不会影响核心游戏化操作。

---

## 推荐实现门禁

### Gate A: Foundation Ready

- [ ] `GM-01`
- [ ] `GM-02`
- [ ] config ID、schema、seed/test 数据稳定。

### Gate B: MVP Gameplay Ready

- [ ] `GM-03`
- [ ] `GM-04`
- [ ] `GM-05`
- [ ] 用户能完成四维任务并每天最多获得两张免费 ticket。

### Gate C: Economy Ready

- [ ] `GM-06`
- [ ] `GM-07`
- [ ] 抽奖、ticket、coin、inventory 没有账本不一致。

### Gate D: High-Risk Economy Ready

- [ ] `GM-08`
- [ ] `GM-09`
- [ ] pending/settled/expired、boost、undo、season cap 都稳定。

### Gate E: Social And Redemption Ready

- [ ] `GM-10`
- [ ] `GM-11`
- [ ] `GM-12`
- [ ] admin、运营和企业微信异常路径都可处理。

### Gate F: Archive And Recap Ready

- [ ] `GM-13`
- [ ] `GM-14`
- [ ] `GM-15`
- [ ] Team Dynamics、Docs Center、Report Center 都只消费稳定数据。

## 最终上线前 Sanity Pass

- [ ] 核心玩法可以用三句话解释清楚。
- [ ] 系统不会要求用户相信一个看不见的隐藏结算。
- [ ] 每个不可逆动作都有可见或可支持排查的审计痕迹。
- [ ] 当前 slice 既好玩，又不会让运营和支持崩掉。
