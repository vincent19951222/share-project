# Supply UI Lab 任务 10：验证设计

> 第二阶段任务级 spec，用于定义最终验证和浏览器 QA。本文对应 `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md` 中的任务 10。

## 目标

验证第二阶段静态 mock 业务闭环在 6 个 UI Lab 页面、测试、TypeScript、构建和浏览器 QA 中都成立。

## 用户可见变化

本任务不应该引入新的产品行为，只验证前 9 个任务能一起工作。

用户应该能够：

- 打开全部 6 个 UI Lab 页面；
- 在页面之间跳转；
- 点击本地筛选、tab、按钮和 mock 操作；
- 看到一致的术语和道具数据；
- 在桌面和移动端宽度下使用页面，不出现明显重叠或溢出。

## 验证范围

运行 focused tests，覆盖：

- 路由；
- mock data；
- 素材；
- scene 渲染；
- CSS 契约；
- 共享基础组件；
- 共享 catalog；
- 全局第二阶段护栏。

运行：

- `npm run lint`
- `npm run build`
- 本地开发服务器浏览器 QA

浏览器 QA 路由：

- `/ui-lab/supply-dashboard`
- `/ui-lab/supply-dashboard/team-goal`
- `/ui-lab/supply-dashboard/shop`
- `/ui-lab/supply-dashboard/task-record`
- `/ui-lab/supply-dashboard/draw-pool`
- `/ui-lab/supply-dashboard/backpack`

## 非目标

- 不在验证阶段新增第二阶段功能。
- 不修改生产 `SupplyStation`。
- 不用测试快照或脆弱视觉检查替代浏览器 QA。
- 不把无关 dirty worktree 改动混进验证提交。

## 验收标准

- 所有 focused Supply UI Lab tests 通过。
- `npm run lint` 通过。
- `npm run build` 通过。
- `1536 x 1024` 和约 `390 x 844` 视口的浏览器 QA 通过。
- 渲染结果中不再有禁用术语：`补给券`、`生命票`、`体力`、`扩容`、`帮助中心`、`意见反馈`、`设置`。
- 不再保留主流程 `href="#"` 死链接。
- 6 个路由的 console 没有错误。
- 如有验证修复，需要单独提交，并精确 stage 对应文件。

## 关联计划

具体实现步骤见以下总计划的任务 10：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
