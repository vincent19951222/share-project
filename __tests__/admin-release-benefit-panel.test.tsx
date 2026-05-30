import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminReleaseBenefitPanel } from "@/components/admin/AdminReleaseBenefitPanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("AdminReleaseBenefitPanel", () => {
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
    vi.unstubAllGlobals();
  });

  it("submits a release benefit batch to the admin API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ amount: 20, grantKey: "release-0.3.0", grantedCount: 5 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(
        <AdminReleaseBenefitPanel
          memberCount={5}
          defaultGrantKey="release-0.3.0"
        />,
      );
    });

    const grantKeyInput = container.querySelector<HTMLInputElement>('input[name="grantKey"]');
    const messageInput = container.querySelector<HTMLTextAreaElement>('textarea[name="message"]');

    expect(container.textContent).toContain("版本福利");
    expect(grantKeyInput?.value).toBe("release-0.3.0");
    expect(messageInput?.value).toContain("大版本更新福利");

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("发放福利券"),
    );

    await act(async () => {
      submitButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/gamification/release-benefit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          grantKey: "release-0.3.0",
          message: "大版本更新福利已到账，每人 20 张抽奖券。",
        }),
      }),
    );
    expect(container.textContent).toContain("已给 5 位队员发放 20 张抽奖券");
  });

  it("shows a readable duplicate batch error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "benefit-already-granted" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(
        <AdminReleaseBenefitPanel
          memberCount={5}
          defaultGrantKey="release-0.3.0"
        />,
      );
    });

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("发放福利券"),
    );

    await act(async () => {
      submitButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushPromises();
    });

    expect(container.textContent).toContain("这个福利批次已经发过了");
  });
});
