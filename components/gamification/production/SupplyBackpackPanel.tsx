"use client";

import type {
  GamificationBackpackItemSnapshot,
  GamificationTodayEffectSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyBackpackAction = "use-item" | "request-redemption";

export interface SupplyBackpackUseTarget {
  dimensionKey?: string;
  recipientUserId?: string;
  message?: string;
}

export interface SupplyBackpackPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyBackpackAction | string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUseItem: (itemId: string, target?: SupplyBackpackUseTarget) => void;
  onRequestRedemption: (itemId: string) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function flattenBackpackItems(snapshot: SupplyStationProductionSnapshot) {
  return snapshot.backpack.groups.flatMap((group) => group.items);
}

function isRedemptionItem(item: GamificationBackpackItemSnapshot) {
  return item.category === "real_world" || item.requiresAdminConfirmation;
}

function getSelectedItem(
  snapshot: SupplyStationProductionSnapshot,
  selectedItemId: string | null,
) {
  const items = flattenBackpackItems(snapshot);
  return items.find((item) => item.itemId === selectedItemId) ?? items[0] ?? null;
}

function TodayEffectList({ effects }: { effects: GamificationTodayEffectSnapshot[] }) {
  return (
    <section className="supply-production-backpack__effects" aria-label="今日效果">
      <h3>今日效果</h3>
      {effects.length > 0 ? (
        <div>
          {effects.map((effect) => (
            <article key={effect.id}>
              <strong>{effect.name}</strong>
              <span>{effect.statusLabel}</span>
              <p>{effect.effectSummary}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>今天还没有生效中的补给效果</p>
      )}
    </section>
  );
}

export function SupplyBackpackPanel({
  activeAction,
  onRequestRedemption,
  onSelectItem,
  onUseItem,
  selectedItemId,
  snapshot,
}: SupplyBackpackPanelProps) {
  const selectedItem = getSelectedItem(snapshot, selectedItemId);
  const isBusy = activeAction !== null;

  return (
    <section className="supply-production-backpack" aria-label="背包">
      <header className="supply-production-backpack__header">
        <div>
          <p>牛马补给站</p>
          <h2>背包</h2>
        </div>
        <article className="supply-production-backpack__capacity" aria-label="背包容量">
          <span>容量</span>
          <strong>
            {formatNumber(snapshot.backpack.capacity.usedSlots)}/
            {formatNumber(snapshot.backpack.capacity.totalSlots)}
          </strong>
        </article>
      </header>

      <div className="supply-production-backpack__layout">
        <section className="supply-production-backpack__inventory" aria-label="库存">
          {snapshot.backpack.groups.length > 0 ? (
            snapshot.backpack.groups.map((group) => (
              <article className="supply-production-backpack__group" key={group.category}>
                <header>
                  <h3>{group.label}</h3>
                  <span>{formatNumber(group.totalQuantity)}</span>
                </header>
                <div>
                  {group.items.map((item) => (
                    <button
                      aria-selected={selectedItem?.itemId === item.itemId}
                      className="supply-production-backpack__item"
                      data-item-id={item.itemId}
                      data-testid="supply-backpack-item"
                      key={item.itemId}
                      onClick={() => onSelectItem(item.itemId)}
                      type="button"
                    >
                      <strong>{item.name}</strong>
                      <span>{item.categoryLabel}</span>
                      <small>
                        持有 {formatNumber(item.quantity)} · 可用{" "}
                        {formatNumber(item.availableQuantity)}
                      </small>
                    </button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p>{snapshot.backpack.emptyMessage}</p>
          )}
        </section>

        <section className="supply-production-backpack__detail" aria-label="道具详情">
          {selectedItem ? (
            <article>
              <header>
                <span>{selectedItem.categoryLabel}</span>
                <h3>{selectedItem.name}</h3>
                <p>可用 {formatNumber(selectedItem.availableQuantity)}</p>
              </header>
              <p>{selectedItem.description}</p>
              <dl>
                <div>
                  <dt>使用时机</dt>
                  <dd>{selectedItem.useTimingLabel}</dd>
                </div>
                <div>
                  <dt>效果</dt>
                  <dd>{selectedItem.effectSummary}</dd>
                </div>
                <div>
                  <dt>使用限制</dt>
                  <dd>{selectedItem.usageLimitSummary}</dd>
                </div>
              </dl>
              {!selectedItem.useEnabled && selectedItem.useDisabledReason ? (
                <p>{selectedItem.useDisabledReason}</p>
              ) : null}
              {isRedemptionItem(selectedItem) ? (
                <button
                  data-action="request-redemption"
                  disabled={isBusy || selectedItem.availableQuantity <= 0}
                  onClick={() => onRequestRedemption(selectedItem.itemId)}
                  type="button"
                >
                  {activeAction === "request-redemption" ? "申请中" : "申请兑换"}
                </button>
              ) : (
                <button
                  data-action="use-item"
                  disabled={isBusy || !selectedItem.useEnabled}
                  onClick={() => onUseItem(selectedItem.itemId, undefined)}
                  type="button"
                >
                  {activeAction === "use-item" ? "使用中" : "今日使用"}
                </button>
              )}
            </article>
          ) : (
            <p>{snapshot.backpack.emptyMessage}</p>
          )}
        </section>
      </div>

      <TodayEffectList effects={snapshot.backpack.todayEffects} />
    </section>
  );
}
