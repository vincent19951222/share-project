import { existsSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

function publicPath(src: string) {
  return `public${src}`;
}

describe("supply shop static assets", () => {
  it("references existing catalog-backed product media", () => {
    for (const product of supplyShopMock.products) {
      expect(existsSync(publicPath(product.image)), `${product.image} should exist`).toBe(true);
    }
  });

  it("does not reference retired independent shop item media", () => {
    const productImages = supplyShopMock.products.map((product) => product.image);

    expect(productImages.every((src) => !src.includes("/assets/home-scenes/supply/shop/"))).toBe(true);
  });
});
