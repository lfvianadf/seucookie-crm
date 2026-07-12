"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { border: string; icon: React.ReactNode }> = {
  success: {
    border: "border-l-salvia",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-salvia" strokeWidth={1.75} />,
  },
  error: {
    border: "border-l-erro",
    icon: <AlertCircle className="h-4 w-4 shrink-0 text-erro" strokeWidth={1.75} />,
  },
  info: {
    border: "border-l-atencao",
    icon: <Info className="h-4 w-4 shrink-0 text-atencao" strokeWidth={1.75} />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in flex items-center gap-2.5 rounded-lg border-l-4 bg-white px-4 py-3 shadow-modal ${TONE_STYLES[t.tone].border}`}
          >
            {TONE_STYLES[t.tone].icon}
            <p className="text-sm font-medium text-berinjela">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de ToastProvider");
  return ctx.toast;
}
