import Image from "next/image";
import Link from "next/link";
import {
  SupplyUiLabActionButton,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackRarity,
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
          <BackpackInventoryPanel data={data} />
          <BackpackDetailPanel data={data} />
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
          <SupplyUiLabActionButton className="supply-backpack-expand-control" tone="primary">
            扩容
          </SupplyUiLabActionButton>
          <SupplyUiLabActionButton className="supply-backpack-info-control" tone="ghost">
            说明
          </SupplyUiLabActionButton>
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
              <span aria-hidden="true">{effect.icon}</span>
              <b>{effect.label}</b>
              <strong>{effect.value}</strong>
              <time>{effect.expiresIn}</time>
            </div>
          ))}
        </div>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function BackpackInventoryPanel({ data }: { data: SupplyBackpackPreview }) {
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
        {data.inventory.slots.map((slot) => (
          <InventorySlot key={slot.type === "item" ? slot.item.id : slot.id} slot={slot} />
        ))}
      </div>
      <div className="supply-backpack-pagination" aria-label="背包分页">
        <button type="button" disabled aria-label="上一页">
          ‹
        </button>
        <span>
          {data.inventory.page} / {data.inventory.totalPages}
        </span>
        <button type="button" aria-label="下一页">
          ›
        </button>
      </div>
    </section>
  );
}

function InventorySlot({ slot }: { slot: SupplyBackpackSlot }) {
  if (slot.type === "locked") {
    return (
      <div className="supply-backpack-slot is-locked" role="gridcell">
        <span aria-hidden="true">锁</span>
        <strong>{slot.unlockLevel}级解锁</strong>
      </div>
    );
  }

  return <InventoryItemCard item={slot.item} />;
}

function InventoryItemCard({ item }: { item: SupplyBackpackInventoryItem }) {
  return (
    <button
      aria-label={`${item.name}，${item.rarity}，持有 ${item.quantity}`}
      aria-selected={item.selected}
      className={`supply-backpack-slot is-item ${rarityClass[item.rarity]} ${
        item.selected ? "is-selected" : ""
      }`}
      role="gridcell"
      type="button"
    >
      <span className="supply-backpack-rarity">{item.rarity}</span>
      <Image alt="" height={72} src={item.image} unoptimized width={72} />
      <span className="supply-backpack-item-name">{item.name}</span>
      <span className="supply-backpack-quantity">x{item.quantity}</span>
    </button>
  );
}

function BackpackDetailPanel({ data }: { data: SupplyBackpackPreview }) {
  const detail = data.selectedItemDetail;

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
        <button type="button">{detail.primaryAction}</button>
        <button type="button">{detail.secondaryAction}</button>
      </div>
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
      <span aria-hidden="true">💡</span>
      <b>小提示：</b>
      <p>{hint}</p>
      <Link href="/ui-lab/supply-dashboard">帮助中心</Link>
    </footer>
  );
}
