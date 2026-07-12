import type { ButtonHTMLAttributes } from "react";

type Tone = "neutral" | "destructive";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-neutro-500 hover:bg-berinjela-50 hover:text-berinjela",
  destructive: "text-neutro-500 hover:bg-erro-bg hover:text-erro",
};

export function IconButton({
  tone = "neutral",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 ease-out ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
