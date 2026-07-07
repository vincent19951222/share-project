# 牛马补给站 AI 生图 Theme 更新示例

> 用途：后续替换 `theme-01` 到 `theme-13` 时，把标题、tag、prompt、封面图需求和生成结果集中写在这里。  
> 约定：`themeId` 尽量保持不变，只替换同一个 theme 的展示信息和生图配置。

## 使用方式

每次更新一个 theme 时，复制下面的 `Theme 配置包模板`，填好后交给 Codex 执行即可。

如果只是先试 prompt，可以只填 `themeId` 和 `promptTemplate`，其他字段保持当前配置。  
如果是正式替换，建议同时提供：

- 标题 `name`
- 描述 `description`
- 标签 `tag`
- 服务端 prompt `promptTemplate`
- 封面图生成要求 `coverImageRequest`
- 封面图最终 URL `previewImageUrl`，如果还没有，可以留空让 Codex 自动生成、转 WebP、上传 COS 后补齐

## Theme 配置包模板

```yaml
themeId: theme-01
status: draft

name: ""
description: ""
tag: ""
palette:
  - "#fde047"
  - "#1f2937"
  - "#f8fafc"

defaultUnlocked: true
enabled: true
sortOrder: 1

promptTemplate: |
  Write the server-side image generation prompt here.
  This prompt should describe the visual style, subject, composition, mood, constraints, and what to avoid.

coverImageRequest: |
  Describe the cover image to generate for this theme card.
  Mention style, aspect ratio, key objects, background, and whether it should avoid readable text.

previewImageUrl: ""
coverCosKey: ""
coverGeneratedAt: ""

notes: |
  Optional notes for why this theme is being changed, what old theme it replaces, or what visual direction matters.
```

## Example: theme-01 正式替换

```yaml
themeId: theme-01
status: ready

name: "牛马像素馆"
description: "把照片或文字变成粗边框像素健身角色。"
tag: "像素"
palette:
  - "#fde047"
  - "#1f2937"
  - "#f8fafc"

defaultUnlocked: true
enabled: true
sortOrder: 1

promptTemplate: |
  8-bit pixel art fitness poster, chunky black outlines, bold yellow and charcoal blocks,
  playful Chinese fitness team energy, clean composition, confident workout character,
  gym props, no readable text, no brand logos, no watermark.

coverImageRequest: |
  Generate a square theme card cover for a Chinese fitness check-in app.
  The image should show one playful pixel-art workout character in a yellow and charcoal gym scene,
  with chunky black outlines and clean composition. Avoid readable text, brand logos, and watermarks.

previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/example-theme-01.webp"
coverCosKey: "share-project/ai-theme-covers/theme-01/example-theme-01.webp"
coverGeneratedAt: "2026-07-07T00:00:00+08:00"

notes: |
  这是示例配置。正式替换时，previewImageUrl 和 coverCosKey 应使用实际生成并上传 COS 后的结果。
```

## 自动化目标

可以做成半自动或全自动流程。

### 半自动流程

1. 你在本文档里填 `themeId`、`name`、`description`、`tag`、`promptTemplate` 和 `coverImageRequest`。
2. Codex 调用生图能力生成封面候选图。
3. Codex 把封面图转成 WebP。
4. Codex 上传到 COS，拿到 `previewImageUrl` 和 `coverCosKey`。
5. Codex 更新 `lib/gamification/ai-image/themes.ts` 里的对应 theme。
6. Codex 跑 theme 相关测试，确认 prompt 不会进入前台 snapshot。

### 全自动流程

后续可以新增一个脚本，例如：

```bash
npm run supply:theme:update -- docs/supply-ai-theme-update-example.md theme-01
```

脚本可以负责：

- 读取本文档里的 YAML 配置包
- 校验 `themeId` 是否存在
- 校验必填字段是否齐全
- 如果 `previewImageUrl` 为空，则根据 `coverImageRequest` 自动生成封面
- 自动转 WebP 并上传 COS
- 回写 `previewImageUrl` 和 `coverCosKey`
- 更新 `lib/gamification/ai-image/themes.ts`
- 运行相关测试

## 执行验收

正式更新后至少确认：

- 目标 `themeId` 没变
- 前台 theme 卡片显示新的标题、描述、tag 和封面图
- 新生成任务使用新的 `promptTemplate`
- 旧作品和旧任务不被重写
- 前台 snapshot 和 API 响应不暴露 `promptTemplate`
- `npm test -- __tests__/ai-image-themes.test.ts __tests__/ai-image-prompt.test.ts` 通过
