"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackRarity,
  SupplyBackpackSelectedDetail,
  SupplyBackpackSlot,
} from "./types";

const rarityClass: Record<SupplyBackpackRarity, string> = {
  N: "supply-backpack-rarity-n",
  R: "supply-backpack-rarity-r",
  SR: "supply-backpack-rarity-sr",
  SSR: "supply-backpack-rarity-ssr",
};

export function SupplyBackpackScene({ data }: { data: SupplyBackpackPreview }) {
  const [brandLabel = "牛马补给站", activeLabel = "背包"] = data.topBar.breadcrumb;
  const [page, setPage] = useState(data.inventory.page);
  const [selectedItemId, setSelectedItemId] = useState(data.selectedItemDetail.itemId);
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const selectedDetail =
    useMemo(
      () => data.itemDetails.find((detail) => detail.itemId === selectedItemId),
      [data.itemDetails, selectedItemId],
    ) ?? data.selectedItemDetail;

  return (
    <main className="supply-backpack-scene" aria-label="牛马补给站背包静态原型">
      <div className="supply-backpack-background" aria-hidden="true" />
      <div className="supply-backpack-content">
        <SupplyUiLabTopBar
          activeLabel={activeLabel}
          brandLabel={brandLabel}
          closeHref="/ui-lab/supply-dashboard"
          resources={data.topBar.resources}
          variant="breadcrumb"
        />
        <section className="supply-backpack-shell" aria-label="背包静态复刻">
          <BackpackSidebar data={data} />
          <BackpackInventoryPanel
            data={data}
            page={page}
            selectedItemId={selectedItemId}
            onPageChange={setPage}
            onSelectItem={(itemId) => {
              setSelectedItemId(itemId);
              setActionLabel(null);
            }}
          />
          <BackpackDetailPanel
            actionLabel={actionLabel}
            detail={selectedDetail}
            onAction={setActionLabel}
          />
        </section>
        <BackpackHintBar hint={data.hint} />
      </div>
    </main>
  );
}

function BackpackSidebar({ data }: { data: SupplyBackpackPreview }) {
  return (
    <aside className="supply-backpack-sidebar" aria-label="背包分类与今日效果">
      <SupplyUiLabPixelPanel
        ariaLabel="背包分类"
        className="supply-backpack-sidebar-card"
        title={
          <span className="supply-backpack-sidebar-title">
            <span>
              <span aria-hidden="true">▣</span>
              背包
            </span>
            <SupplyUiLabStatusBadge tone="muted">容量 {data.sidebar.capacity}</SupplyUiLabStatusBadge>
          </span>
        }
      >
        <nav aria-label="背包分类" className="supply-backpack-categories">
          {data.sidebar.categories.map((category) => (
            <button
              aria-current={category.active ? "page" : undefined}
              className={category.active ? "is-active" : undefined}
              key={category.id}
              type="button"
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </nav>
        <div className="supply-backpack-sidebar-controls" aria-label="背包操作">
          <Link href="/ui-lab/supply-dashboard" className="supply-backpack-back-link">
            返回大厅
          </Link>
        </div>
      </SupplyUiLabPixelPanel>

      <SupplyUiLabPixelPanel
        ariaLabel="今日效果"
        className="supply-backpack-effects-card"
        title={
          <span>
            今日效果
            <button type="button" aria-label="今日效果说明">
              i
            </button>
          </span>
        }
        tone="yellow"
      >
        <div className="supply-backpack-effects-list">
          {data.sidebar.todayEffects.map((effect) => (
            <div className="supply-backpack-effect-row" key={effect.id}>
              <Image alt="" height={32} src={effect.icon} unoptimized width={32} />
              <b>{effect.label}</b>
              <strong>{effect.statusLabel}</strong>
              <time>{effect.endsAtLabel}</time>
              <small>{effect.effectSummary}</small>
            </div>
          ))}
        </div>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function BackpackInventoryPanel({
  data,
  page,
  selectedItemId,
  onPageChange,
  onSelectItem,
}: {
  data: SupplyBackpackPreview;
  page: number;
  selectedItemId: string;
  onPageChange: (page: number) => void;
  onSelectItem: (itemId: string) => void;
}) {
  const startIndex = (page - 1) * data.inventory.pageSize;
  const visibleSlots = data.inventory.slots.slice(startIndex, startIndex + data.inventory.pageSize);

  return (
    <section className="supply-backpack-inventory-panel" aria-label="库存面板">
      <div className="supply-backpack-inventory-toolbar">
        <h2>库存</h2>
        <label className="supply-backpack-sort-control">
          <span>排序</span>
          <select aria-label="库存排序" defaultValue={data.selectedSort}>
            {data.sortOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="supply-backpack-grid" role="grid" aria-label="背包库存">
        {visibleSlots.map((slot) => (
          <InventorySlot
            key={slot.type === "item" ? slot.item.id : slot.id}
            selectedItemId={selectedItemId}
            slot={slot}
            onSelectItem={onSelectItem}
          />
        ))}
      </div>
      <div className="supply-backpack-pagination" aria-label="背包分页">
        <button
          type="button"
          disabled={page === 1}
          aria-label="上一页"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          ‹
        </button>
        <span>
          {page} / {data.inventory.totalPages}
        </span>
        <button
          type="button"
          disabled={page === data.inventory.totalPages}
          aria-label="下一页"
          onClick={() => onPageChange(Math.min(data.inventory.totalPages, page + 1))}
        >
          ›
        </button>
      </div>
    </section>
  );
}

function InventorySlot({
  slot,
  selectedItemId,
  onSelectItem,
}: {
  slot: SupplyBackpackSlot;
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
}) {
  if (slot.type === "empty") {
    return <div className="supply-backpack-slot is-empty" role="gridcell" aria-label="空背包格" />;
  }

  return (
    <InventoryItemCard
      item={slot.item}
      selected={slot.item.id === selectedItemId}
      onSelectItem={onSelectItem}
    />
  );
}

function InventoryItemCard({
  item,
  selected,
  onSelectItem,
}: {
  item: SupplyBackpackInventoryItem;
  selected: boolean;
  onSelectItem: (itemId: string) => void;
}) {
  return (
    <button
      aria-label={`${item.name}，${item.rarity}，持有 ${item.quantity}`}
      aria-selected={selected}
      className={`supply-backpack-slot is-item ${rarityClass[item.rarity]} ${
        selected ? "is-selected" : ""
      }`}
      role="gridcell"
      type="button"
      onClick={() => onSelectItem(item.id)}
    >
      <span className="supply-backpack-rarity">{item.rarity}</span>
      <Image alt="" height={72} src={item.image} unoptimized width={72} />
      <span className="supply-backpack-item-name">{item.name}</span>
      <span className="supply-backpack-quantity">x{item.quantity}</span>
    </button>
  );
}

function BackpackDetailPanel({
  detail,
  actionLabel,
  onAction,
}: {
  detail: SupplyBackpackSelectedDetail;
  actionLabel: string | null;
  onAction: (label: string) => void;
}) {
  return (
    <section className="supply-backpack-detail" aria-label="道具详情">
      <div className="supply-backpack-detail-hero">
        <div className="supply-backpack-detail-image">
          <span>{detail.rarity}</span>
          <Image alt="" height={112} src={detail.image} unoptimized width={112} />
        </div>
        <div>
          <div className="supply-backpack-detail-title-row">
            <h2>{detail.name}</h2>
            <span>{detail.tag}</span>
          </div>
          <p>持有 {detail.ownedQuantity}</p>
        </div>
      </div>
      <p className="supply-backpack-description">{detail.description}</p>
      <div className="supply-backpack-detail-rule">
        <h3>效果</h3>
        <p>{detail.effect}</p>
      </div>
      <div className="supply-backpack-detail-rule">
        <h3>使用时机</h3>
        <p>{detail.useTiming}</p>
      </div>
      <div className="supply-backpack-detail-rule">
        <h3>使用限制</h3>
        <ul>
          {detail.restrictions.map((restriction) => (
            <li key={restriction}>{restriction}</li>
          ))}
        </ul>
      </div>
      <div className="supply-backpack-actions">
        <button type="button" onClick={() => onAction(`${detail.primaryAction}已模拟`)}>
          {detail.primaryAction}
        </button>
        <button
          type="button"
          onClick={() =>
            onAction(
              detail.requiresAdminConfirmation
                ? `${detail.secondaryAction}已模拟，${detail.redemptionStateLabel ?? "等待管理员确认"}`
                : `${detail.secondaryAction}已模拟`,
            )
          }
        >
          {detail.secondaryAction}
        </button>
      </div>
      {actionLabel ? (
        <p className="supply-backpack-action-feedback" role="status">
          {detail.name}：{actionLabel}
        </p>
      ) : null}
      <div className="supply-backpack-shop-cta">
        <span>{detail.shopCta.description}</span>
        <Link href={detail.shopCta.href}>{detail.shopCta.label}</Link>
      </div>
    </section>
  );
}

function BackpackHintBar({ hint }: { hint: string }) {
  return (
    <footer className="supply-backpack-hint">
      <span aria-hidden="true">i</span>
      <b>小提示：</b>
      <p>{hint}</p>
    </footer>
  );
}
