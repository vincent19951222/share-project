"use client";

import { useEffect, useState } from "react";
import {
  fetchGamificationWeeklyReport,
  publishGamificationWeeklyReportRequest,
} from "@/lib/api";
import type { GamificationWeeklyReportSnapshot } from "@/lib/types";

interface Props {
  isAdmin: boolean;
}

function statusText(snapshot: GamificationWeeklyReportSnapshot) {
  return snapshot.published ? "已发布到团队动态" : "未发布";
}

export function GamificationWeeklyReportPanel({ isAdmin }: Props) {
  const [snapshot, setSnapshot] = useState<GamificationWeeklyReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextSnapshot = await fetchGamificationWeeklyReport();
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "牛马补给周报加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function publish(sendEnterpriseWechat: boolean) {
    if (!snapshot) {
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const result = await publishGamificationWeeklyReportRequest({
        weekStartDayKey: snapshot.weekStartDayKey,
        sendEnterpriseWechat,
      });
      setSnapshot(result.snapshot);
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : "发布牛马补给周报失败",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <section className="game-weekly-report">牛马补给周报加载中...</section>;
  }

  if (error && !snapshot) {
    return (
      <section className="game-weekly-report game-weekly-report--error">
        牛马补给周报加载失败：{error}
      </section>
    );
  }

  if (!snapshot) {
    return <section className="game-weekly-report">本周还没有牛马补给数据。</section>;
  }

  return (
    <section className="game-weekly-report" aria-labelledby="game-weekly-report-title">
      <div className="game-weekly-report__header">
        <div>
          <p className="game-weekly-report__eyebrow">Weekly Supply</p>
          <h2 id="game-weekly-report-title">牛马补给周报</h2>
          <p>
            {snapshot.weekStartDayKey} 至 {snapshot.weekEndDayKey}
          </p>
        </div>
        <span className="game-weekly-report__status">{statusText(snapshot)}</span>
      </div>

      <div className="game-weekly-report__metrics">
        {snapshot.metricCards.map((metric) => (
          <article
            key={metric.key}
            className={`game-weekly-card game-weekly-card--${metric.tone}`}
          >
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.helper}</span>
          </article>
        ))}
      </div>

      <div className="game-weekly-report__summaries">
        {snapshot.summaryCards.map((card) => (
          <article
            key={card.key}
            className={`game-weekly-summary game-weekly-summary--${card.tone}`}
          >
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      <div className="game-weekly-report__highlights">
        <h3>本周高光</h3>
        {snapshot.highlights.length > 0 ? (
          snapshot.highlights.map((highlight) => (
            <article key={highlight.id}>
              <strong>{highlight.title}</strong>
              <p>{highlight.summary}</p>
            </article>
          ))
        ) : (
          <p>本周还没有稀有奖励、暴击高光或多人响应。先攒一点素材。</p>
        )}
      </div>

      {error ? <p className="game-weekly-report__error">{error}</p> : null}

      {isAdmin ? (
        <div className="game-weekly-report__actions">
          <button type="button" disabled={publishing} onClick={() => void publish(false)}>
            发布到团队动态
          </button>
          <button type="button" disabled={publishing} onClick={() => void publish(true)}>
            发布并发送企业微信
          </button>
        </div>
      ) : null}
    </section>
  );
}
