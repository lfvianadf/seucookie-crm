import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white px-6 py-16 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-berinjela-50 text-neutro-500">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="mb-4 text-sm text-neutro-500">{title}</p>
      {action}
    </div>
  );
}
