# Task Card Illustration Completion Design Spec

Date: 2026-05-24

## Goal

补齐今日主线任务卡片的插画层素材，让 4 个任务种类都拥有完整的 5 张可用插画。

当前 `http://localhost:3001/ui-lab/supply-dashboard` 的今日主线卡片通过 `TaskCardPreview` 使用 `public/assets/task-cards/illustrations/` 下的 WebP 插画。目录里现有 4 张，分别覆盖 `movement_004`、`hydration_003`、`social_001`、`learning_005`。`public/assets/task-cards/raw/` 已经有 20 张完整卡牌源图，和 `content/gamification/task-cards.ts` 中的 20 个 MVP 任务卡一一对应。

## Scope

本次只补齐插画层，不重做完整卡牌 UI，不调整每日任务抽取逻辑，不改 Dashboard 的交互。

最终每个种类保留 5 张插画：

| Dimension | Count | Card IDs |
| --- | ---: | --- |
| movement | 5 | `movement_001` 至 `movement_005` |
| hydration | 5 | `hydration_001` 至 `hydration_005` |
| social | 5 | `social_001` 至 `social_005` |
| learning | 5 | `learning_001` 至 `learning_005` |

## Asset Contract

输出目录：

```txt
public/assets/task-cards/illustrations/
```

输出格式：

- WebP。
- 文件大小尽量保持在单张 200 KB 以下。
- 图像宽度约 900 px，沿用现有素材规模。
- 插画只包含完整卡牌中的中间场景画面，不包含外层卡牌边框、顶部标题、底部标签、状态槽、换一个按钮。
- 保持现有像素风、厚描边、办公室健身、脱脂牛马角色和四类主题色。
- 不覆盖现有 4 张已接入素材，除非后续明确需要重裁。

## Naming

新增和现有文件共同形成完整清单：

```txt
movement_001-desk-reboot.webp
movement_002-seat-offline.webp
movement_003-neck-boot.webp
movement_004-window-heal.webp
movement_005-back-thaw.webp
hydration_001-first-cup.webp
hydration_002-pantry-refill.webp
hydration_003-empty-cup.webp
hydration_004-sugar-free.webp
hydration_005-coffee-debt.webp
social_001-small-talk.webp
social_002-work-smell-vent.webp
social_003-praise-heal.webp
social_004-status-report.webp
social_005-hard-work-launch.webp
learning_001-three-minute-scan.webp
learning_002-new-term.webp
learning_003-bookmark-heal-pack.webp
learning_004-ai-cheat-sheet.webp
learning_005-one-note.webp
```

`raw` 目录中的 `hydration_002` 源图当前文件名前缀缺少 `h`，输出文件仍使用正确任务 ID。

## Integration

新增一个任务卡插画 manifest，集中维护 `taskCardId -> illustration path` 映射。现有 Dashboard 仍展示当前 4 张今日主线示例卡，但这些路径改为从 manifest 读取，避免后续页面或测试继续散落硬编码。

## Acceptance

- `public/assets/task-cards/illustrations/` 下有 20 张 WebP 插画。
- `TASK_CARDS` 中每个 `id` 都能在 manifest 找到对应插画。
- manifest 中每条路径都指向存在的文件。
- 相关静态测试通过。
- 抽样视觉检查能确认新增图没有裁到完整卡牌 UI 的标题、标签或操作区。
