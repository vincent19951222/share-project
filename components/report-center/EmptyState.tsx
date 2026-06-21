export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center p-4 text-center text-sub">
      <p>{message}</p>
    </div>
  );
}
