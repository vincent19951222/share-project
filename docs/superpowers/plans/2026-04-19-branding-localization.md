# 品牌本土化实施计划 - 脱脂牛马

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将产品品牌从 "Room Todo" 更改为 "脱脂牛马"，并将界面文本中文化，打造健身团队专属的协作打卡平台

**Architecture:** 通过全局文本替换的方式，在不改变组件结构和样式的情况下，更新品牌名称和界面文本。这是一个纯粹的文本替换任务，不涉及逻辑变更或功能修改。

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4.0

---

## 文件结构

本实施计划涉及修改以下文件：

**需要修改的文件：**
- `app/layout.tsx` - 更新页面标题和元数据
- `components/navbar/Navbar.tsx` - 更新品牌名称显示
- `components/punch-board/TeamHeader.tsx` - 更新界面文本字段

**文件职责：**
- `app/layout.tsx` - 负责根布局和页面元数据
- `components/navbar/Navbar.tsx` - 负责导航栏和品牌展示
- `components/punch-board/TeamHeader.tsx` - 负责打卡板头部的团队统计信息

---

## Task 1: 更新页面标题和元数据

**Files:**
- Modify: `app/layout.tsx:4-7`

- [ ] **Step 1: 更新 metadata 对象中的 title 和 description**

```typescript
export const metadata: Metadata = {
  title: "脱脂牛马 - 团队打卡看板",
  description: "脱脂牛马团队协同打卡与战报看板",
};
```

- [ ] **Step 2: 启动开发服务器验证标题更改**

```bash
npm run dev
```

在浏览器中打开 http://localhost:3000，检查浏览器标签页是否显示 "脱脂牛马 - 团队打卡看板"

- [ ] **Step 3: 提交更改**

```bash
git add app/layout.tsx
git commit -m "feat: 更新页面标题为'脱脂牛马'"
```

---

## Task 2: 更新导航栏品牌名称

**Files:**
- Modify: `components/navbar/Navbar.tsx:35`

- [ ] **Step 1: 将品牌名称从 "ROOM TODO" 更改为 "脱脂牛马"**

```typescript
// 在第35行，将：
          ROOM TODO
// 替换为：
          脱脂牛马
```

完整的代码块应该是：

```typescript
        <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-300 border-2 border-slate-800 rounded-lg flex items-center justify-center shadow-[0_2px_0_0_#1f2937] p-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.box }} />
          </div>
          脱脂牛马
        </div>
```

- [ ] **Step 2: 在浏览器中验证品牌名称显示**

确保开发服务器正在运行（`npm run dev`），在浏览器中查看左上角的品牌标识是否显示为 "脱脂牛马"

- [ ] **Step 3: 提交更改**

```bash
git add components/navbar/Navbar.tsx
git commit -m "feat: 更新导航栏品牌名称为'脱脂牛马'"
```

---

## Task 3: 更新团队金库文本

**Files:**
- Modify: `components/punch-board/TeamHeader.tsx:20`

- [ ] **Step 1: 将 "Team Vault" 更改为 "牛马金库"**

```typescript
// 在第20行，将：
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">Team Vault</span>
// 替换为：
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
```

完整的代码块应该是：

```typescript
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
          <div className="text-2xl font-extrabold flex items-baseline gap-1">
            {state.teamCoins.toLocaleString()}
          </div>
        </div>
```

- [ ] **Step 2: 在浏览器中验证团队金库文本显示**

刷新浏览器页面，检查团队总积分上方的标签是否显示为 "牛马金库"

- [ ] **Step 3: 提交更改**

```bash
git add components/punch-board/TeamHeader.tsx
git commit -m "feat: 将'Team Vault'更改为'牛马金库'"
```

---

## Task 4: 更新今日脱脂率文本

**Files:**
- Modify: `components/punch-board/TeamHeader.tsx:42`

- [ ] **Step 1: 将 "Today's Rate" 更改为 "今日脱脂率"**

```typescript
// 在第42行，将：
        <span className="text-[10px] font-bold text-sub tracking-wider uppercase">Today&apos;s Rate</span>
// 替换为：
        <span className="text-[10px] font-bold text-sub tracking-wider uppercase">今日脱脂率</span>
```

完整的代码块应该是：

```typescript
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-sub tracking-wider uppercase">今日脱脂率</span>
        <div className="text-2xl font-extrabold text-main">
          <span>{todayPunchedCount}</span>
          <span className="text-lg text-slate-300">/{state.members.length}</span>
        </div>
      </div>
```

- [ ] **Step 2: 在浏览器中验证今日脱脂率文本显示**

刷新浏览器页面，检查今日打卡统计上方的标签是否显示为 "今日脱脂率"

- [ ] **Step 3: 提交更改**

```bash
git add components/punch-board/TeamHeader.tsx
git commit -m "feat: 将'Today's Rate'更改为'今日脱脂率'"
```

---

## Task 5: 更新周目标描述文本

**Files:**
- Modify: `components/punch-board/TeamHeader.tsx:28-31`

- [ ] **Step 1: 将 "WEEKLY QUEST" 更改为 "本周牛马放纵餐"**

```typescript
// 在第28-31行，将：
          <span className="text-main flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            WEEKLY QUEST: 星巴克下午茶
          </span>
// 替换为：
          <span className="text-main flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            本周牛马放纵餐: 星巴克下午茶
          </span>
```

- [ ] **Step 2: 在浏览器中验证周目标描述文本显示**

刷新浏览器页面，检查进度条上方的目标描述是否显示为 "本周牛马放纵餐: 星巴克下午茶"

- [ ] **Step 3: 提交更改**

```bash
git add components/punch-board/TeamHeader.tsx
git commit -m "feat: 将'WEEKLY QUEST'更改为'本周牛马放纵餐'"
```

---

## Task 6: 更新积分单位文本

**Files:**
- Modify: `components/punch-board/TeamHeader.tsx:32`

- [ ] **Step 1: 将 "Pts" 更改为 "银子"**

```typescript
// 在第32行，将：
          <span>{state.targetCoins} Pts</span>
// 替换为：
          <span>{state.targetCoins} 银子</span>
```

完整的代码块应该是：

```typescript
        <div className="flex justify-between text-xs font-bold text-sub">
          <span className="text-main flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            本周牛马放纵餐: 星巴克下午茶
          </span>
          <span>{state.targetCoins} 银子</span>
        </div>
```

- [ ] **Step 2: 在浏览器中验证积分单位文本显示**

刷新浏览器页面，检查目标积分旁边的单位是否显示为 "银子"

- [ ] **Step 3: 提交更改**

```bash
git add components/punch-board/TeamHeader.tsx
git commit -m "feat: 将积分单位'Pts'更改为'银子'"
```

---

## Task 7: 完整的视觉验证测试

**Files:**
- No file modifications

- [ ] **Step 1: 启动开发服务器（如果未运行）**

```bash
npm run dev
```

- [ ] **Step 2: 执行完整的视觉检查清单**

在浏览器中打开 http://localhost:3000，逐项验证：

**品牌名称验证：**
- [ ] 浏览器标签页标题显示为 "脱脂牛马 - 团队打卡看板"
- [ ] 左上角品牌标识显示为 "脱脂牛马"
- [ ] 品牌标识的图标和样式正常

**界面文本验证：**
- [ ] 团队积分上方显示 "牛马金库"
- [ ] 今日打卡统计上方显示 "今日脱脂率"
- [ ] 进度条上方显示 "本周牛马放纵餐: 星巴克下午茶"
- [ ] 目标积分单位显示 "银子"

**布局和样式验证：**
- [ ] 所有文本没有溢出或换行问题
- [ ] 中文字体正常显示（Noto Sans SC）
- [ ] 响应式布局在不同屏幕尺寸下正常
- [ ] 颜色和间距保持一致

- [ ] **Step 3: 检查控制台和页面源代码**

打开浏览器开发者工具（F12），检查：
- [ ] 控制台没有错误或警告
- [ ] 页面源代码中的 title 标签正确
- [ ] 所有组件正常渲染

- [ ] **Step 4: 提交最终的验证报告**

创建一个简单的验证报告文件：

```bash
echo "# 品牌本土化验证报告

## 验证日期
$(date +%Y-%m-%d)

## 验证结果
- ✅ 品牌名称更新完成
- ✅ 界面文本中文化完成
- ✅ 布局和样式正常
- ✅ 响应式布局正常
- ✅ 无控制台错误

## 修改总结
- 修改文件数: 3
- 提交次数: 6
- 文本替换项: 6
" > VERIFICATION.md
```

- [ ] **Step 5: 提交验证报告**

```bash
git add VERIFICATION.md
git commit -m "test: 添加品牌本土化验证报告"
```

---

## 完成检查清单

在完成所有任务后，验证以下标准：

**功能完整性：**
- [ ] 所有用户界面文本已更新为中文
- [ ] 产品名称统一为 "脱脂牛马"
- [ ] 没有遗漏的英文界面文本

**视觉质量：**
- [ ] 布局保持正常，没有文本溢出
- [ ] 中文字体正常显示
- [ ] 样式和颜色保持一致

**技术质量：**
- [ ] 所有更改已提交到 git
- [ ] 没有引入新的错误或警告
- [ ] 代码风格保持一致

**用户体验：**
- [ ] 界面文本符合健身团队的文化氛围
- [ ] 产品品牌具有识别度和亲和力
- [ ] 用户界面流畅自然

---

## 预期成果

完成本实施计划后，"脱脂牛马" 将成为一个具有鲜明团队特色的协作打卡平台：

1. **品牌统一**：所有产品触点统一使用 "脱脂牛马" 品牌
2. **文化契合**：界面文本符合健身团队"脱脂牛马"的轻松氛围
3. **体验优化**：中文化界面提升用户使用体验
4. **识别度高**：独特的品牌命名增强团队归属感

---

## 回滚计划

如果需要回滚到原始的英文界面：

```bash
# 回滚到品牌本土化之前的最后一个提交
git log --oneline
# 找到本土化之前的提交 hash
git reset --hard <commit-hash>
```

或者逐步回滚每个更改：

```bash
git revert HEAD~6..HEAD
```