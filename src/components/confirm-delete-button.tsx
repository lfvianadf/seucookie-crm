"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";

export function ConfirmDeleteButton({
  onConfirm,
  itemName,
  label,
  size,
  open: openControlado,
  onOpenChange,
  semBotao,
}: {
  onConfirm: () => Promise<void>;
  itemName: string;
  label?: string;
  size?: "sm" | "toque";
  /** controlado por quem chama — usado quando outro modal precisa
   *  fechar antes deste abrir */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** esconde o ícone de lixeira, deixando só o modal de confirmação */
  semBotao?: boolean;
}) {
  const [openInterno, setOpenInterno] = useState(false);
  const open = openControlado ?? openInterno;
  const setOpen = onOpenChange ?? setOpenInterno;
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
      toast(`${label ?? itemName} excluído`);
    });
  }

  return (
    <>
      {!semBotao && (
        <IconButton
          tone="destructive"
          size={size}
          onClick={() => setOpen(true)}
          aria-label={`Excluir ${itemName}`}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </IconButton>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Excluir ${label ?? itemName}?`}
        maxWidth="max-w-sm"
      >
        <p className="mb-6 text-sm text-neutro-500">
          Essa ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} loading={isPending}>
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  );
}
