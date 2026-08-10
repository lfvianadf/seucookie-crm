import type { ButtonHTMLAttributes } from "react";

type Tone = "neutral" | "destructive";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-neutro-500 hover:bg-berinjela-50 hover:text-berinjela",
  destructive: "text-neutro-500 hover:bg-erro-bg hover:text-erro",
};

// "toque" = alvo de 44px, mínimo confortável no celular. Usado nas listas
// mobile, onde não existe hover pra revelar a ação.
const SIZE_CLASSES = {
  sm: "h-8 w-8",
  toque: "h-11 w-11",
} as const;

export function IconButton({
  tone = "neutral",
  size = "sm",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <button
      type="button"
      className={`flex ${SIZE_CLASSES[size]} shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-30 ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
