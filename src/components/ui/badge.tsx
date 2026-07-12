export type BadgeTone = "neutral" | "salvia" | "atencao" | "erro";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-berinjela-50 text-neutro-700",
  salvia: "bg-salvia-bg text-salvia-text",
  atencao: "bg-atencao-bg text-atencao-text",
  erro: "bg-erro-bg text-erro-text",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function BadgeDot({ tone = "neutral" }: { tone?: BadgeTone }) {
  const DOT_CLASSES: Record<BadgeTone, string> = {
    neutral: "bg-neutro-500",
    salvia: "bg-salvia",
    atencao: "bg-atencao",
    erro: "bg-erro",
  };
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} />;
}
