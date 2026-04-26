# 分支与 Worktree 协作约定

> 适用范围：当前项目的主线功能开发、P3 收尾、P4 gamification 大线，以及后续需要并行推进的中大型功能。

## 这份文档解决什么问题

当前项目已经有线上在用的稳定版本，同时还在继续做：

- 主线功能的日常开发
- P3 收尾与赛季复盘
- P4 gamification 这一条明显更长、更复杂、依赖更多的功能线

这会自然带来几个问题：

- `main` 已经在线上，不能随便塞半成品
- 普通主线功能和 gamification 会互相抢工作区
- gamification 里很多 `GM` story 彼此依赖，但又不适合一次性大合并
- 如果只有一个超长寿命大分支，最后联调和合并风险会越来越大

这份文档给出的答案是：

- 用 `branch` 管逻辑隔离和合并节奏
- 用 `worktree` 管本地工作区隔离
- `main` 只承接稳定内容
- 主线和 gamification 各自有自己的集成分支
- 每个具体功能或每个 `GM` 仍然走短分支

---

## 一句话原则

- `main`：线上稳定分支，只放已经验证过、可以发布的内容
- `integration` 分支：承接某一条开发主线的阶段性集成
- `feature` 分支：承接一个具体功能或一个具体 story
- `worktree`：让你同时打开多个分支的本地目录，不用来回切换工作区

通俗讲：

- `feature` 像一个零件
- `integration` 像装配台
- `main` 像已经在用的成品

---

## 推荐分支模型

## 1. 稳定分支

### `main`

用途：

- 当前线上稳定版本
- 任何时候都尽量保持可发布、可回滚

规则：

- 不直接在 `main` 上开发
- 不把半成品、占位实现、规则未定的复杂功能直接合进来
- 只接收已经完成测试、联调和必要验收的内容

适合进入 `main` 的内容：

- 已完成验证的普通主线功能
- 已完成一个完整 release slice 的 gamification 能力
- 紧急线上修复

---

## 2. 主线开发集成分支

### 推荐名称：`next/mainline`

也可以叫：

- `main-dev`
- `develop`

但更推荐 `next/mainline`，语义更清楚，表示“下一版主线集成区”。

用途：

- 承接主线日常开发
- 承接 P3 收尾与赛季复盘
- 承接一组相互有关、但还不想立刻进 `main` 的常规功能

适合从这里拉出去的分支：

- `feature/p3-season-recap`
- `feature/p3-copy-and-mobile-polish`
- `feature/report-center-season-summary`

规则：

- 主线常规功能优先从 `next/mainline` 拉 `feature/...`
- `feature/...` 完成后先合回 `next/mainline`
- `next/mainline` 稳定、联调通过后，再整体或分批合回 `main`

什么时候需要这个分支：

- 你每天都在做几个主线功能
- 这些功能可能互相影响
- 你不想让 `main` 变成暂存区

如果只是很小的单点修复，而且能当天做完、当天验证，也可以直接：

- `main -> feature/... -> main`

不必强制经过 `next/mainline`

---

## 3. Gamification 集成分支

### 推荐名称：`epic/gamification-p4`

用途：

- 承接整个 gamification 大方向
- 让 `GM-01` 到 `GM-15` 逐步拼起来
- 提供一条不污染 `main` 的长期联调线

为什么需要它：

因为 gamification 不是一个小功能，而是一整条功能体系，里面有：

- config
- schema
- ticket ledger
- inventory
- lottery
- item use
- boost settlement
- redemption
- enterprise WeChat
- weak social
- report center / team dynamics integration

这些东西明显不适合：

- 一把梭全塞到 `main`
- 或者只开一个 `feature/gamification` 然后几周后一次性合并

所以更好的方式是：

- 用 `epic/gamification-p4` 作为 gamification 的装配台
- 每个 `GM` 自己开小分支
- 小分支先合回 `epic/gamification-p4`
- 等一个 slice 稳定后，再把这一整段能力合到 `main`

---

## 4. 每个 GM 的短分支

推荐命名：

- `feature/gm-01-content-config-foundation`
- `feature/gm-02-database-foundation`
- `feature/gm-03-supply-station-shell`
- `feature/gm-04-daily-tasks-life-ticket`
- `feature/gm-05-fitness-ticket-hook`
- `feature/gm-06-lottery-v1`

后续同理。

这些分支从哪里拉：

- `GM` 相关分支统一从 `epic/gamification-p4` 拉出

不是从 `main` 拉，原因很简单：

- `GM-04` 依赖 `GM-03`
- `GM-05` 依赖 `GM-04`
- `GM-06` 依赖 `GM-05`
- 后面的 `GM` 依赖更重

如果都从 `main` 拉，每次都要手工 cherry-pick 或反复合并前面的 story，成本会很高。

从 `epic/gamification-p4` 拉的好处：

- 前面已经合进去的 `GM` 能自然成为后面的基础
- 依赖链更顺
- 联调环境更真实

---

## 通俗解释：为什么 GM 还要拆小分支

很多人会有一个自然疑问：

“既然 gamification 本来就互相依赖，那我是不是直接搞一个大分支就够了？”

答案是：不够好。

因为“有依赖”和“应该放在一个超大开发分支里乱改”不是一回事。

拆成小分支的意义是：

- 每次只改一个 story，review 更清楚
- 每次只测一个 story，回归范围更可控
- 出 bug 时更容易知道是哪一步引入的
- 合并冲突更小
- 文档、spec、plan、实现都能一一对应

所以正确理解是：

- `epic/gamification-p4` 是集成线
- `feature/gm-xx-*` 是实现单元

不是二选一，而是同时存在。

---

## 推荐合并路径

## 主线功能

推荐流程：

`main -> next/mainline -> feature/... -> next/mainline -> main`

更具体一点：

1. 从 `next/mainline` 拉一个 `feature/...`
2. 开发并自测
3. 合回 `next/mainline`
4. 在 `next/mainline` 上做联调
5. 合适时再合回 `main`

如果是小修复：

`main -> feature/hotfix-or-small-change -> main`

---

## Gamification 功能

推荐流程：

`main -> epic/gamification-p4 -> feature/gm-xx -> epic/gamification-p4 -> main`

更具体一点：

1. 从 `main` 拉出 `epic/gamification-p4`
2. 从 `epic/gamification-p4` 拉出 `feature/gm-01-*`
3. `gm-01` 完成后合回 `epic/gamification-p4`
4. 再从最新的 `epic/gamification-p4` 拉出 `feature/gm-02-*`
5. 后续重复这个节奏
6. 一个完整 slice 稳定后，再把 `epic/gamification-p4` 的对应成果合回 `main`

关键点：

- 不是每个 `GM` 做完都要直接进 `main`
- 是先进入 `epic/gamification-p4`
- `epic/gamification-p4` 稳定到一个阶段，再进入 `main`

---

## 推荐按 Slice 合到 `main`

gamification 最好不要等 `GM-01` 到 `GM-15` 全做完才合并。

更好的做法是按 roadmap 里的 slice 合：

### Slice 1: Foundation

- `GM-01`
- `GM-02`

特点：

- 基础配置和数据库能力
- 用户感知小，但风险要清楚

是否进 `main`：

- 可以进，如果你希望后续 story 在主线上逐步长出来
- 也可以先只留在 `epic/gamification-p4`，看你是否想尽早把 schema 和 config 主干化

### Slice 2: MVP Gameplay

- `GM-03`
- `GM-04`
- `GM-05`

特点：

- 已经能形成“每日任务 + 得 ticket”的最小闭环

建议：

- 这是第一个非常适合正式合回 `main` 的 gamification slice

### Slice 3: Lottery And Backpack

- `GM-06`
- `GM-07`

特点：

- 开始进入经济循环
- 需要更严格的测试和观测

### Slice 4: Boosts And Leave Protection

- `GM-08`
- `GM-09`

特点：

- 这是整个 gamification 最危险的一段
- 会真正影响主经济和打卡结算

建议：

- 这一段不要边写边往 `main` 塞
- 应在 `epic/gamification-p4` 充分联调后再进 `main`

### Slice 5: Redemption And Enterprise WeChat

- `GM-10`
- `GM-11`
- `GM-12`

特点：

- 开始涉及 admin 流程、现实履约、外部通知

### Slice 6: Archive And Recap

- `GM-13`
- `GM-14`
- `GM-15`

特点：

- 更像消费前面数据的整合层

---

## Worktree 到底怎么用

很多人会把 `branch` 和 `worktree` 混在一起。

最简单的理解：

- `branch`：你在做哪条线
- `worktree`：你本地开几个工作目录

`worktree` 不是替代 branch 的，它只是让你不用来回 checkout。

### 推荐本地工作区结构

你可以长期保留这几个 worktree：

- 一个工作区对应 `main`
- 一个工作区对应 `next/mainline`
- 一个工作区对应 `epic/gamification-p4`

如果当前正在做某个大 story，也可以额外开：

- 一个工作区对应 `feature/gm-06-lottery-v1`

这样做的好处：

- 你随时能看线上稳定版是什么状态
- 你随时能在主线开发区继续做普通功能
- 你随时能在 gamification 集成线联调
- 你不用来回 stash / checkout / 切分未提交改动

---

## 推荐的日常工作方式

## 情况 A：做普通主线功能

1. 进入 `next/mainline` worktree
2. 拉最新代码
3. 新建 `feature/...`
4. 做完、自测
5. 合回 `next/mainline`
6. 在 `next/mainline` 联调
7. 稳定后合回 `main`

## 情况 B：做 gamification 的一个 GM

1. 进入 `epic/gamification-p4` worktree
2. 拉最新代码
3. 新建 `feature/gm-xx-*`
4. 做完、自测
5. 合回 `epic/gamification-p4`
6. 在 `epic/gamification-p4` 上继续联调后续依赖 story
7. 到一个 slice 完整后，再合回 `main`

## 情况 C：线上紧急修复

1. 从 `main` 拉 `hotfix/...`
2. 修复并验证
3. 合回 `main`
4. 再把这次 hotfix 反向合到 `next/mainline`
5. 如有必要，也合到 `epic/gamification-p4`

关键原则：

- 线上修复永远先回 `main`
- 然后再把修复同步回开发中的集成分支

---

## 什么时候不需要额外集成分支

如果只是这些情况，可以简单一点：

- 一个很小的单点功能
- 没有复杂依赖
- 当天能做完、当天能验完
- 不会影响别的正在开发的大线

这时候可以直接：

`main -> feature/... -> main`

或者：

`next/mainline -> feature/... -> next/mainline`

没必要为了形式而多开层级。

---

## Worktree 能不能跨电脑同步

先说结论：

- 能同步的是 `branch`、`commit`、`push` 到 `origin` 的代码历史
- 不能同步的是你本机上的 `worktree` 目录结构本身
- 所以你可以在家里电脑和公司电脑接着做同一条开发线，但每台电脑都要各自重新创建一次 `worktree`

通俗理解：

- `branch` 是开发线路，会跟着远端走
- `commit` 是代码内容，会跟着远端走
- `worktree` 是你本地怎么摆工作台，不会跟着远端走

### 哪些内容会同步到另一台电脑

- 你已经提交并 `push` 的 commit
- 你已经 `push` 到 `origin` 的分支，比如 `next/mainline`
- 仓库里已经被 git 跟踪的文件改动

### 哪些内容不会同步到另一台电脑

- `.worktrees/next-mainline` 这种本地目录本身
- 你本机上同时开了几个工作目录
- 你还没有提交的改动
- 你已经提交但还没有 `push` 的本地分支

### 这对你现在的实际含义

比如你在家里电脑做了这些事：

- 建了 `next/mainline`
- 建了 `epic/gamification-p4`
- 本地开了 `.worktrees/next-mainline`
- 本地开了 `.worktrees/epic-gamification-p4`

那么：

- 只有前两个分支在你 `push` 之后，公司电脑才能看见
- 后两个 `worktree` 目录不会自动出现在公司电脑上

也就是说，公司电脑的正确动作不是“等 worktree 自动同步”，而是：

1. 先 `git fetch origin`
2. 拿到你已经 push 上去的分支
3. 在公司电脑本地重新执行 `git worktree add ...`

### 推荐的跨电脑使用流程

家里电脑：

1. 完成功能开发
2. 提交你要保留的改动
3. 把相关分支推到远端

常见命令：

```bash
git push -u origin next/mainline
git push -u origin epic/gamification-p4
git push
```

公司电脑：

1. 拉取远端最新分支
2. 在本地重新创建对应的 worktree
3. 进入对应目录继续开发

常见命令：

```bash
git fetch origin
git worktree add .worktrees/next-mainline origin/next/mainline
git worktree add .worktrees/epic-gamification-p4 origin/epic/gamification-p4
```

如果你本地已经有同名分支，也可以先建本地跟踪分支，再创建 worktree，例如：

```bash
git checkout -b next/mainline --track origin/next/mainline
git checkout -b epic/gamification-p4 --track origin/epic/gamification-p4
git worktree add .worktrees/next-mainline next/mainline
git worktree add .worktrees/epic-gamification-p4 epic/gamification-p4
```

### 一个最容易踩坑的点

很多人以为：

- “我已经建了 worktree，所以另一台电脑也会有”

这其实不对。

正确理解是：

- 另一台电脑能拿到的是分支和提交历史
- 另一台电脑拿不到的是你本地的 worktree 布局

所以跨电脑协作的关键不是“同步 worktree”，而是：

- 先把分支和提交同步到 `origin`
- 再在另一台电脑本地恢复同样的 worktree 结构

---

## 不推荐的做法

### 1. 直接在 `main` 上长期开发

问题：

- 容易把线上稳定分支变成开发暂存区
- 一旦做到一半，回滚和发布都别扭

### 2. 只有一个超长寿命 `gamification` 大分支

问题：

- 所有 story 混在一起
- review 粒度太粗
- 测试范围越来越难界定
- 最后一次性合并风险很大

### 3. 每个 GM 直接从 `main` 拉并且直接合回 `main`

问题：

- 依赖链会很难受
- 中间态可能在产品上不完整
- 你会被迫把一些还不适合上线的 gamification 能力过早带入主干

### 4. 把 worktree 当成 branch 的替代品

问题：

- worktree 只能解决本地工作区切换问题
- 不能替代清晰的分支策略

---

## 当前项目的推荐落地版本

如果从现在开始整理，我建议你采用这套：

### 保留

- `main`

### 新增主线集成分支

- `next/mainline`

### 新增 gamification 集成分支

- `epic/gamification-p4`

### 主线功能短分支

- `feature/p3-season-recap`
- `feature/p3-mobile-polish`
- `feature/report-center-season-summary`

### Gamification 短分支

- `feature/gm-01-content-config-foundation`
- `feature/gm-02-database-foundation`
- `feature/gm-03-supply-station-shell`
- `feature/gm-04-daily-tasks-life-ticket`
- `feature/gm-05-fitness-ticket-hook`
- `feature/gm-06-lottery-v1`
- `feature/gm-07-backpack-v1`
- `feature/gm-08-today-effective-item-use`
- `feature/gm-09-boost-settlement-integration`
- `feature/gm-10-real-world-redemption`
- `feature/gm-11-enterprise-wechat-sender`
- `feature/gm-12-weak-social-invitations`
- `feature/gm-13-team-dynamics-integration`
- `feature/gm-14-docs-center-rule-pages`
- `feature/gm-15-weekly-report-report-center-integration`

---

## 最后给一个最短版本

如果只记住一句话，请记这个：

`main` 保持稳定，主线功能先去 `next/mainline`，gamification 先去 `epic/gamification-p4`，每个具体功能或每个 GM 仍然走自己的短分支，worktree 只是帮你同时打开这些分支的本地目录。
