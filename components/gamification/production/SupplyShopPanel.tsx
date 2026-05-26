"use client";

import { useMemo, useState } from "react";

import type {
  GamificationBackpackCategory,
  SupplyShopProductSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyShopAction = "purchase-shop-item";

export interface SupplyShopPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyShopAction | string | null;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onPurchase: (itemId: string) => void;
}

type CategoryFilter = "all" | GamificationBackpackCategory;

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatCategoryLabel(category: GamificationBackpackCategory) {
  const labels: Record<GamificationBackpackCategory, string> = {
    boost: "增益",
    protection: "保护",
    social: "社交",
    lottery: "抽奖",
    task: "任务",
    cosmetic: "装扮",
    real_world: "真实福利",
    unknown: "未知",
  };

  return labels[category];
}

function formatLimit(product: SupplyShopProductSnapshot) {
  const limits = [];

  if (product.dailyLimit !== undefined) {
    limits.push(`每日限购 ${formatNumber(product.dailyLimit)}`);
  }

  if (product.weeklyLimit !== undefined) {
    limits.push(`每周限购 ${formatNumber(product.weeklyLimit)}`);
  }

  return limits;
}

function getFilteredProducts(
  products: SupplyShopProductSnapshot[],
  category: CategoryFilter,
) {
  if (category === "all") {
    return products;
  }

  return products.filter((product) => product.category === category);
}

function getSelectedProduct(
  products: SupplyShopProductSnapshot[],
  selectedItemId: string | null,
) {
  return products.find((product) => product.itemId === selectedItemId) ?? products[0] ?? null;
}

export function SupplyShopPanel({
  activeAction,
  onPurchase,
  onSelectItem,
  selectedItemId,
  snapshot,
}: SupplyShopPanelProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const products = snapshot.shop.products;
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );
  const filteredProducts = getFilteredProducts(products, category);
  const selectedProduct = getSelectedProduct(filteredProducts, selectedItemId);
  const isBusy = activeAction !== null;

  return (
    <section className="supply-production-shop" aria-label="补给商店">
      <header className="supply-production-shop__header">
        <div>
          <p>牛马补给站</p>
          <h2>补给商店</h2>
        </div>
        <article className="supply-production-shop__wallet" aria-label="银子余额">
          <span>{snapshot.resources.coins.label}</span>
          <strong>{formatNumber(snapshot.resources.coins.value)}</strong>
        </article>
      </header>

      <nav className="supply-production-shop__filters" aria-label="商品分类">
        <button
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
          type="button"
        >
          全部
        </button>
        {categories.map((categoryKey) => (
          <button
            aria-pressed={category === categoryKey}
            key={categoryKey}
            onClick={() => setCategory(categoryKey)}
            type="button"
          >
            {formatCategoryLabel(categoryKey)}
          </button>
        ))}
      </nav>

      <div className="supply-production-shop__layout">
        <section className="supply-production-shop__catalog" aria-label="商品列表">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const limits = formatLimit(product);

              return (
                <button
                  aria-selected={selectedProduct?.itemId === product.itemId}
                  className="supply-production-shop__product"
                  data-item-id={product.itemId}
                  data-testid="supply-shop-product"
                  key={product.itemId}
                  onClick={() => onSelectItem(product.itemId)}
                  type="button"
                >
                  <strong>{product.name}</strong>
                  <span>{formatCategoryLabel(product.category)}</span>
                  <p>{product.description}</p>
                  <small>银子 {formatNumber(product.priceCoins)}</small>
                  <small>持有 {formatNumber(product.ownedQuantity)}</small>
                  {limits.map((limit) => (
                    <small key={limit}>{limit}</small>
                  ))}
                  {product.requiresAdminConfirmation ? <small>管理员确认</small> : null}
                  {!product.purchaseEnabled && product.purchaseDisabledReason ? (
                    <small>{product.purchaseDisabledReason}</small>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p>补给商店暂时没有可购买商品</p>
          )}
        </section>

        <section className="supply-production-shop__detail" aria-label="商品详情">
          {selectedProduct ? (
            <article>
              <header>
                <span>{formatCategoryLabel(selectedProduct.category)}</span>
                <h3>{selectedProduct.name}</h3>
                <p>银子 {formatNumber(selectedProduct.priceCoins)}</p>
              </header>
              <p>{selectedProduct.description}</p>
              <dl>
                <div>
                  <dt>当前持有</dt>
                  <dd>{formatNumber(selectedProduct.ownedQuantity)}</dd>
                </div>
                {formatLimit(selectedProduct).map((limit) => (
                  <div key={limit}>
                    <dt>购买限制</dt>
                    <dd>{limit}</dd>
                  </div>
                ))}
                {selectedProduct.requiresAdminConfirmation ? (
                  <div>
                    <dt>兑换方式</dt>
                    <dd>管理员确认</dd>
                  </div>
                ) : null}
              </dl>
              {!selectedProduct.purchaseEnabled && selectedProduct.purchaseDisabledReason ? (
                <p>{selectedProduct.purchaseDisabledReason}</p>
              ) : null}
              <button
                data-action="purchase-shop-item"
                disabled={isBusy || !selectedProduct.purchaseEnabled}
                onClick={() => onPurchase(selectedProduct.itemId)}
                type="button"
              >
                {activeAction === "purchase-shop-item"
                  ? "购买中"
                  : selectedProduct.purchaseEnabled
                    ? "购买"
                    : "暂不可买"}
              </button>
            </article>
          ) : (
            <p>补给商店暂时没有可购买商品</p>
          )}
        </section>
      </div>
    </section>
  );
}
