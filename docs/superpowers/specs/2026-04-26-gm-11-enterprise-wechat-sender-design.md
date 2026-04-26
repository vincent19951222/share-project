# GM-11 Enterprise WeChat Sender Foundation Design

> 为后续弱社交提醒、周报推送和运营播报建立一个服务端企业微信机器人发送基础设施。GM-11 只交付 sender、formatter、配置读取、发送日志和管理员测试接口；不创建弱社交邀请，不生成周报，不做企业微信 OAuth 或回调。

## 背景

前面 GM stories 已经把“牛马补给站”的核心经济闭环拆开：任务、抽奖、背包、道具、真实福利逐步落地。接下来 GM-12 要让弱社交道具真正“发出去”，例如点名喝水、出门溜达、全员起立。

用户之前已经确认：这些动作会通过企业微信发出去消息。但企业微信不应该直接散落在 GM-12 业务代码里，否则后续周报、团队播报、真实福利提醒都会重复造轮子。

GM-11 先做一个可复用发送层：

```text
业务事件 -> formatter -> sender -> 企业微信群机器人 webhook
                      -> send log
                      -> structured result
```

核心原则：企业微信是外部通知通道，不是本地业务状态的唯一来源。发送失败默认不回滚本地业务，除非未来某个具体 action 明确要求强一致。

## 上游参考

- `docs/superpowers/specs/2026-04-25-gamification-update-design.md`
- `docs/superpowers/specs/2026-04-25-gamification-card-pools.md`
- `docs/superpowers/specs/2026-04-25-gamification-content-schema.md`
- `docs/superpowers/plans/2026-04-25-gamification-story-roadmap.md`
- `docs/superpowers/specs/2026-04-26-gm-10-real-world-redemption-design.md`

## 产品目标

1. 提供一个服务端企业微信机器人 sender。
2. 支持发送 `text` 和 `markdown` 两种消息。
3. 通过环境变量配置 webhook。
4. 缺少 webhook 配置时返回可解释的 `SKIPPED` 结果，而不是抛 500。
5. 企业微信 HTTP 失败、网络失败、返回 `errcode != 0` 时返回 `FAILED` 结果。
6. 发送成功、跳过和失败都记录到数据库，方便排查。
7. 管理员可以通过一个测试 API 验证 webhook 是否可用。
8. 后续 GM-12 和 GM-15 可以复用同一个 sender。

## 非目标

- 不实现弱社交邀请创建。
- 不实现周报生成。
- 不实现自动定时任务。
- 不实现企业微信 OAuth。
- 不实现企业微信回调、命令解析或用户身份绑定。
- 不做团队级 webhook 配置后台。
- 不把 webhook URL 暴露给客户端。
- 不在 GM-11 做可见 UI。
- 不要求企业微信发送成功后才允许本地业务成功。

## 配置策略

第一版使用环境变量：

```text
ENTERPRISE_WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

规则：

- 只在服务端读取。
- 不使用 `NEXT_PUBLIC_` 前缀。
- 缺少或空字符串时，sender 返回 `SKIPPED / MISSING_WEBHOOK_CONFIG`。
- webhook URL 不写入发送日志。
- webhook URL 不通过 API 返回。

为什么不先做后台配置：

- 当前用户少、团队少，全局机器人足够。
- 后台配置会引入密钥保存、权限、加密和误操作问题。
- GM-11 的目标是为 GM-12 解锁通道，不是做完整集成管理平台。

后续如果需要多团队不同群，可以把配置源扩展为：

```text
Team -> EnterpriseWechatConfig -> fallback env
```

但 GM-11 不做。

## 消息类型

### text

适合短提醒：

```text
【牛马补给站】luo 点名 li 喝水
今天的尿色 KPI 靠你守住了。
```

企业微信 payload：

```json
{
  "msgtype": "text",
  "text": {
    "content": "消息内容"
  }
}
```

GM-11 不做成员手机号或 userid 映射，因此第一版不支持精准 `mentioned_mobile_list`。

### markdown

适合周报、列表、结构化提醒：

```markdown
**牛马补给站提醒**
> luo 发起了出门溜达令
请站起来走一圈，让工位以为你离职了。
```

企业微信 payload：

```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "markdown 内容"
  }
}
```

## Sender 接口

推荐服务函数：

```ts
sendEnterpriseWechatMessage(input: EnterpriseWechatSendInput): Promise<EnterpriseWechatSendResult>
```

Input：

```ts
type EnterpriseWechatSendInput = {
  teamId?: string;
  purpose: "MANUAL_TEST" | "WEAK_SOCIAL_INVITATION" | "WEEKLY_REPORT" | "TEAM_BROADCAST";
  targetType?: string;
  targetId?: string;
  message: EnterpriseWechatMessage;
};

type EnterpriseWechatMessage =
  | { type: "text"; content: string }
  | { type: "markdown"; content: string };
```

Result：

```ts
type EnterpriseWechatSendResult =
  | {
      ok: true;
      status: "SENT";
      logId: string;
      httpStatus: number;
      wechatErrcode: 0;
      wechatErrmsg: string;
    }
  | {
      ok: false;
      status: "SKIPPED";
      logId: string;
      reason: "MISSING_WEBHOOK_CONFIG";
    }
  | {
      ok: false;
      status: "FAILED";
      logId: string;
      reason: "NETWORK_ERROR" | "HTTP_ERROR" | "WECHAT_ERROR" | "INVALID_MESSAGE";
      httpStatus?: number;
      wechatErrcode?: number;
      wechatErrmsg?: string;
      errorMessage?: string;
    };
```

设计要求：

- sender 对外返回结构化结果。
- sender 不把 webhook 缺失当成异常。
- sender 对网络异常、非 2xx、企业微信 `errcode != 0` 做失败结果。
- sender 只在不可恢复的编程错误时抛异常；正常业务调用不应该因为通知失败崩掉。
- 所有结果都写入发送日志。

## Formatter

GM-11 提供通用 formatter，不直接写 GM-12 的弱社交业务逻辑。

推荐函数：

```ts
formatEnterpriseWechatText(input: {
  title: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage;

formatEnterpriseWechatMarkdown(input: {
  title: string;
  quote?: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage;
```

规则：

- `title` 必填。
- 空行会被清理。
- 内容过长时截断到安全长度。
- 截断时追加 `...`。
- formatter 不读取数据库，不发送网络请求。
- formatter 可单独测试。

## 日志模型

新增 `EnterpriseWechatSendLog`：

```prisma
model EnterpriseWechatSendLog {
  id                  String   @id @default(cuid())
  teamId              String?
  team                Team?    @relation(fields: [teamId], references: [id])
  purpose             String
  targetType          String?
  targetId            String?
  messageType         String
  messagePreview      String
  status              String
  failureReason       String?
  httpStatus          Int?
  wechatErrcode       Int?
  wechatErrmsg        String?
  errorMessage        String?
  responseBodySnippet String?
  createdAt           DateTime @default(now())

  @@index([teamId, createdAt])
  @@index([purpose, createdAt])
  @@index([targetType, targetId])
  @@index([status, createdAt])
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `teamId` | 关联团队，允许为空以支持系统级测试 |
| `purpose` | 调用目的，例如 `WEAK_SOCIAL_INVITATION` |
| `targetType / targetId` | 业务对象，例如 `SocialInvitation / id` |
| `messageType` | `text` 或 `markdown` |
| `messagePreview` | 消息预览，截断保存，不保存过长正文 |
| `status` | `SENT / SKIPPED / FAILED` |
| `failureReason` | `MISSING_WEBHOOK_CONFIG / NETWORK_ERROR / HTTP_ERROR / WECHAT_ERROR / INVALID_MESSAGE` |
| `httpStatus` | HTTP 状态码 |
| `wechatErrcode / wechatErrmsg` | 企业微信返回码 |
| `errorMessage` | 网络或解析错误摘要 |
| `responseBodySnippet` | 响应体截断片段 |

日志不保存：

- webhook URL
- webhook key
- request headers
- cookie

## 管理员测试接口

GM-11 提供一个无 UI 的测试接口：

```text
POST /api/admin/integrations/enterprise-wechat/test
```

Request：

```json
{
  "message": "牛马补给站 webhook 测试"
}
```

Response 成功：

```json
{
  "result": {
    "ok": true,
    "status": "SENT",
    "logId": "log_id"
  }
}
```

Response 缺少配置：

```json
{
  "result": {
    "ok": false,
    "status": "SKIPPED",
    "reason": "MISSING_WEBHOOK_CONFIG",
    "logId": "log_id"
  }
}
```

权限：

- 未登录返回 `401`。
- 非管理员返回 `403`。
- 管理员只能以自己团队 `teamId` 发送测试。

测试接口目的：

- 验证环境变量是否配置。
- 验证企业微信群机器人是否仍可用。
- 验证日志记录是否正常。

GM-11 不提供前端按钮。后续如果需要，可以在管理员页增加一个轻量测试入口。

## 业务调用方约定

后续业务应按这个模式调用：

```text
1. 先完成本地业务事务
2. 再调用企业微信 sender
3. 根据 sender result 更新业务上的发送标记
4. 不因 sender 失败回滚本地业务
```

对 GM-12 的预期：

- 创建 `SocialInvitation` 成功后再发送企业微信。
- 发送成功后写入 `SocialInvitation.wechatWebhookSentAt`。
- 发送失败时邀请仍然存在，用户仍能在系统内看到和响应。
- 失败原因进入 `EnterpriseWechatSendLog`。

对 GM-15 的预期：

- 周报生成和企业微信发送分离。
- 周报内容应先在系统内可查看，再考虑推送到群。

## 错误处理

| 场景 | sender result | 是否抛异常 | 是否写日志 |
| --- | --- | --- | --- |
| webhook 未配置 | `SKIPPED / MISSING_WEBHOOK_CONFIG` | 否 | 是 |
| 消息为空 | `FAILED / INVALID_MESSAGE` | 否 | 是 |
| 网络异常 | `FAILED / NETWORK_ERROR` | 否 | 是 |
| HTTP 非 2xx | `FAILED / HTTP_ERROR` | 否 | 是 |
| 企业微信 `errcode != 0` | `FAILED / WECHAT_ERROR` | 否 | 是 |
| 日志数据库不可用 | 抛异常 | 是 | 否 |

说明：

- 日志数据库不可用代表本地系统异常，允许抛出。
- 外部通道失败属于可预期失败，不应该抛出给业务调用方。

## 测试策略

### Formatter 测试

覆盖：

- text formatter 清理空行。
- markdown formatter 生成标题、引用、列表和 footer。
- 过长内容会截断。
- 空消息被 sender 判定为 `INVALID_MESSAGE`。

### Sender 测试

覆盖：

- 缺少 webhook 配置时返回 `SKIPPED`，不调用 fetch，并写日志。
- webhook 配置存在时发送正确 payload。
- 企业微信返回 `{ errcode: 0 }` 时返回 `SENT`。
- HTTP 500 返回 `FAILED / HTTP_ERROR`。
- 企业微信返回非 0 errcode 返回 `FAILED / WECHAT_ERROR`。
- fetch 抛异常返回 `FAILED / NETWORK_ERROR`。
- 日志不包含 webhook URL。

### Admin API 测试

覆盖：

- 未登录返回 `401`。
- 非管理员返回 `403`。
- 管理员可发送测试消息。
- 缺少配置时返回 `SKIPPED`。
- malformed body 返回 `400`。

## Acceptance Criteria

GM-11 完成时应满足：

1. 存在可复用的服务端企业微信 sender。
2. sender 支持 `text` 和 `markdown`。
3. sender 从 `ENTERPRISE_WECHAT_WEBHOOK_URL` 读取 webhook。
4. webhook 缺失时返回 `SKIPPED`，不抛 500。
5. 企业微信发送失败时返回结构化 `FAILED` 结果。
6. 成功、跳过和失败都会写入 `EnterpriseWechatSendLog`。
7. 发送日志不保存 webhook URL 或 webhook key。
8. 管理员测试 API 可用于验证配置。
9. 非管理员不能调用测试 API。
10. GM-11 不创建弱社交邀请，不生成周报，不发送业务消息。
11. GM-12 可以直接复用 sender 发送弱社交提醒。
12. GM-15 可以直接复用 sender 发送周报。

## Follow-Up Stories

GM-11 解锁：

- `GM-12 Weak Social Invitations V1`
- `GM-15 Weekly Report / Report Center Integration`

GM-11 不阻塞：

- `GM-13 Team Dynamics Integration`
- `GM-14 Docs Center Rule Pages`
