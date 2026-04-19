# 故障排除指南

## Next.js ENOENT 错误：pages/_document.js 不存在

### 错误信息
```
ENOENT: no such file or directory, open 'e:\Projects\share-project\.next\server\pages\_document.js'
Next.js version: 15.5.15 (Webpack)
```

### 根本原因
这是一个 **Next.js 构建缓存不一致** 问题：
- `.next` 构建目录包含过时的路由器架构引用
- `pages-manifest.json` 引用了不存在的 Pages Router 文件（`pages/_document.js`）
- 项目实际使用的是 App Router（`app/` 目录），而不是 Pages Router

### 解决方案
**清理构建缓存并重新构建：**

```bash
# 1. 停止开发服务器（如果正在运行）
# Ctrl+C

# 2. 删除 .next 构建目录
rm -rf .next

# 3. 重新构建项目
npm run build

# 4. 重启开发服务器
npm run dev
```

### 为什么会发生这种情况？

**常见触发原因：**
1. Next.js 版本升级
2. 从 Pages Router 迁移到 App Router
3. 在不同配置环境下构建项目
4. .next 目录在 Git 不同分支间切换
5. 构建过程被中断

**技术细节：**
- Next.js 15 默认使用 App Router
- 但构建缓存可能包含旧版本的架构引用
- 当 Webpack 尝试加载过时的 manifest 文件时，会导致 ENOENT 错误

### 预防措施

**1. 确保 .gitignore 包含：**
```
.next/
node_modules/
```

**2. 在切换 Git 分支后：**
```bash
# 总是清理构建缓存
rm -rf .next
npm run dev
```

**3. 在升级 Next.js 版本后：**
```bash
# 清理所有缓存
rm -rf .next node_modules
npm install
npm run dev
```

### 验证修复

修复后，你应该看到：
- ✅ 开发服务器正常启动（通常 2-3 秒）
- ✅ 没有任何 ENOENT 错误
- ✅ 页面正常编译
- ✅ 所有品牌本土化内容正常显示

### 相关文档
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Build Cache](https://nextjs.org/docs/app/building-your-application/caching)

---

## 其他常见问题

### 端口已被占用
```
⚠ Port 3000 is in use by process <PID>, using available port 3007 instead.
```

**解决方案：** Next.js 会自动选择可用端口，无需手动处理。

### TypeScript 错误
```bash
# 清理并重新构建
rm -rf .next
npm run dev
```

### 样式不生效
```bash
# 清理浏览器缓存和构建缓存
rm -rf .next
npm run dev
# 然后在浏览器中硬刷新（Ctrl+Shift+R）
```