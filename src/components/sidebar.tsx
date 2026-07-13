"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cookie,
  ClipboardList,
  Users,
  Package,
  Truck,
  X,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { LogoutButton } from "@/components/logout-button";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Cardápio", icon: Cookie },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/insumos", label: "Insumos", icon: Package },
  { href: "/entregas", label: "Entregas", icon: Truck },
];

export function Sidebar({
  userEmail,
  onNavigate,
  onClose,
}: {
  userEmail: string;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-berinjela text-white md:h-auto md:w-56 md:self-stretch">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <Image
          src="/logo-mascote.png"
          alt=""
          width={32}
          height={32}
          className="rounded-full"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wide">Seu Cookie</p>
          <p className="text-xs text-white/50">CRM de gestão</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="mb-2 truncate text-xs text-white/40">{userEmail}</p>
        <form action={logout}>
          <LogoutButton />
        </form>
      </div>
    </aside>
  );
}
