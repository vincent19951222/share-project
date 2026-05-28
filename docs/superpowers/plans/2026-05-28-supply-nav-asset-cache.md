# Supply Nav Asset Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让顶部导航右侧的补给站资产在主页面 tab 切换时保持稳定，不再因重新请求而闪烁；只有首次加载或补给站资产变更后才请求并更新。

**Architecture:** 新增一个很小的客户端模块级缓存，保存 `SupplyNavContext`。普通主页面先读缓存，有缓存就直接渲染并跳过请求；无缓存才请求一次。补给站内的购买、抽奖、用道具、完成任务等 mutation 继续刷新生产 snapshot，并同步更新同一份 nav cache。

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest + jsdom, Tailwind/CSS in `app/globals.css`。

---

## Files

- Create: `lib/supply-nav-cache.ts`
  - 负责保存、读取、确保加载、测试重置补给站导航资产缓存。
- Modify: `components/board/BoardApp.tsx`
  - 初始化时从 cache 读取 `supplyNavContext`。
  - 非补给站 tab 只在没有 cache 时请求补给站状态。
- Modify: `components/gamification/production/SupplyStationShell.tsx`
  - 首次加载和 mutation 后刷新 snapshot 时同步写入 nav cache。
  - 卸载时不再把父级 nav context 清空。
- Modify: `components/navbar/Navbar.tsx`
  - 资产容器常驻；数据未加载时显示固定宽度 skeleton。
- Modify: `app/globals.css`
  - 给资产容器和 skeleton 固定尺寸，避免布局跳动。
- Modify: `__tests__/home-supply-navigation.test.tsx`
  - 覆盖首次无 cache 请求、切换主 tab 复用 cache 且不重复请求。
- Modify: `__tests__/supply-production-shell.test.tsx`
  - 覆盖补给站 mutation 后 cache 更新。
- Modify: `__tests__/navbar-supply-chrome.test.tsx`
  - 覆盖无数据时仍渲染稳定资产占位。

---

### Task 1: Add Supply Nav Cache Tests

**Files:**
- Modify: `__tests__/home-supply-navigation.test.tsx`

- [ ] **Step 1: 写失败测试：普通 tab 有 cache 时不重新请求**

Add imports near the top:

```ts
import { cacheSupplyNavSnapshot, resetSupplyNavContextCacheForTests } from "@/lib/supply-nav-cache";
```

In `afterEach`, call:

```ts
resetSupplyNavContextCacheForTests();
```

Add this test:

```tsx
  it("reuses cached supply assets on regular tab switches without refetching", async () => {
    cacheSupplyNavSnapshot(supplySnapshot as never);
    activeTab = "punch";
    const { default: Home } = await import("@/app/(board)/page");

    await act(async () => {
      root.render(<Home />);
    });

    expect(fetchSupplyStationStateMock).not.toHaveBeenCalled();
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "punch",
        supplyNavContext: expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({ id: "coins", value: 440 }),
            expect.objectContaining({ id: "ticket", value: 7 }),
            expect.objectContaining({ id: "backpack", value: 12, maxValue: 60 }),
          ]),
        }),
      }),
    );

    navbarPropsMock.mockClear();
    activeTab = "board";
    const { default: SharedBoardRoutePage } = await import("@/app/(board)/board/page");

    await act(async () => {
      root.render(<SharedBoardRoutePage />);
    });

    expect(fetchSupplyStationStateMock).not.toHaveBeenCalled();
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "board",
        supplyNavContext: expect.objectContaining({
          profile: { username: "li", avatarKey: "male1" },
        }),
      }),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx
```

Expected: FAIL because `@/lib/supply-nav-cache` does not exist yet.

---

### Task 2: Implement Supply Nav Cache

**Files:**
- Create: `lib/supply-nav-cache.ts`
- Modify: `components/board/BoardApp.tsx`

- [ ] **Step 1: Create cache helper**

Create `lib/supply-nav-cache.ts`:

```ts
import { fetchSupplyStationState } from "@/lib/api";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import { buildSupplyNavContext } from "@/lib/supply-nav-context";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

let cachedSupplyNavContext: SupplyNavContext | null = null;
let pendingSupplyNavContext: Promise<SupplyNavContext> | null = null;

export function getCachedSupplyNavContext(): SupplyNavContext | null {
  return cachedSupplyNavContext;
}

export function cacheSupplyNavContext(context: SupplyNavContext | null): SupplyNavContext | null {
  cachedSupplyNavContext = context;
  return cachedSupplyNavContext;
}

export function cacheSupplyNavSnapshot(snapshot: SupplyStationProductionSnapshot): SupplyNavContext {
  return cacheSupplyNavContext(buildSupplyNavContext(snapshot))!;
}

export async function ensureSupplyNavContext(): Promise<SupplyNavContext> {
  if (cachedSupplyNavContext) {
    return cachedSupplyNavContext;
  }

  if (!pendingSupplyNavContext) {
    pendingSupplyNavContext = fetchSupplyStationState()
      .then(cacheSupplyNavSnapshot)
      .finally(() => {
        pendingSupplyNavContext = null;
      });
  }

  return pendingSupplyNavContext;
}

export function resetSupplyNavContextCacheForTests() {
  cachedSupplyNavContext = null;
  pendingSupplyNavContext = null;
}
```

- [ ] **Step 2: Use cache in BoardApp**

Update imports in `components/board/BoardApp.tsx`:

```ts
import {
  cacheSupplyNavContext,
  ensureSupplyNavContext,
  getCachedSupplyNavContext,
} from "@/lib/supply-nav-cache";
```

Remove direct imports of `fetchSupplyStationState` and `buildSupplyNavContext`.

Initialize state with cache:

```ts
  const [supplyNavContext, setSupplyNavContext] = useState<SupplyNavContext | null>(() =>
    getCachedSupplyNavContext(),
  );
```

Replace the non-supply effect with:

```ts
  useEffect(() => {
    if (activeTab === "supply") {
      return;
    }

    const cachedContext = getCachedSupplyNavContext();
    if (cachedContext) {
      setSupplyNavContext(cachedContext);
      return;
    }

    let cancelled = false;

    async function loadNavContext() {
      try {
        const context = await ensureSupplyNavContext();
        if (!cancelled) {
          setSupplyNavContext(context);
        }
      } catch {
        if (!cancelled && !getCachedSupplyNavContext()) {
          setSupplyNavContext(null);
        }
      }
    }

    void loadNavContext();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);
```

Update the supply callback:

```tsx
            onNavContextChange={(context) => {
              cacheSupplyNavContext(context);
              setSupplyNavContext(context);
            }}
```

- [ ] **Step 3: Run test to verify it passes**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx
```

Expected: PASS.

---

### Task 3: Keep Navbar Asset Slot Stable

**Files:**
- Modify: `__tests__/navbar-supply-chrome.test.tsx`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: 写失败测试：无资产数据时仍有占位容器**

Add this test:

```tsx
  it("keeps a stable asset placeholder before supply resources load", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={null} />);
    });

    expect(container.querySelector(".app-supply-assets")).not.toBeNull();
    expect(container.querySelector(".app-supply-assets--loading")).not.toBeNull();
    expect(container.querySelectorAll(".app-supply-asset-skeleton")).toHaveLength(3);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because `Navbar` does not render `.app-supply-assets` when context is `null`.

- [ ] **Step 3: Implement stable placeholder**

In `components/navbar/Navbar.tsx`, replace the asset conditional with:

```tsx
            <div
              className={`app-supply-assets${supplyNavContext ? "" : " app-supply-assets--loading"}`}
              aria-label={supplyNavContext ? "补给站资产" : "补给站资产加载中"}
              aria-busy={!supplyNavContext}
            >
              {supplyNavContext
                ? supplyNavContext.resources.map((resource) => {
                    const valueLabel = resource.maxValue ? `${resource.value}/${resource.maxValue}` : `${resource.value}`;

                    return (
                      <button
                        aria-label={`${resource.label} ${valueLabel}`}
                        className={`app-supply-asset-chip app-supply-asset-chip--${resource.id}`}
                        key={resource.id}
                        type="button"
                      >
                        <img src={resource.iconImage} alt="" aria-hidden="true" />
                        <span>{resource.label}</span>
                        <strong>{valueLabel}</strong>
                      </button>
                    );
                  })
                : ["coins", "ticket", "backpack"].map((resourceId) => (
                    <span
                      aria-hidden="true"
                      className={`app-supply-asset-chip app-supply-asset-skeleton app-supply-asset-chip--${resourceId}`}
                      key={resourceId}
                    >
                      <i />
                      <strong />
                    </span>
                  ))}
            </div>
```

Remove `const showSupplyAssets = Boolean(supplyNavContext);`.

Add CSS:

```css
.app-supply-assets {
  min-width: 9.75rem;
}

.app-supply-assets--loading {
  pointer-events: none;
}

.app-supply-asset-skeleton {
  min-width: 3rem;
}

.app-supply-asset-skeleton i,
.app-supply-asset-skeleton strong {
  display: block;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 48%, #e2e8f0 100%);
  background-size: 180% 100%;
  animation: supply-asset-skeleton 1.2s ease-in-out infinite;
}

.app-supply-asset-skeleton i {
  width: 1.55rem;
  height: 1.55rem;
}

.app-supply-asset-skeleton strong {
  width: 1.15rem;
  height: 0.85rem;
}

.app-supply-asset-skeleton.app-supply-asset-chip--backpack {
  min-width: 3.6rem;
}

.app-supply-asset-skeleton.app-supply-asset-chip--backpack strong {
  width: 1.75rem;
}

@keyframes supply-asset-skeleton {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}
```

- [ ] **Step 4: Run navbar test**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

---

### Task 4: Update Cache After Supply Mutations

**Files:**
- Modify: `__tests__/supply-production-shell.test.tsx`
- Modify: `components/gamification/production/SupplyStationShell.tsx`

- [ ] **Step 1: 写失败测试：mutation refresh 写入 cache**

Add imports near the top:

```ts
import { getCachedSupplyNavContext, resetSupplyNavContextCacheForTests } from "@/lib/supply-nav-cache";
```

In `afterEach`, call:

```ts
resetSupplyNavContextCacheForTests();
```

Add this test:

```tsx
  it("updates the shared nav asset cache after a supply mutation refreshes state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(
          createJsonResponse({
            purchase: {
              id: "purchase-1",
              itemId: "task_reroll_coupon",
              totalPriceCoins: 150,
            },
            snapshot: {},
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: buildSnapshot({
              resources: {
                coins: { label: "银子", value: 2250 },
                ticket: { label: "抽奖券", value: 12 },
                backpack: { label: "背包", value: 3, maxValue: 60 },
              },
            }),
          }),
        ),
    );
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell initialPanel="shop" />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='purchase-shop-item']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(getCachedSupplyNavContext()?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "coins", value: 2250 }),
        expect.objectContaining({ id: "backpack", value: 3, maxValue: 60 }),
      ]),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx
```

Expected: FAIL because `SupplyStationShell` has not written to the shared cache yet.

- [ ] **Step 3: Implement cache writes in shell**

Update imports:

```ts
import { cacheSupplyNavSnapshot } from "@/lib/supply-nav-cache";
```

Add helper in component:

```ts
  const applySnapshot = useCallback((nextSnapshot: SupplyStationProductionSnapshot) => {
    cacheSupplyNavSnapshot(nextSnapshot);
    setSnapshot(nextSnapshot);
  }, []);
```

Replace `setSnapshot(nextSnapshot);` in `loadSnapshot` and `runAction` with:

```ts
applySnapshot(nextSnapshot);
```

Update dependency arrays:

```ts
  }, [applySnapshot]);
```

and:

```ts
    [applySnapshot],
```

Remove the unmount cleanup that calls `onNavContextChange?.(null)`.

- [ ] **Step 4: Run shell tests**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx
```

Expected: PASS.

---

### Task 5: Final Verification

**Files:**
- All files above.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- __tests__/home-supply-navigation.test.tsx __tests__/navbar-supply-chrome.test.tsx __tests__/supply-production-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Manual browser verification**

Start a clean dev server if needed:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3003
```

Open:

```text
http://127.0.0.1:3003/
```

Manual expected result:

- 首次加载时，右侧资产区域最多显示固定宽度 skeleton，不挤动头像和主 tab。
- 从 `健身打卡` 切到 `共享看板`、`续命咖啡`、`战报中心` 时，`银子 / 抽奖券 / 背包` 不消失、不闪白、不导致右侧容器重新跳出来。
- hover `牛马补给站` 时二级 tab 仍出现。
- 在补给站里购买或抽奖后，资产数字更新；回到主页面后仍显示更新后的数字。

---

## Self Review

- Spec coverage: 覆盖了缓存、无 mutation 切 tab 不请求、mutation 后刷新、骨架屏/占位、测试和人工验收。
- Placeholder scan: 无 `TBD`、`TODO`、未定义步骤。
- Type consistency: 缓存模块统一使用 `SupplyNavContext` 与 `SupplyStationProductionSnapshot`；页面继续通过 `supplyNavContext` 传给 `Navbar`。
