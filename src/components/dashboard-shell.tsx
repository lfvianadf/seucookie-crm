"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // fecha o menu automaticamente ao navegar — ajustado durante o render
  // (não em efeito) pra evitar o cascading render que o React desaconselha.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setOpen(false);
  }

  // trava o scroll do body enquanto o drawer mobile está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex min-h-screen flex-col bg-neutro-50 md:h-screen md:flex-row md:overflow-hidden">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-berinjela px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span className="text-sm font-semibold text-white">Seu Cookie</span>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="animate-overlay-in fixed inset-0 z-40 cursor-default bg-berinjela/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out md:static md:z-auto md:flex md:h-screen md:shrink-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          userEmail={userEmail}
          onNavigate={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      </div>

      {/* só o conteúdo rola: a sidebar fica fixa no desktop */}
      <main className="min-w-0 flex-1 overflow-x-auto px-4 py-4 md:overflow-y-auto md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
