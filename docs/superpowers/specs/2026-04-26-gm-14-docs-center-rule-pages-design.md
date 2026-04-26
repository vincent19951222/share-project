# GM-14 Docs Center Rule Pages Design

> 把“牛马补给站”的玩法、奖励、道具、兑换和常见误解写进文档中心，让用户能从供应站快速查看规则。GM-14 是内容与入口 story，不新增经济逻辑，不重做 Docs Center 主线。

## 背景

牛马补给站从 GM-04 到 GM-12 已经覆盖了每日任务、发券、抽奖、背包、道具、暴击、真实福利兑换和弱社交。玩法变多后，单靠页面按钮文案已经不够解释规则。

需要一个长期稳定的位置回答：

- 今天最多能拿几张券？
- 健身券和生活券有什么区别？
- 十连抽为什么可以用银子补齐？
- 道具是永久有效还是当天有效？
- 暴击券什么时候生效？
- 健身请假券到底算不算健身？
- 瑞幸咖啡券怎么找管理员兑换？
- 弱社交点名不响应有没有惩罚？

这些内容属于“产品说明型内容”，应进入主线文档中心，而不是进入团队动态、战报中心或供应站页面正文。

## 上游参考

- `docs/superpowers/specs/2026-04-25-docs-center-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/specs/2026-04-25-gm-03-supply-station-shell-design.md`
- `docs/superpowers/specs/2026-04-25-gm-04-daily-tasks-life-ticket-design.md`
- `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-07-backpack-v1-design.md`
- `docs/superpowers/specs/2026-04-26-gm-08-today-effective-item-use-design.md`
- `docs/superpowers/specs/2026-04-26-gm-09-boost-settlement-integration-design.md`
- `docs/superpowers/specs/2026-04-26-gm-10-real-world-redemption-design.md`
- `docs/superpowers/specs/2026-04-26-gm-12-weak-social-invitations-design.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`

## 产品目标

1. 在文档中心增加牛马补给站规则内容。
2. 在文档中心增加牛马补给站使用说明。
3. 在文档中心增加牛马补给站 FAQ。
4. 在文档中心更新一条牛马补给站 changelog。
5. 在牛马补给站页面提供清晰的“玩法规则”入口。
6. 所有内容使用本地内容配置维护，不新增数据库和后台 CMS。
7. 规则文案必须和 GM-04 到 GM-12 的产品决策一致。
8. 内容可以独立测试，避免后续经济规则改了但文档没同步。

## 非目标

- 不实现主线 Docs Center 页面、路由、Profile 入口或 tabs 基础设施。
- 不新增 Prisma 模型。
- 不新增公开 API。
- 不做后台编辑器。
- 不做 Markdown 远程加载。
- 不做全文搜索。
- 不做规则版本审批流。
- 不修改抽奖概率、道具效果或兑换状态机。
- 不把团队动态事件或周报内容放进文档中心。
- 不把文档中心内容同步到企业微信。

## 依赖与就绪条件

GM-14 依赖主线文档中心已经存在。

| 依赖 | 来源 | 必须具备的能力 |
| --- | --- | --- |
| Docs Center route | 主线文档中心 | `/docs` 可访问 |
| Docs Center content structure | 主线文档中心 | 支持 changelog、rules、help、faq 四类内容 |
| Docs Center components | 主线文档中心 | 能渲染本地内容模块 |
| Supply Station page | GM-03 | `SupplyStation` 页面可展示入口链接 |
| Daily tasks | GM-04 | 发券规则已落地 |
| Real-world redemption | GM-10 | 瑞幸兑换状态机已落地 |

如果主线文档中心尚未完成，GM-14 不实施可见 UI；可以先保留本 spec 和 plan，等 `/docs` 主线完成后再接入。

## 信息架构

GM-14 不新增文档中心一级 tab，而是在现有四类内容里补充牛马补给站内容。

| Docs Center 区域 | GM-14 内容 |
| --- | --- |
| `更新日志` | 新增“牛马补给站规则说明上线” |
| `赛季规则 / 规则` | 新增“牛马补给站玩法规则”规则块 |
| `使用说明` | 新增“每天怎么用牛马补给站”说明块 |
| `常见问题` | 新增牛马补给站 FAQ |

推荐稳定锚点：

```text
/docs?tab=rules#supply-station-rules
/docs?tab=help#supply-station-help
/docs?tab=faq#supply-station-faq
```

如果主线文档中心只支持 hash，不支持 `tab` query，GM-14 可以让 `/docs#supply-station-rules` 先可用；但供应站入口优先使用完整 query + hash，方便未来扩展。

## 内容模块

GM-14 建议新增一个独立内容模块：

```text
content/docs-center/gamification.ts
```

它导出：

- `gamificationDocs.updatedAt`
- `gamificationDocs.changelog`
- `gamificationDocs.rules`
- `gamificationDocs.help`
- `gamificationDocs.faq`
- `validateGamificationDocs`
- `getGamificationDocAnchors`

这样做的原因：

- 牛马补给站规则多，直接塞进 `rules.ts` 会变长。
- 后续经济规则变化时，可以集中修改一个内容模块。
- 测试可以直接验证关键规则事实是否存在。

## 必须覆盖的规则

### 1. 每日免费券

必须写清楚：

- 真实健身打卡获得 `1` 张健身券。
- 四维任务全部完成获得 `1` 张生活券。
- 每天最多免费获得 `2` 张券。
- 只完成四维中的一部分不能拿生活券。
- 健身券和生活券进入同一个抽奖券余额。
- 抽奖券永久有效，可以攒着十连。

### 2. 四维任务

必须写清楚：

- 四个维度固定为 `把电充绿 / 把尿喝白 / 把事办黄 / 把股看红`。
- 每个维度每天抽一张任务卡。
- 第一版采用信任型自报，点击完成即可。
- 不要求照片、定位、计时或审批。
- 四维任务是为了照顾身体和状态，不是强监管。

### 3. 抽奖和十连

必须写清楚：

- 单抽消耗 `1` 张券。
- 十连消耗 `10` 张券。
- 单抽没有保底。
- 十连至少保底 `1` 个实用道具、弱社交道具或稀有以上奖励。
- 十连可以用银子补齐，但必须先有至少 `7` 张券。
- 十连最多补 `3` 张付费券。
- 付费券价格为 `40` 银子 / 张。
- 付费券每日最多购买 `3` 张。
- 抽奖可能出银子，但长期期望低于购券成本。

### 4. 背包和道具有效期

必须写清楚：

- 道具永久有效。
- 真实福利券永久有效。
- 道具以背包库存形式展示。
- 使用成功后库存减少。
- 已花掉的资源不会因为撤销打卡、取消操作或后悔而自动返还。

### 5. 今日生效和暴击

必须写清楚：

- 收益类 boost 只作用于当天真实健身打卡。
- 先用 boost 再健身，打卡时生效。
- 先健身再用 boost，当天可以补结算。
- boost 不跨天自动延续。
- 暴击类道具不可叠加。
- 健身请假券不会触发任何 boost。

### 6. 健身请假券

必须写清楚：

- 使用后不算完成健身。
- 不发健身券。
- 不发银子。
- 不推进赛季贡献。
- 只保护连续记录不断联，并冻结下一次真实健身打卡档位。

### 7. 弱社交

必须写清楚：

- 点名喝水、出门溜达、闲聊、分享信息都属于轻提醒。
- 被邀请人可以响应，也可以忽略。
- 不响应不扣分、不影响收益。
- V1 弱社交响应不发银子、不发抽奖券、不推进赛季。
- 企业微信只是提醒渠道，系统内仍以当天响应记录为准。

### 8. 瑞幸咖啡券

必须写清楚：

- 瑞幸咖啡券属于真实福利。
- 用户需要在背包里申请兑换。
- 申请后库存立即扣减。
- 管理员确认后流程结束。
- 管理员取消 `REQUESTED` 申请时返还库存。
- 已确认兑换不自动生成咖啡打卡记录。

### 9. 团队动态边界

必须写清楚：

- 不是每个游戏化动作都会进入团队动态。
- 只有稀有奖励、四维连续完成里程碑、boost 高光、团队小喇叭、多人响应等高价值事件会沉淀。
- 普通任务完成、普通抽奖、普通点名不写团队动态。

## 文案风格

GM-14 文案要保留“搞笑摸鱼风”，但规则必须明确。

推荐风格：

- 标题可以搞笑。
- 规则句必须短。
- 数字和限制必须明确。
- FAQ 直接回答，不绕。
- 不写太多技术名词。

示例：

```text
抽奖券不会过期，可以攒着十连。公司可以倒闭，券先别过期。
```

但涉及规则时必须清晰：

```text
十连需要 10 张券；如果你已有 7-9 张，可以用银子补齐，最多补 3 张，价格 40 银子 / 张。
```

## 供应站入口

GM-14 需要在 `SupplyStation` 页面增加规则入口。

建议位置：

- 页面头部副标题旁增加 `玩法规则` 链接。
- 抽奖区增加 `查看抽奖规则` 链接。
- 背包区增加 `道具规则` 链接。
- 真实福利区增加 `兑换规则` 链接。

入口不应打断主流程，也不应做成强弹窗。点击后进入文档中心对应锚点。

## 测试策略

### 内容测试

覆盖：

- 所有 `id` 和 anchor 唯一。
- 必须规则事实全部存在。
- FAQ 至少覆盖发券、十连、道具有效期、健身请假券、瑞幸兑换、弱社交。
- changelog 日期存在且可排序。

### 组件测试

覆盖：

- `GamificationDocsSection` 能渲染规则、说明和 FAQ。
- 文案包含关键数字：`2`、`7`、`3`、`40`、`10`。
- 文案包含关键结论：永久有效、不返还、管理员确认、不发奖励。

### 集成测试

覆盖：

- `/docs` 页面能展示牛马补给站规则。
- `SupplyStation` 头部存在 `玩法规则` 链接。
- 链接指向 `/docs?tab=rules#supply-station-rules`。
- 文档中心不依赖数据库或游戏化 API。

## Acceptance Criteria

GM-14 完成时应满足：

1. 文档中心包含牛马补给站 changelog、规则、使用说明和 FAQ。
2. 牛马补给站页面能跳转到对应规则说明。
3. 文档内容覆盖每日发券、四维任务、抽奖十连、背包、boost、请假券、弱社交、瑞幸兑换和团队动态边界。
4. 内容模块是本地配置，不新增数据库和 API。
5. 文档中心仍然只承接说明型内容，不承接团队事件时间线。
6. 规则测试能防止关键经济限制从文档中意外丢失。

## Follow-Up Stories

GM-14 解锁：

- `GM-15 Weekly Report / Report Center Integration`
- 后续规则变更可以通过 changelog 和本地内容模块继续维护
