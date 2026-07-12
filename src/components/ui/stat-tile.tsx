import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-neutro-500">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-berinjela-50 text-neutro-500">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-berinjela">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutro-500">{hint}</p>}
    </div>
  );
}
