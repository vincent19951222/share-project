# Supply UI Lab 任务 03：护栏与基础组件设计

> 第二阶段任务级 spec，用于定义共享交互基础组件和全局 UI Lab 护栏。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 3。

## 目标

新增测试护栏，确保 6 个 UI Lab 页面都使用第二阶段统一术语；同时让共享基础组件支持受控的本地交互。

## 用户可见变化

- 筛选栏从静态视觉 tab 变成可点击的本地控件。
- 后续页面可以复用同一套分类、日期和状态切换模式。
- 旧术语再次出现在页面上时，会先被测试发现。
- `href="#"` 这类主流程死链接会被测试发现。

## 数据与组件变化

修改：

- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- `__tests__/supply-ui-lab-primitives.test.tsx`

新增：

- `__tests__/supply-ui-lab-static-business-closure.test.tsx`

基础组件变化很小但很关键：`SupplyUiLabFilterBar` 支持可选的 `onSelect(id)` 回调。

全局护栏测试会渲染 6 个 UI Lab scene component，并检查这些禁止出现的页面文案：

- `补给券`
- `生命票`
- `体力`
- `扩容`
- `帮助中心`
- `意见反馈`
- `设置`

## 非目标

- 不把所有页面专属交互都塞进共享基础组件。
- 不修改生产 UI 组件。
- 不要求全局护栏测试在本任务立刻通过；后续页面任务会逐步让它通过。

## 验收标准

- 共享基础组件测试通过。
- 全局护栏测试已存在，并在页面清理任务完成前保持失败。
- 筛选控件能调用 `onSelect`。
- 生产代码不引用 UI Lab 护栏测试辅助内容。

## 关联计划

具体实现步骤见以下总计划的任务 3：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
