"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/insumos", label: "Insumos" },
  { href: "/insumos/receitas", label: "Receitas" },
  { href: "/insumos/producao", label: "Produção" },
];

export default function InsumosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active =
            tab.href === "/insumos"
              ? pathname === "/insumos" || pathname?.startsWith("/insumos/notas")
              : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`min-h-11 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out ${
                active
                  ? "border-rosa text-berinjela"
                  : "border-transparent text-neutro-500 hover:text-berinjela"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
