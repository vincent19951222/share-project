# User Avatar System Design

**Date:** 2026-04-18
**Status:** Approved

## Overview

用 8 张预设 PNG 头像取代现有 SVG 内联头像，实现登录即注册的流程（用户在登录页选择头像+设置用户名+密码自动创建账号），并在右上角 ProfileDropdown 支持编辑头像和用户名。

## Requirements

1. 8 张预设头像（male1-4, female1-4）放在 `public/avatars/`，数据库存 key
2. 登录页支持注册模式：用户名 + 密码 + 头像选择（2x4 网格）
3. 复用 login API，根据用户名是否存在自动判断登录/注册
4. Navbar 头像用 `<img>` 展示 PNG
5. 右上角可编辑头像和用户名（Modal 弹窗）
6. 注册时头像必选

## Data Layer

### Schema

无结构变更。`User.avatarKey` 字段值域从 SVG key 改为图片 key：

- `male1`, `male2`, `male3`, `male4`
- `female1`, `female2`, `female3`, `female4`

### Avatar Files

- 源文件：`design/male1.png` ~ `design/female4.png`
- 部署到：`public/avatars/male1.png` ~ `public/avatars/female4.png`
- 前端映射常量在 `lib/avatars.ts`：

```ts
export const AVATAR_OPTIONS = [
  { key: "male1", label: "男生 1", url: "/avatars/male1.png" },
  { key: "male2", label: "男生 2", url: "/avatars/male2.png" },
  { key: "male3", label: "男生 3", url: "/avatars/male3.png" },
  { key: "male4", label: "男生 4", url: "/avatars/male4.png" },
  { key: "female1", label: "女生 1", url: "/avatars/female1.png" },
  { key: "female2", label: "女生 2", url: "/avatars/female2.png" },
  { key: "female3", label: "女生 3", url: "/avatars/female3.png" },
  { key: "female4", label: "女生 4", url: "/avatars/female4.png" },
] as const;

export type AvatarKey = (typeof AVATAR_OPTIONS)[number]["key"];

export function getAvatarUrl(key: string): string {
  return AVATAR_OPTIONS.find((a) => a.key === key)?.url ?? "/avatars/male1.png";
}
```

### Seed Data

`lib/db-seed.ts` 中 SEED_USERS 的 avatarKey 更新为新 key（如 male1, female1 等）。

## Login/Register Flow

### UI: LoginForm Component

- 新增 `mode` state: `"login" | "register"`
- **登录模式**：用户名 + 密码（现有）
- **注册模式**：用户名 + 密码 + 头像选择器
- 底部切换：登录模式 → "新用户？创建账号"；注册模式 → "已有账号？登录"

### Avatar Picker

- 2 行 4 列网格，第一行 male1-4，第二行 female1-4
- 选中项高亮：brutalist 风格粗黑边框 + 阴影
- 注册模式下必选，不选不能提交

### API: POST /api/auth/login

复用现有 login API，扩展逻辑：

```
1. 接收 { username, password, avatarKey? }
2. 查找用户：
   a. 用户存在 → 验证密码 → 登录成功（忽略 avatarKey）
   b. 用户不存在 + avatarKey 存在 → 创建用户 → 登录成功
   c. 用户不存在 + avatarKey 缺失 → 返回错误 "请选择头像"
3. 设置 cookie，返回 user 数据
```

创建用户时默认加入第一个 team（或需要指定 teamId，当前只有一个 team）。

## Navbar Avatar Display

### Type Change

`lib/types.ts` 中 `Member` 接口：

```ts
export interface Member {
  id: string;
  name: string;
  avatarKey: string;  // was avatarSvg
}
```

### Layout

`app/(board)/layout.tsx` 中构建 members 时传 avatarKey 而非 avatarSvg：

```ts
const members = team.users.map((u) => ({
  id: u.id,
  name: u.username,
  avatarKey: u.avatarKey,
}));
```

### Navbar Component

`components/navbar/Navbar.tsx` 中头像区域从 `dangerouslySetInnerHTML` 改为：

```tsx
<img src={getAvatarUrl(currentMember.avatarKey)} className="w-full h-full rounded-full object-cover" />
```

### Store / Grid Logs

`lib/store.tsx` 中 PUNCH 和 SIMULATE_REMOTE_PUNCH 的 log text 不再嵌入 avatarSvg HTML，改为用 avatarKey 引用或直接用 name。

## Profile Editing

### EditProfileModal Component

新增 `components/profile/EditProfileModal.tsx`：

- Modal 弹窗，包含用户名输入框 + 头像 8 宫格选择器 + 保存按钮
- 打开时加载当前用户的 username 和 avatarKey
- 保存调用 `PATCH /api/user/profile`

### API: PATCH /api/user/profile

新增 `app/api/user/profile/route.ts`：

```
1. 从 cookie 获取 userId
2. 接收 { username?, avatarKey? }
3. 验证 username 唯一性（如果修改了用户名）
4. 更新 DB
5. 返回更新后的 user 数据
```

### ProfileDropdown Integration

在 `components/navbar/ProfileDropdown.tsx` 新增 "编辑资料" 按钮，点击打开 EditProfileModal。保存后刷新页面。

## Files Changed

| File | Change |
|------|--------|
| `lib/avatars.ts` | **New** - avatar mapping constants |
| `lib/types.ts` | `Member.avatarSvg` → `Member.avatarKey` |
| `lib/db-seed.ts` | avatarKey values updated |
| `lib/store.tsx` | log text 不再嵌入 avatarSvg |
| `components/login/LoginForm.tsx` | 新增注册模式 + 头像选择器 |
| `components/navbar/Navbar.tsx` | 头像改为 `<img>` |
| `components/navbar/ProfileDropdown.tsx` | 新增编辑资料入口 |
| `components/profile/EditProfileModal.tsx` | **New** - 编辑弹窗 |
| `components/ui/SvgIcons.tsx` | 移除头像 SVG (alen/bob/cindy/dave/eva) |
| `app/api/auth/login/route.ts` | 增加注册逻辑 |
| `app/api/user/profile/route.ts` | **New** - PATCH 更新用户资料 |
| `app/(board)/layout.tsx` | 传递 avatarKey |
| `public/avatars/` | **New** - 8 张 PNG 头像 |
