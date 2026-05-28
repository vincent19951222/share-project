export function BoardTabLoadingShell({ label }: { label: string }) {
  return (
    <section className="board-tab-loading-shell" aria-label={label} aria-busy="true">
      <div className="board-tab-loading-card">
        <span className="board-tab-loading-dot" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
    </section>
  );
}
