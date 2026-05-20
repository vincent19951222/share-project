import Image from "next/image";
import Link from "next/link";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type { SupplyShopPreview, SupplyShopProduct } from "./types";

const rarityTone: Record<SupplyShopProduct["rarity"], "muted" | "warning" | "success"> = {
  common: "muted",
  rare: "success",
  sr: "warning",
  ssr: "warning",
};

function formatPrice(product: SupplyShopProduct) {
  return `${product.price.currency === "coins" ? "银子" : "补给券"} ${product.price.amount}`;
}

function ShopSidebar({ data }: { data: SupplyShopPreview }) {
  return (
    <aside className="supply-shop-sidebar" aria-label="补给商店侧栏">
      <SupplyUiLabPixelPanel
        ariaLabel="补给商店分类"
        className="supply-shop-sidebar-card"
        title={
          <span className="supply-shop-sidebar-title">
            <span aria-hidden="true">▤</span>
            补给商店
          </span>
        }
      >
        <nav aria-label="补给商店分类" className="supply-shop-category-list">
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
        <div className="supply-shop-resource-card" aria-label="我的资源">
          <h3>我的资源</h3>
          {data.sidebar.resources.map((resource) => (
            <div className="supply-shop-resource-row" key={resource.id}>
              <span aria-hidden="true">{resource.icon}</span>
              <b>{resource.label}</b>
              <strong>{resource.value}</strong>
            </div>
          ))}
        </div>
        <Link className="supply-shop-back-link" href="/ui-lab/supply-dashboard">
          返回大厅
        </Link>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function ShopProductCard({ product }: { product: SupplyShopProduct }) {
  const limitLabel = product.dailyLimit?.label ?? product.stock?.label;
  const shouldShowLimitLabel = limitLabel !== undefined && !product.tags.includes(limitLabel);

  return (
    <button
      aria-label={product.name}
      aria-selected={product.selected}
      className={`supply-shop-product-card supply-shop-product-card--${product.rarity} ${
        product.selected ? "is-selected" : ""
      }`}
      data-testid="supply-shop-product-card"
      type="button"
    >
      <span className="supply-shop-product-image">
        <Image alt="" height={78} src={product.image} unoptimized width={78} />
      </span>
      <span className="supply-shop-product-body">
        <strong>{product.name}</strong>
        <em>{product.subtitle}</em>
        <span className="supply-shop-product-tags">
          {product.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
        {shouldShowLimitLabel ? <small>{limitLabel}</small> : null}
      </span>
      <span className="supply-shop-product-price">{formatPrice(product)}</span>
    </button>
  );
}

function ShopCatalog({ data }: { data: SupplyShopPreview }) {
  return (
    <section className="supply-shop-catalog" aria-label="商品列表">
      <SupplyUiLabPixelPanel ariaLabel="商品列表" className="supply-shop-catalog-card">
        <div className="supply-shop-catalog-toolbar">
          <SupplyUiLabFilterBar ariaLabel="商品筛选" filters={data.filters} />
          <label className="supply-shop-sort-control">
            <span>排序</span>
            <select aria-label="商品排序" defaultValue={data.selectedSort}>
              {data.sortOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="supply-shop-product-grid">
          {data.products.map((product) => (
            <ShopProductCard key={product.id} product={product} />
          ))}
        </div>
        <footer className="supply-shop-notice" id="rules">
          <p>{data.notice}</p>
          <Link href="#rules">了解更多规则</Link>
        </footer>
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function ShopDetail({ data }: { data: SupplyShopPreview }) {
  const selectedProduct =
    data.products.find((product) => product.id === data.selectedProductDetail.productId) ??
    data.products.find((product) => product.selected) ??
    data.products[0];

  if (!selectedProduct) {
    return null;
  }

  return (
    <aside className="supply-shop-detail" aria-label={`商品详情：${selectedProduct?.name ?? "补给商品"}`}>
      <SupplyUiLabPixelPanel
        ariaLabel={`商品详情：${selectedProduct?.name ?? "补给商品"}`}
        className="supply-shop-detail-card"
      >
        <div className="supply-shop-detail-hero">
          <div className="supply-shop-detail-image">
            <SupplyUiLabStatusBadge tone={rarityTone[selectedProduct.rarity]}>
              {selectedProduct.rarity.toUpperCase()}
            </SupplyUiLabStatusBadge>
            <Image alt="" height={120} src={selectedProduct.image} unoptimized width={120} />
          </div>
          <div>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.subtitle}</p>
            <strong>持有 {selectedProduct.ownedQuantity}</strong>
          </div>
        </div>
        <p className="supply-shop-detail-description">{data.selectedProductDetail.description}</p>
        <dl className="supply-shop-detail-rules">
          <div>
            <dt>效果</dt>
            <dd>{data.selectedProductDetail.effect}</dd>
          </div>
          <div>
            <dt>使用时机</dt>
            <dd>{data.selectedProductDetail.useTiming}</dd>
          </div>
          <div>
            <dt>购买限制</dt>
            <dd>{data.selectedProductDetail.purchaseLimit}</dd>
          </div>
        </dl>
        <div className="supply-shop-detail-cost">
          <span>花费</span>
          <strong>{data.selectedProductDetail.costLabel}</strong>
        </div>
        <p className="supply-shop-detail-footnote">{data.selectedProductDetail.footnote}</p>
        <SupplyUiLabActionButton
          className="supply-shop-redeem-button"
          disabled={data.selectedProductDetail.redeemDisabled}
          tone="primary"
        >
          {data.selectedProductDetail.redeemDisabled
            ? data.selectedProductDetail.redeemDisabledReason
            : `兑换 ${selectedProduct.name}`}
        </SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

export function SupplyShopScene({ data }: { data: SupplyShopPreview }) {
  return (
    <main className="supply-shop-scene" aria-label="补给商店 UI Lab">
      <div className="supply-shop-background" aria-hidden="true" />
      <div className="supply-shop-content">
        <SupplyUiLabTopBar activeLabel="补给商店" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-shop-shell" aria-label="补给商店静态复刻">
          <ShopSidebar data={data} />
          <ShopCatalog data={data} />
          <ShopDetail data={data} />
        </section>
      </div>
    </main>
  );
}
