# 品牌本土化设计 - 脱脂牛马

> 将 Room Todo 产品品牌和界面文本中文化，打造健身团队专属的健身打卡平台

## 背景与动机

当前产品使用英文品牌名称 "Room Todo" 和部分英文界面文本，与健身团队"脱脂牛马"的轻松氛围不符。为了更好地贴合用户群体和使用场景，需要将品牌名称和界面文本中文化，增强用户归属感和使用体验。

## 设计决策

| 维度 | 决定 | 原因 |
|------|------|------|
| 产品命名 | 脱脂牛马 | 直接采用团队群名，增强归属感 |
| 界面风格 | 幽默轻松 | 符合健身团队的轻松氛围 |
| 技术日志 | 保持英文 | 维持技术专业性，避免过度翻译 |
| 实施方式 | 全局文本替换 | 改动明确且范围有限，易于验证和回滚 |

## 品牌映射

### 产品名称
| 原文 | 中文 | 位置 |
|------|------|------|
| Room Todo | 脱脂牛马 | 浏览器标题、品牌标识 |

### 界面文本
| 原文 | 中文 | 位置 |
|------|------|------|
| Team Vault | 牛马金库 | 团队积分显示 |
| Today's Rate | 今日脱脂率 | 今日打卡统计 |
| WEEKLY QUEST | 本周牛马放纵餐 | 周目标描述 |
| Pts | 银子 | 积分单位 |

## 实施阶段

### 阶段1：核心品牌名称
**目标：** 更新产品名称为"脱脂牛马"

**修改文件：**
- `app/layout.tsx` - 浏览器标题
- `components/navbar/Navbar.tsx` - 左上角品牌标识

**具体变更：**
```typescript
// app/layout.tsx
title: "脱脂牛马 - 团队打卡看板"

// components/navbar/Navbar.tsx
<div className="font-black text-2xl tracking-tighter flex items-center gap-2">
  <div className="w-8 h-8 bg-yellow-300 border-2 border-slate-800 rounded-lg flex items-center justify-center shadow-[0_2px_0_0_#1f2937] p-1">
    <span dangerouslySetInnerHTML={{ __html: SvgIcons.box }} />
  </div>
  脱脂牛马
</div>
```

### 阶段2：界面文本中文化
**目标：** 将所有用户界面英文字段替换为中文

**修改文件：**
- `components/punch-board/TeamHeader.tsx`

**具体变更：**
```typescript
// 团队金库
<span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>

// 今日脱脂率
<span className="text-[10px] font-bold text-sub tracking-wider uppercase">今日脱脂率</span>

// 本周牛马放纵餐
<span className="text-main flex items-center gap-1">
  <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
  本周牛马放纵餐: 星巴克下午茶
</span>

// 积分单位
<span>{state.targetCoins} 银子</span>
```

### 阶段3：验证和调整
**目标：** 确保所有文本显示正常，没有布局问题

**验证步骤：**
1. 启动开发服务器：`npm run dev`
2. 检查浏览器标题显示为"脱脂牛马 - 团队打卡看板"
3. 检查左上角品牌标识显示为"脱脂牛马"
4. 检查 TeamHeader 各字段显示正确：
   - 牛马金库
   - 今日脱脂率
   - 本周牛马放纵餐
   - 银子
5. 测试响应式布局，确保文本没有溢出或换行问题

## 技术约束

- 不改变现有组件结构和样式
- 不影响现有功能和交互逻辑
- 保持系统日志的技术性英文
- 确保中文字体正常显示（使用 Noto Sans SC）

## 成功标准

1. ✅ 产品名称统一为"脱脂牛马"
2. ✅ 所有用户界面文本使用中文
3. ✅ 布局和样式保持正常
4. ✅ 没有遗漏的英文界面文本
5. ✅ 用户体验流畅，无视觉问题

## 未来扩展

此设计为纯文本替换，不涉及国际化架构。如果未来需要支持多语言切换，可以考虑：
- 建立翻译配置文件
- 引入国际化库（如 next-intl）
- 但当前阶段这种过度设计不必要
