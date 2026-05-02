import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("AdminPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("keeps all admin sections reachable from a scrollable page shell", () => {
    act(() => {
      root.render(
        <AdminPageShell
          opsPanel={<section>运营观察</section>}
          configPanel={<section>配置总览</section>}
          seasonPanel={<section>赛季设置</section>}
        />,
      );
    });

    const shell = container.querySelector("[data-admin-page-shell]");

    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("overflow-y-auto");
    expect(container.querySelector('a[href="/"]')?.textContent).toContain("返回主页");
    expect(container.querySelector('a[href="#gamification-ops"]')?.textContent).toContain("运营观察");
    expect(container.querySelector('a[href="#gamification-config"]')?.textContent).toContain("配置总览");
    expect(container.querySelector('a[href="#season-admin"]')?.textContent).toContain("赛季设置");
    expect(container.querySelector("#gamification-ops")?.textContent).toContain("运营观察");
    expect(container.querySelector("#gamification-config")?.textContent).toContain("配置总览");
    expect(container.querySelector("#season-admin")?.textContent).toContain("赛季设置");
  });
});
