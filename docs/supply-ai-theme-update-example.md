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

## Example: theme-01 当前配置

```yaml
themeId: theme-01
status: ready

name: "互动照片涂鸦"
description: "保留原照片主体，在画面上加入会互动的手绘涂鸦和俏皮手写感元素。"
tag: "涂鸦"
palette:
  - "#fef3c7"
  - "#111827"
  - "#38bdf8"

defaultUnlocked: true
enabled: true
sortOrder: 1

promptTemplate: |
  分析上传的图像并保留其原始主体、构图和光影。请勿改变主体身份或结构。
  添加生动的手绘涂鸦，使其与图像中的主体产生直接互动。涂鸦应模仿、跟随或夸张地表现图像中现有的形状、姿态或动作，例如勾勒姿势、延伸肢体、添加运动线条，或创作与主体互动的创意元素。

  确保涂鸦自然地融入场景，就像是在照片上精心绘制的一样。使用带有有机线条、略显不均匀笔触和随性插画感的素描手绘风格。在图像周围加入异想天开的手写文字元素。文字应与场景的氛围或隐含语境相符，并保持俏皮、随性的基调。

  避免使用固定短语，应根据每张图像的独特性，生成具有情境感、创意且幽默的文字。保持构图平衡，使涂鸦在增强图像表现力的同时，不会喧宾夺主。整体美学风格应保持有趣、富有表现力且适合社交媒体分享。要求高分辨率、清晰的叠加效果，以及鲜明而自然的色彩协调。

coverImageRequest: |
  Generate a square theme card cover for a Chinese fitness check-in app feature called interactive photo doodle.
  Create an editorial photo-like gym snapshot with one central person in workout posture, then overlay lively hand-drawn doodles that directly interact with the subject: sketch outlines following the pose, motion lines, arrows, playful sparks, extended limb gesture trails, small whimsical hand-drawn notes as abstract scribbles only.
  The doodles should look carefully drawn on top of the photo, organic uneven pen strokes, casual illustration feel, bright but natural color harmony.
  Balanced composition, social-media-shareable, high resolution, crisp overlay effect.
  Avoid readable text, logos, watermarks, UI, frames, heavy blur, or changing the subject into a cartoon.

previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-01-interactive-photo-doodle.webp"
coverCosKey: "images/theme-01-interactive-photo-doodle.webp"
coverGeneratedAt: "2026-07-07T22:53:04+08:00"

notes: |
  这是第一轮正式替换配置。封面图已转 WebP 并上传 COS，远端返回 Content-Type: image/webp。
```

## Example: theme-02 当前配置

```yaml
themeId: theme-02
status: ready

name: "冷感时装肖像"
description: "以固定参考人像生成高级时尚杂志质感的冷色调全身棚拍肖像。"
tag: "时尚"
palette:
  - "#f8fafc"
  - "#111827"
  - "#cbd5e1"

defaultUnlocked: true
enabled: true
sortOrder: 2

referenceImageSource: "docs/female1.jpg"

promptTemplate: |
  超写实高级时尚杂志风格工作室肖像，一位年轻女性居中站立，全身视角，直视镜头，表情冷静、严肃且略带威慑力，眼神深邃。
  留着长发，银灰金色，发根颜色较深，自然微卷且略显凌乱，中分，垂至肩下。
  肤色苍白，面部轮廓分明，妆容自然精致，皮肤纹理真实，浅色瞳孔。
  她穿着一件超大廓形黑色机能风街头 T 恤，带有精致的白色滚边装饰，胸前印有小型未来感白色 Logo，搭配宽松的黑色工装裤。
  配饰包括双手佩戴的多枚银戒指、一条带有十字架吊坠的细银项链，以及一只精致的银手镯。
  双手随意插在口袋中。姿态放松，站姿挺拔，极简风格。
  拍摄于无缝的白至浅灰色工作室环境，背景为干净的渐变色，主体上方留有大面积负空间。
  强劲的漫射背光在头发和肩部周围营造出明亮的光晕，结合柔和的正面补光，既保留了面部细节又保持了柔和的阴影。
  冷色调单色分级，对比度细腻，电影质感，斯堪的纳维亚极简主义，奢华街头服饰广告美学。
  专业时尚摄影，中画幅相机，85mm 镜头，平视角度，对称构图，全身取景，垂直肖像构图 9:16，焦点精准聚焦于双眼，发丝细节清晰，布料褶皱与纹理真实，自然皮肤毛孔，HDR，高级杂志精修，奢华杂志封面品质，照片级真实，超写实，8K 分辨率，时尚 Lookbook，当代赛博极简主义美学。

coverImageRequest: |
  Use docs/female1.jpg as the identity and face reference for an adult woman.
  Create a vertical high-fashion studio lookbook portrait cover.
  Preserve the reference person's facial identity cues, delicate facial features, long dark hair impression, calm direct gaze, and serious restrained mood, while transforming the image into a hyper-realistic luxury fashion magazine studio portrait.
  Full-body centered standing pose, hands casually in pockets, oversized black technical streetwear T-shirt with white piping, loose black cargo pants, silver accessories, seamless white-to-light-gray studio background, large negative space above subject, strong diffused backlight halo, soft frontal fill, cold monochrome grading, luxury streetwear advertising aesthetic.
  Avoid readable text, watermarks, UI, extra people, distorted hands, and over-sexualized pose.

previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-02-cold-fashion-portrait.webp"
coverCosKey: "images/theme-02-cold-fashion-portrait.webp"
coverGeneratedAt: "2026-07-07T23:10:05+08:00"

notes: |
  这是第二轮正式替换配置。封面图已基于 docs/female1.jpg 生成、转 WebP 并上传 COS，远端返回 Content-Type: image/webp。
  当前运行时代码还没有 theme-level reference image 字段；referenceImageSource 先作为配置记录存在。
```

## Example: theme-03 当前配置

```yaml
themeId: theme-03
status: ready

name: "像素拼豆图纸"
description: "把参考人像转换成带编号色板和 45x45 网格的专业 2D 拼豆设计图纸。"
tag: "拼豆"
palette:
  - "#f8fafc"
  - "#0f172a"
  - "#60a5fa"

defaultUnlocked: true
enabled: true
sortOrder: 3

referenceImageSource: "docs/female1.jpg"

promptTemplate: |
  以参考图中的人物为主体，生成一个专业的 2D 拼豆图案设计图纸。
  画布左侧有一个垂直的色板/图例，展示带有准确编号（例如 #01、#02）的颜色方块。
  画布的主要区域显示主体的全身像素风角色。
  该角色必须在完美的 45x45 网格矩阵中呈现。
  每个拼豆像素必须具有清晰、干净、不模糊的边界。
  清爽的 2D 精灵图，蓝图风格，白色背景，高技术细节，独立设计。
  尽量保留参考人物的发型、面部气质、服装方向和整体辨识度，但输出必须是拼豆图纸而不是写实照片。

coverImageRequest: |
  Use docs/female1.jpg as the person reference.
  Create a professional 2D pixel bead pattern blueprint design sheet for a theme card cover.
  The canvas should have a vertical color palette legend on the left with numbered swatches like #01, #02, #03, and a main 45x45 grid matrix showing a full-body pixel-art character inspired by the reference woman's facial impression and long dark hair.
  Every bead pixel should have sharp, clean, non-blurry boundaries, like a perler bead or pixel craft pattern.
  Clean 2D sprite style, blueprint / design document feeling, white background, high technical detail, standalone design sheet.
  Avoid watermark, logo, UI mockup, realistic photo rendering, messy blur, and extra people.

previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-03-pixel-bead-blueprint.webp"
coverCosKey: "images/theme-03-pixel-bead-blueprint.webp"
coverGeneratedAt: "2026-07-07T23:21:33+08:00"

notes: |
  这是第三轮正式替换配置。封面图已基于 docs/female1.jpg 生成、转 WebP 并上传 COS，远端返回 Content-Type: image/webp。
  当前运行时代码还没有 theme-level reference image 字段；referenceImageSource 先作为配置记录存在。
```

## Example: theme-04 当前配置

```yaml
themeId: theme-04
status: ready

name: "旅行手账拼贴"
description: "保留旅行照片底图，叠加同一人物的 Q 版迷你分身、贴纸和手写旅行笔记。"
tag: "旅行"
palette:
  - "#ffffff"
  - "#f9a8d4"
  - "#60a5fa"

defaultUnlocked: true
enabled: true
sortOrder: 4

referenceImageSource: "docs/female1.jpg"

promptTemplate: |
  将上传的旅行照片转换为趣味十足的旅行手账风格 Q 版拼贴画，同时保留原始照片作为底图。
  保持原始照片的可辨识度和结构完整性。保留照片中人物的面部特征、表情、体型、姿势、服装、光影以及真实的背景。
  请勿替换人物、更改其身份、重绘面部或改变真实的旅行场景。编辑效果应呈现出插画和手账元素叠加在真实照片之上的质感。
  添加 4 到 7 个上传照片中人物的可爱 Q 版迷你形象。每个迷你角色都应基于同一个人，保持一致的面部特征、发型、服装细节和整体个性。
  使用大头 Q 版比例、生动的表情、精致的细节以及轻盈的卡通渲染效果。
  让每个迷你角色做出不同的自然旅行动作，例如拍照、边走边看、看地图、查看导航、拉行李箱、喝咖啡、欣赏风景、在景点旁摆姿势、蹲下观察花朵或街道细节、用手机拍摄、头发被风吹起、因迷路而四处张望或开心地跳跃。
  叠加手绘涂鸦、手写笔记和贴纸般的细节，营造出轻松的旅行手账风格。
  主要使用白色和柔和的粉色作为点缀，线条采用略显不规则的手绘风格。
  包含箭头、星星、爱心、闪光、小飞机、定位图标、虚线路线、手绘圆圈、胶带纸、贴纸以及细小的装饰符号。
  添加 3 到 6 个与旅行心情和回忆相关的简短中文手写短语，每次随机更换不同的短语，避免使用固定组合。
  中文短语应简短、自然、有生活感，每条控制在 4 到 10 个汉字，避免长句、书面语和宣传口号感。
  确保中文文字清晰可读，避免错别字、乱码、重复字符和笔画粘连。
  最终图像应呈现出轻盈、治愈、通透、可爱且放松的氛围，并带有自由感和旅行怀旧感。
  观众应首先将其识别为一张真实的旅行照片，随后注意到迷人的 Q 版角色和手账细节。

coverImageRequest: |
  Use docs/female1.jpg as the main person reference.
  Create a vertical 9:16 travel scrapbook style chibi collage cover for a Chinese app theme card.
  Keep a recognizable real-photo travel snapshot base, then add 4 to 7 cute chibi mini versions of the same person around the photo.
  Each mini character should share the same face impression, long dark hair, clothing cues, and personality, with different travel actions such as taking photos, looking at a map, pulling luggage, drinking coffee, using phone navigation, admiring scenery, or happily jumping.
  Overlay hand-drawn travel diary details: white and soft pink accents, irregular lines, arrows, stars, hearts, sparkles, tiny airplane, location pin, dotted route, tape strips, stickers, and small decorative symbols.
  Add 3 to 4 short readable Chinese handwritten phrases, each 4-8 Chinese characters, such as 随便走走, 慢慢看, 去远方, 把今天收藏.
  Avoid watermark, logo, UI frame, messy collage overload, long text, garbled text, and duplicate characters.

previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-04-travel-journal-chibi-collage.webp"
coverCosKey: "images/theme-04-travel-journal-chibi-collage.webp"
coverGeneratedAt: "2026-07-07T23:44:31+08:00"

notes: |
  这是第四轮正式替换配置。封面图已基于 docs/female1.jpg 生成、转 WebP 并上传 COS，远端返回 Content-Type: image/webp。
  当前运行时代码还没有 theme-level reference image 字段；referenceImageSource 先作为配置记录存在。
```

## Example: theme-05 当前配置

```yaml
themeId: theme-05
status: ready

name: "童趣蜡笔画"
description: "把参考图重绘成 10 岁孩子手绘般的白纸蜡笔幻想插画。"
tag: "蜡笔"
palette:
  - "#ffffff"
  - "#fb7185"
  - "#60a5fa"

defaultUnlocked: true
enabled: true
sortOrder: 5

referenceImageSource: "docs/female1.jpg"

promptTemplate: |
  将给定图片重新创作为蜡笔画风格的插画，使整个画面呈现出 10 岁孩子手绘的效果。
  保留原图主体的基本轮廓、姿态和可辨识气质，但保持造型简洁且略带瑕疵，如同儿童画一般。
  避免使用原始配色，改为在干净的白纸背景上使用明亮、活泼的蜡笔色。
  追求柔和、可爱且纯真的美学风格。
  融入城堡、塔楼、糖果、星星、云朵等充满童趣的细节，以增强画面的趣味性。
  蜡笔笔触应保留颗粒感、涂抹不均和轻微涂出边界的手作痕迹，避免写实阴影、专业插画感或过度精修。
  最终效果应充满魅力、色彩斑斓，并洋溢着孩童般的想象力。

coverImageRequest: |
  Use docs/female1.jpg as the loose main person reference.
  Create a vertical 9:16 theme card cover that re-creates the reference image as a charming crayon-style illustration drawn by a 10-year-old child.
  Preserve the general impression only: young woman, long black hair, large eyes, soft serious expression, white shirt, relaxed pose.
  Use a clean white paper background, visible wax crayon grain, wobbly outlines, simple childlike facial features, imperfect coloring outside the lines, and no realistic shading.
  Surround the person with whimsical childlike details: castle, towers, candy, stars, clouds, hearts, rainbow-like doodles, and floating imagination shapes.
  Avoid photorealistic rendering, dark background, original photo colors, text, watermark, logo, UI frame, polished vector art, and messy clutter.

previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-05-childlike-crayon-fantasy.webp"
coverCosKey: "images/theme-05-childlike-crayon-fantasy.webp"
coverGeneratedAt: "2026-07-08T09:27:59+08:00"

notes: |
  这是第五轮正式替换配置。封面图已基于 docs/female1.jpg 生成、转 WebP 并上传 COS，远端返回 Content-Type: image/webp。
  当前运行时代码还没有 theme-level reference image 字段；referenceImageSource 先作为配置记录存在。
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
