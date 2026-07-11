"use client";

import type { TrainingPlanSnapshot } from "@/lib/types";

interface TrainingPlanCardProps {
  plan: TrainingPlanSnapshot | null;
  onCreate: () => void;
  onOpen: () => void;
}

function formatPlanDate(dayKey: string) {
  const [, month, day] = dayKey.split("-").map(Number);
  return `${month}月${day}日`;
}

export function TrainingPlanCard({ plan, onCreate, onOpen }: TrainingPlanCardProps) {
  if (!plan) {
    return (
      <section className="training-plan-card training-plan-card-empty" aria-label="新手训练计划">
        <div className="training-plan-card-copy">
          <span className="training-plan-card-kicker">新手训练计划</span>
          <h2>把“今天练什么”先定下来</h2>
          <p>选择每周次数、训练日和时长，生成一套固定四周计划。</p>
        </div>
        <button type="button" className="training-plan-card-primary" onClick={onCreate}>
          生成我的 4 周计划
        </button>
      </section>
    );
  }

  if (plan.status === "COMPLETED") {
    return (
      <section className="training-plan-card training-plan-card-completed" aria-label="训练计划已完成">
        <div className="training-plan-card-copy">
          <span className="training-plan-card-kicker">4 周计划</span>
          <h2>本轮计划已完成</h2>
          <p>这一轮已经归档。需要时再主动开启下一轮，不会自动续上。</p>
        </div>
        <button type="button" className="training-plan-card-primary" onClick={onCreate}>
          开启下一轮
        </button>
      </section>
    );
  }

  const today = plan.todayDay;
  if (today?.status === "completed") {
    return (
      <section className="training-plan-card training-plan-card-done" aria-label="今日训练计划">
        <div className="training-plan-card-status" aria-hidden="true">DONE</div>
        <div className="training-plan-card-copy">
          <span className="training-plan-card-kicker">第 {plan.currentWeekIndex} 周</span>
          <h2>今日训练已完成</h2>
          <p>{today.title} 已和今天的健身打卡同步。</p>
        </div>
        <button type="button" className="training-plan-card-secondary" onClick={onOpen}>
          查看计划
        </button>
      </section>
    );
  }

  if (today) {
    return (
      <section className="training-plan-card training-plan-card-today" aria-label="今日训练计划">
        <div className="training-plan-card-index" aria-hidden="true">
          W{plan.currentWeekIndex}
        </div>
        <div className="training-plan-card-copy">
          <span className="training-plan-card-kicker">今日训练</span>
          <h2>{today.title}</h2>
          <p>{today.estimatedMinutes} 分钟 · {today.exercises.length} 个动作 · 完成后计入今日打卡</p>
        </div>
        <button type="button" className="training-plan-card-primary" onClick={onOpen}>
          开始训练
        </button>
      </section>
    );
  }

  return (
    <section className="training-plan-card training-plan-card-rest" aria-label="今日训练计划">
      <div className="training-plan-card-status" aria-hidden="true">REST</div>
      <div className="training-plan-card-copy">
        <span className="training-plan-card-kicker">第 {plan.currentWeekIndex} 周</span>
        <h2>今日休息</h2>
        <p>
          {plan.nextDay
            ? `下次训练：${formatPlanDate(plan.nextDay.dayKey)} · ${plan.nextDay.title}`
            : "本周已没有待完成训练，按原计划休息。"}
        </p>
      </div>
      <button type="button" className="training-plan-card-secondary" onClick={onOpen}>
        查看计划
      </button>
    </section>
  );
}
