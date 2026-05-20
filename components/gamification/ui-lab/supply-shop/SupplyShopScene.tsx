"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyShopCategoryId,
  SupplyShopFilterId,
  SupplyShopPreview,
  SupplyShopProduct,
  SupplyShopProductDetail,
} from "./types";

const rarityTone: Record<SupplyShopProduct["rarity"], "muted" | "warning" | "success"> = {
  N: "muted",
  R: "success",
  SR: "warning",
  SSR: "warning",
};

const rarityClassName: Record<SupplyShopProduct["rarity"], string> = {
  N: "common",
  R: "rare",
  SR: "sr",
  SSR: "ssr",
};

function formatPrice(product: SupplyShopProduct) {
  return `银子 ${product.price.amount}`;
}

function findDetail(data: SupplyShopPreview, productId: string): SupplyShopProductDetail {
  return (
    data.productDetails.find((detail) => detail.productId === productId) ??
    data.selectedProductDetail ??
    data.productDetails[0]
  );
}

function applyFilter(product: SupplyShopProduct, filterId: SupplyShopFilterId) {
  if (filterId === "redeemable") {
    return product.price.currency === "coins";
  }

  if (filterId === "owned") {
    return product.ownedQuantity > 0;
  }

  if (filterId === "admin") {
    return product.requiresAdminConfirmation;
  }

  return true;
}

function ShopSidebar({
  data,
  selectedCategoryId,
  onSelectCategory,
}: {
  data: SupplyShopPreview;
  selectedCategoryId: SupplyShopCategoryId;
  onSelectCategory: (categoryId: SupplyShopCategoryId) => void;
}) {
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
          {data.sidebar.categories.map((category) => {
            const isActive = category.id === selectedCategoryId;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "is-active" : undefined}
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                type="button"
              >
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
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

function ShopProductCard({
  product,
  selected,
  onSelect,
}: {
  product: SupplyShopProduct;
  selected: boolean;
  onSelect: (productId: string) => void;
}) {
  return (
    <button
      aria-label={product.name}
      aria-selected={selected}
      className={`supply-shop-product-card supply-shop-product-card--${rarityClassName[product.rarity]} ${
        selected ? "is-selected" : ""
      }`}
      data-testid="supply-shop-product-card"
      onClick={() => onSelect(product.id)}
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
        <small>
          {product.sourceLabel} · {product.limitLabel}
        </small>
      </span>
      <span className="supply-shop-product-price">{formatPrice(product)}</span>
    </button>
  );
}

function ShopCatalog({
  data,
  products,
  rulesExpanded,
  selectedFilterId,
  selectedProductId,
  onRedeem,
  onSelectFilter,
  onSelectProduct,
  onToggleRules,
}: {
  data: SupplyShopPreview;
  products: SupplyShopProduct[];
  rulesExpanded: boolean;
  selectedFilterId: SupplyShopFilterId;
  selectedProductId: string;
  onRedeem: () => void;
  onSelectFilter: (filterId: string) => void;
  onSelectProduct: (productId: string) => void;
  onToggleRules: () => void;
}) {
  const filters = data.filters.map((filter) => ({
    ...filter,
    active: filter.id === selectedFilterId,
  }));

  return (
    <section className="supply-shop-catalog" aria-label="商品列表">
      <SupplyUiLabPixelPanel ariaLabel="商品列表" className="supply-shop-catalog-card">
        <div className="supply-shop-catalog-toolbar">
          <SupplyUiLabFilterBar ariaLabel="商品筛选" filters={filters} onSelect={onSelectFilter} />
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
          {products.map((product) => (
            <ShopProductCard
              key={product.id}
              onSelect={onSelectProduct}
              product={product}
              selected={product.id === selectedProductId}
            />
          ))}
        </div>
        <footer className="supply-shop-notice">
          <p>{data.notice}</p>
          <div className="supply-shop-catalog-actions">
            <button
              aria-expanded={rulesExpanded}
              className="supply-shop-rules-toggle"
              onClick={onToggleRules}
              type="button"
            >
              本页规则
            </button>
            <button className="supply-shop-inline-redeem" onClick={onRedeem} type="button">
              兑换当前选中
            </button>
          </div>
          {rulesExpanded ? (
            <ol className="supply-shop-rules-panel">
              {data.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          ) : null}
        </footer>
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function ShopDetail({
  detail,
  feedbackMessage,
  onRedeem,
  product,
}: {
  detail: SupplyShopProductDetail;
  feedbackMessage: string;
  onRedeem: () => void;
  product: SupplyShopProduct;
}) {
  return (
    <aside className="supply-shop-detail" aria-label={`商品详情：${product.name}`}>
      <SupplyUiLabPixelPanel ariaLabel={`商品详情：${product.name}`} className="supply-shop-detail-card">
        <div className="supply-shop-detail-hero">
          <div className="supply-shop-detail-image">
            <SupplyUiLabStatusBadge tone={rarityTone[product.rarity]}>
              {product.rarity}
            </SupplyUiLabStatusBadge>
            <Image alt="" height={120} src={product.image} unoptimized width={120} />
          </div>
          <div>
            <h2>{product.name}</h2>
            <p>{product.subtitle}</p>
            <strong>{detail.ownedLabel}</strong>
          </div>
        </div>
        <p className="supply-shop-detail-description">{detail.description}</p>
        <dl className="supply-shop-detail-rules">
          <div>
            <dt>来源</dt>
            <dd>{detail.sourceLabel}</dd>
          </div>
          <div>
            <dt>效果</dt>
            <dd>{detail.effect}</dd>
          </div>
          <div>
            <dt>使用时机</dt>
            <dd>{detail.useTiming}</dd>
          </div>
          <div>
            <dt>购买限制</dt>
            <dd>{detail.purchaseLimit}</dd>
          </div>
        </dl>
        <div className="supply-shop-detail-cost">
          <span>花费</span>
          <strong>{detail.costLabel}</strong>
        </div>
        {detail.adminConfirmationLabel ? (
          <p className="supply-shop-admin-note">{detail.adminConfirmationLabel}</p>
        ) : null}
        <p className="supply-shop-detail-footnote">{detail.footnote}</p>
        <SupplyUiLabActionButton className="supply-shop-redeem-button" onClick={onRedeem} tone="primary">
          {detail.redeemLabel}
        </SupplyUiLabActionButton>
        <p aria-live="polite" className="supply-shop-action-feedback" data-shop-feedback>
          {feedbackMessage}
        </p>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

export function SupplyShopScene({ data }: { data: SupplyShopPreview }) {
  const initialProductId = data.selectedProductDetail.productId;
  const [selectedCategoryId, setSelectedCategoryId] = useState<SupplyShopCategoryId>("all");
  const [selectedFilterId, setSelectedFilterId] = useState<SupplyShopFilterId>("all");
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(data.initialFeedback);

  const visibleProducts = useMemo(() => {
    return data.products.filter((product) => {
      const matchesCategory = selectedCategoryId === "all" || product.categoryId === selectedCategoryId;
      return matchesCategory && applyFilter(product, selectedFilterId);
    });
  }, [data.products, selectedCategoryId, selectedFilterId]);

  const selectedProduct =
    data.products.find((product) => product.id === selectedProductId) ?? visibleProducts[0] ?? data.products[0];
  const selectedDetail = findDetail(data, selectedProduct.id);

  function handleSelectCategory(categoryId: SupplyShopCategoryId) {
    setSelectedCategoryId(categoryId);
    const nextProduct = data.products.find((product) => categoryId === "all" || product.categoryId === categoryId);
    if (nextProduct) {
      setSelectedProductId(nextProduct.id);
    }
  }

  function handleSelectFilter(filterId: string) {
    const nextFilterId = filterId as SupplyShopFilterId;
    setSelectedFilterId(nextFilterId);
    const nextProduct = data.products.find((product) => {
      const matchesCategory = selectedCategoryId === "all" || product.categoryId === selectedCategoryId;
      return matchesCategory && applyFilter(product, nextFilterId);
    });

    if (nextProduct) {
      setSelectedProductId(nextProduct.id);
    }
  }

  function handleRedeem() {
    setFeedbackMessage(selectedDetail.redeemFeedback);
  }

  return (
    <main className="supply-shop-scene" aria-label="补给商店 UI Lab">
      <div className="supply-shop-background" aria-hidden="true" />
      <div className="supply-shop-content">
        <SupplyUiLabTopBar activeLabel="补给商店" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-shop-shell" aria-label="补给商店静态复刻">
          <ShopSidebar data={data} onSelectCategory={handleSelectCategory} selectedCategoryId={selectedCategoryId} />
          <ShopCatalog
            data={data}
            onRedeem={handleRedeem}
            onSelectFilter={handleSelectFilter}
            onSelectProduct={setSelectedProductId}
            onToggleRules={() => setRulesExpanded((expanded) => !expanded)}
            products={visibleProducts}
            rulesExpanded={rulesExpanded}
            selectedFilterId={selectedFilterId}
            selectedProductId={selectedProduct.id}
          />
          <ShopDetail
            detail={selectedDetail}
            feedbackMessage={feedbackMessage}
            onRedeem={handleRedeem}
            product={selectedProduct}
          />
        </section>
      </div>
    </main>
  );
}
