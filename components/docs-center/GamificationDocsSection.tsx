import { gamificationDocs } from "@/content/docs-center/gamification";
import { buildGamificationProbabilityDisclosure } from "@/lib/gamification/probability-disclosure";

export function GamificationDocsSection() {
  const probability = buildGamificationProbabilityDisclosure();
  const tierWeightSummary = probability.tierWeights
    .map((tier) => `${tier.tier} ${tier.weight}`)
    .join(" / ");

  return (
    <section className="docs-gamification" aria-labelledby="supply-station-docs-title">
      <div className="docs-gamification__header">
        <p className="docs-eyebrow">牛马补给站</p>
        <h2 id="supply-station-docs-title">补给站玩法规则</h2>
        <p>
          把每日任务、抽奖券、十连、背包、暴击、弱社交和瑞幸兑换放在同一页。规则可以搞笑，但数字不能糊。
        </p>
        <p className="docs-updated">最后更新：{gamificationDocs.updatedAt}</p>
      </div>

      <article id={gamificationDocs.anchors.changelog} className="docs-block docs-block--highlight">
        <p className="docs-eyebrow">更新日志</p>
        <h3>{gamificationDocs.changelog.title}</h3>
        <p>{gamificationDocs.changelog.summary}</p>
        <ul>
          {gamificationDocs.changelog.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>

      <div id={gamificationDocs.anchors.rules} className="docs-gamification__rules">
        <p className="docs-eyebrow">玩法规则</p>
        {gamificationDocs.rules.map((rule) => (
          <article id={rule.id} key={rule.id} className={`docs-block docs-block--${rule.tone}`}>
            <h3>{rule.title}</h3>
            <p>{rule.summary}</p>
            <ul>
              {rule.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article id="supply-station-probability" className="docs-block docs-block--highlight">
        <p className="docs-eyebrow">抽奖透明度</p>
        <h3>抽奖概率说明</h3>
        <p>Active 奖池总权重 {probability.activeTotalWeight}。当前权重可以近似理解为长期概率百分比。</p>
        <ul>
          <li>分层权重：{tierWeightSummary}</li>
          <li>直接银子期望 {probability.directCoinExpectedValue.toFixed(2)} 银子。</li>
          {probability.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>

        <div className="docs-probability-grid" aria-label="Active rewards">
          {probability.activeRewards.map((reward) => (
            <div key={reward.id} className="docs-probability-card">
              <span>{reward.probabilityLabel}</span>
              <strong>{reward.name}</strong>
              <p>
                {reward.tier} · {reward.rarity} · {reward.effectSummary}
              </p>
            </div>
          ))}
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
      </article>

      <div id={gamificationDocs.anchors.help} className="docs-gamification__help">
        <p className="docs-eyebrow">使用说明</p>
        {gamificationDocs.help.map((step) => (
          <article id={step.id} key={step.id} className="docs-block">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <ul>
              {step.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div id={gamificationDocs.anchors.faq} className="docs-gamification__faq">
        <p className="docs-eyebrow">常见问题</p>
        {gamificationDocs.faq.map((item) => (
          <details id={item.id} key={item.id} className="docs-faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
