import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Tone = "neutral" | "atencao" | "erro";

// o número só ganha cor quando significa um problema — cor aqui é
// sinalização, não decoração (seção 7.3 do doc)
const VALUE_CLASSES: Record<Tone, string> = {
  neutral: "text-berinjela",
  atencao: "text-atencao-text",
  erro: "text-erro-text",
};

const ICON_CLASSES: Record<Tone, string> = {
  neutral: "bg-berinjela-50 text-neutro-500",
  atencao: "bg-atencao-bg text-atencao-text",
  erro: "bg-erro-bg text-erro-text",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  href?: string;
}) {
  const conteudo = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-neutro-500">{label}</p>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ${ICON_CLASSES[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
      </div>
      <p className={`text-2xl font-semibold ${VALUE_CLASSES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutro-500">{hint}</p>}
    </>
  );

  const classes = "rounded-xl border border-border bg-white p-4";

  if (!href) return <div className={classes}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={`${classes} block transition-shadow duration-150 hover:shadow-md`}
    >
      {conteudo}
    </Link>
  );
}
