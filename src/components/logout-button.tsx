"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-white/60 transition-colors duration-150 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
      )}
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}
