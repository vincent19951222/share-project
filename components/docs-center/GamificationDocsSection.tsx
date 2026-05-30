import { gamificationDocs, type GamificationRuleBlock } from "@/content/docs-center/gamification";
import { buildGamificationProbabilityDisclosure } from "@/lib/gamification/probability-disclosure";

const overviewCards = [
  {
    label: "免费券上限",
    value: "2 张 / 天",
    detail: "真实健身 1 张，四维任务全完成 1 张。",
  },
  {
    label: "十连规则",
    value: "10 张券",
    detail: "单抽无保底，十连至少保底 1 个有效奖励。",
  },
  {
    label: "补券价格",
    value: "40 银子",
    detail: "每人每天最多补 10 张，防止无限套利。",
  },
  {
    label: "库存有效期",
    value: "永久",
    detail: "抽奖券、普通道具和真实福利券都不会过期。",
  },
];

const ruleGroupDefinitions = [
  {
    id: "supply-station-daily-loop",
    title: "每日获得",
    summary: "先讲今天可以拿到什么，以及四维任务为什么存在。",
    ruleIds: ["daily-free-tickets", "four-dimension-tasks"],
  },
  {
    id: "supply-station-draw-inventory",
    title: "抽奖与库存",
    summary: "再讲券怎么花、奖池怎么读、背包资源怎么消耗。",
    ruleIds: ["lottery-and-ten-draw", "lottery-probability-rules", "backpack-and-consumption"],
  },
  {
    id: "supply-station-boundaries",
    title: "例外与边界",
    summary: "最后讲容易误解的道具、真实福利、弱社交和团队动态边界。",
    ruleIds: [
      "boost-rules",
      "leave-coupon-rules",
      "weak-social-rules",
      "luckin-redemption-rules",
      "team-dynamics-boundary",
    ],
  },
] as const;

function isRuleBlock(rule: GamificationRuleBlock | undefined): rule is GamificationRuleBlock {
  return Boolean(rule);
}

interface GamificationDocsSectionProps {
  sectionId?: string;
}

export function GamificationDocsSection({
  sectionId = "supply-station-overview",
}: GamificationDocsSectionProps) {
  const probability = buildGamificationProbabilityDisclosure();
  const tierWeightSummary = probability.tierWeights
    .map((tier) => `${tier.tier} ${tier.weight}`)
    .join(" / ");
  const ruleGroups = ruleGroupDefinitions.map((group) => ({
    ...group,
    rules: group.ruleIds
      .map((ruleId) => gamificationDocs.rules.find((rule) => rule.id === ruleId))
      .filter(isRuleBlock),
  }));

  return (
    <section className="docs-gamification" aria-labelledby="supply-station-docs-title">
      <header className="docs-gamification__header">
        <p className="docs-eyebrow">牛马补给站</p>
        <h2 id="supply-station-docs-title">补给站玩法规则</h2>
        <p>
          按官方文档的读法重排：先看速览，再看规则地图，需要核数字时跳到参考表。
          文案可以有梗，规则口径必须稳定。
        </p>
        <p className="docs-updated">最后更新：{gamificationDocs.updatedAt}</p>
      </header>

      {sectionId === "supply-station-overview" ? (
      <section id="supply-station-overview" className="docs-manual-section docs-manual-section--accent">
        <div className="docs-manual-heading">
          <p className="docs-eyebrow">Overview</p>
          <h3>补给站速览</h3>
          <p>把最容易被问到的口径放在入口，读者不用先穿过完整长文。</p>
        </div>
        <div className="docs-overview-grid">
          {overviewCards.map((card) => (
            <article className="docs-overview-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
        <div className="docs-read-order">
          <p className="docs-eyebrow">阅读顺序</p>
          <ol>
            <li>先看“每日获得”，确认今天能拿什么。</li>
            <li>再看“抽奖与库存”，确认资源怎么花。</li>
            <li>涉及请假、兑换、点名时，直接跳到“例外与边界”。</li>
          </ol>
        </div>
      </section>
      ) : null}

      {sectionId === gamificationDocs.anchors.rules ? (
      <section id={gamificationDocs.anchors.rules} className="docs-manual-section">
        <div className="docs-manual-heading">
          <p className="docs-eyebrow">Rules</p>
          <h3>规则地图</h3>
          <p>用三组规则替代一长串堆叠卡片：获得、消耗、边界。</p>
        </div>
        <div className="docs-rule-groups">
          {ruleGroups.map((group) => (
            <section id={group.id} className="docs-rule-group" key={group.id}>
              <div className="docs-rule-group-heading">
                <span>{group.rules.length} 条</span>
                <h4>{group.title}</h4>
                <p>{group.summary}</p>
              </div>
              <div className="docs-rule-list">
                {group.rules.map((rule) => (
                  <article id={rule.id} key={rule.id} className={`docs-rule-card docs-rule-card--${rule.tone}`}>
                    <h5>{rule.title}</h5>
                    <p>{rule.summary}</p>
                    <ul>
                      {rule.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      ) : null}

      {sectionId === "supply-station-task-cards" ? (
      <section id="supply-station-task-cards" className="docs-manual-section">
        <div className="docs-manual-heading">
          <p className="docs-eyebrow">Reference</p>
          <h3>四维任务卡池</h3>
          <p>当前每日四维会从这些启用卡片中抽取；标题负责好玩，说明负责讲清楚动作。</p>
        </div>
        <div className="docs-task-card-catalog" aria-label="四维任务卡池清单">
          {gamificationDocs.taskCardGroups.map((group) => (
            <section className="docs-task-card-group" key={group.dimensionKey}>
              <header>
                <span>{group.title}</span>
                <h4>{group.subtitle}</h4>
                <p>{group.description}</p>
              </header>
              <div className="docs-task-card-list">
                {group.cards.map((card) => (
                  <article className="docs-task-card-row" key={card.id}>
                    <div>
                      <span>{card.id}</span>
                      <strong>{card.title}</strong>
                    </div>
                    <p>{card.description}</p>
                    <small>
                      {card.effortLabel} · {card.sceneLabel} · {card.cooldownLabel}
                    </small>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      ) : null}

      {sectionId === "supply-station-probability" ? (
      <section id="supply-station-probability" className="docs-manual-section docs-manual-section--reference">
        <div className="docs-manual-heading">
          <p className="docs-eyebrow">Probability</p>
          <h3>抽奖概率说明</h3>
          <p>Active 奖池总权重 {probability.activeTotalWeight}。当前权重可以近似理解为长期概率百分比。</p>
        </div>
        <dl className="docs-probability-summary">
          <div>
            <dt>分层权重</dt>
            <dd>{tierWeightSummary}</dd>
          </div>
          <div>
            <dt>银子期望</dt>
            <dd>直接银子期望 {probability.directCoinExpectedValue.toFixed(2)} 银子</dd>
          </div>
        </dl>
        <ul className="docs-probability-notes">
          {probability.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div className="docs-probability-table-wrap" aria-label="Active rewards">
          <table className="docs-probability-table">
            <thead>
              <tr>
                <th>概率</th>
                <th>奖励</th>
                <th>层级</th>
                <th>效果</th>
              </tr>
            </thead>
            <tbody>
              {probability.activeRewards.map((reward) => (
                <tr key={reward.id}>
                  <td>{reward.probabilityLabel}</td>
                  <td>{reward.name}</td>
                  <td>
                    {reward.tier} · {reward.rarity}
                  </td>
                  <td>{reward.effectSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="docs-probability-disabled">
          <h4>当前不可抽</h4>
          <ul>
            {probability.disabledRewards.map((reward) => (
              <li key={reward.id}>
                {reward.name}：{reward.effectSummary}
              </li>
            ))}
            {probability.inactiveItemNotes.map((item) => (
              <li key={item.itemId}>
                {item.itemName}：{item.reason}
              </li>
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {sectionId === gamificationDocs.anchors.help ? (
      <section id={gamificationDocs.anchors.help} className="docs-manual-section">
        <div className="docs-manual-heading">
          <p className="docs-eyebrow">Guides</p>
          <h3>日常流程</h3>
          <p>把说明写成能照着走的流程，而不是把规则再复述一遍。</p>
        </div>
        <div className="docs-flow-list">
          {gamificationDocs.help.map((step, index) => (
            <article id={step.id} key={step.id} className="docs-flow-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h4>{step.title}</h4>
              <p>{step.description}</p>
              <ul>
                {step.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {sectionId === gamificationDocs.anchors.faq ? (
      <section id={gamificationDocs.anchors.faq} className="docs-manual-section">
        <div className="docs-manual-heading">
          <p className="docs-eyebrow">FAQ</p>
          <h3>补给站 FAQ</h3>
          <p>只收真实会问的问题，避免把正文变成第二份长文。</p>
        </div>
        <div className="docs-faq-list">
          {gamificationDocs.faq.map((item) => (
            <details id={item.id} key={item.id} className="docs-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      ) : null}

      {sectionId === gamificationDocs.anchors.changelog ? (
      <article id={gamificationDocs.anchors.changelog} className="docs-changelog-block">
        <p className="docs-eyebrow">Changelog</p>
        <h3>{gamificationDocs.changelog.title}</h3>
        <p>{gamificationDocs.changelog.summary}</p>
        <ul>
          {gamificationDocs.changelog.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>
      ) : null}
    </section>
  );
}
