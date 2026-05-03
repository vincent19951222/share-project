import type { ReactNode } from "react";

interface AdminPageShellProps {
  opsPanel: ReactNode;
  configPanel: ReactNode;
  seasonPanel: ReactNode;
}

export function AdminPageShell({ opsPanel, configPanel, seasonPanel }: AdminPageShellProps) {
  return (
    <main
      data-admin-page-shell
      className="h-dvh overflow-y-auto overflow-x-hidden p-4 sm:p-6"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-8">
        <header className="soft-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">
              Admin Center
            </p>
            <h1 className="text-2xl font-black text-slate-900">管理中心</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="supply-inline-link" href="/">
              返回主页
            </a>
            <a className="supply-inline-link" href="#gamification-ops">
              运营观察
            </a>
            <a className="supply-inline-link" href="#gamification-config">
              配置总览
            </a>
            <a className="supply-inline-link" href="#season-admin">
              赛季设置
            </a>
          </div>
        </header>

        <section id="gamification-ops" className="scroll-mt-4">
          {opsPanel}
        </section>
        <section id="gamification-config" className="scroll-mt-4">
          {configPanel}
        </section>
        <section id="season-admin" className="scroll-mt-4">
          {seasonPanel}
        </section>
      </div>
    </main>
  );
}
