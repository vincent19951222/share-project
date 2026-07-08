# AI 生图 Theme Prompt 准入规范

本文档规定 `lib/gamification/ai-image/themes.ts` 中 theme prompt 的准入流程。外部收集来的生图提示词不能直接进入项目，必须先完成结构化 reconstruct。

## 核心原则

theme 负责生成行为和视觉方向，用户只需要提供两类输入：

- 参考图
- 用户额外补充输入

服务端 prompt 必须解释这两类输入如何参与生成，并明确冲突时的优先级。

## templateKind

`templateKind` 表示生成行为，不表示视觉风格。

当前允许值：

- `reference_edit`：保留参考图结构，在图上做叠加、编辑或拼贴。
- `reference_transform`：基于参考图主体重绘成另一种风格。
- `creative_poster`：基于参考图主体生成创意海报，允许重构构图、背景和镜头。
- `scene_generation`：主要依赖主题和用户描述直接生成场景。
- `asset_generation`：生成贴纸、拼豆图纸、头像、素材包等资产型输出。

不要因为视觉风格新增 `templateKind`。例如日系动漫、赛博健身、旅行手账、冷感时装都属于具体 theme 或 style rules。

只有当参考图使用方式、prompt 拼装结构、UI 提示、输出物类型或 provider 调用方式发生变化时，才新增 `templateKind`。

## 标准 prompt sections

结构化 theme 必须填写以下 sections：

1. `taskGoal`：任务目标。
2. `inputFit`：输入适配，说明适合和不适合的参考图。
3. `referenceRules`：参考图使用规则，说明保留什么、允许改什么。
4. `styleRules`：固定视觉风格。
5. `compositionRules`：固定画面规则。
6. `userPromptRules`：用户额外需求的作用边界。
7. `conflictRules`：参考图、主题和用户补充冲突时的优先级。
8. `qualityRules`：输出质量要求。
9. `negativeRules`：限制条件。

编译后的 prompt 会自动插入：

```txt
【用户额外需求】
{{user_instruction}}
```

运行时由 `buildPromptSnapshot()` 将 `{{user_instruction}}` 替换为用户补充输入。参考图不使用文本占位符，因为参考图已经作为图像输入传给生图服务。

## 外部 prompt reconstruct 流程

每个外部 prompt 进入项目之前，按以下顺序处理：

1. 保留原始 prompt 作为分析材料。
2. 去样张化：删除固定人物身份、固定性别、固定发色、固定服装、固定姿势和固定背景。
3. 判断 `templateKind`。
4. 判断 `referencePolicy`。
5. 填写 `bestFor` 和 `avoidFor`。
6. 拆分进标准 prompt sections。
7. 明确用户额外输入可以修改什么。
8. 明确用户额外输入不能覆盖什么。
9. 加入冲突处理规则。
10. 加入限制条件。
11. 写测试断言关键字段、关键 prompt 段落和危险样张词已经移除。

## 新 theme 准入检查

提交新 theme 前，必须能回答这些问题：

- 它属于哪个 `templateKind`？
- 它是否需要参考图？
- 它最适合什么输入？
- 它不适合什么输入？
- 用户额外输入可以修改什么？
- 用户额外输入不能覆盖什么？
- 参考图和用户输入冲突时谁优先？
- 是否仍然包含外部样张里的固定人物、固定姿势或固定服装？

## 优先级

生成时遵循以下优先级：

```txt
参考图身份和关键细节 > 主题核心意图 > 用户额外补充 > 风格细节
```

如果 theme 是 `scene_generation` 且 `referencePolicy` 为 `optional`，参考图身份保留规则可以弱化，但必须在 `inputFit` 和 `referenceRules` 中写清楚。
