"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";

export function ConfirmDeleteButton({
  onConfirm,
  itemName,
  label,
}: {
  onConfirm: () => Promise<void>;
  itemName: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
      toast(`${label ?? itemName} excluído`);
      router.refresh();
    });
  }

  return (
    <>
      <IconButton
        tone="destructive"
        onClick={() => setOpen(true)}
        aria-label={`Excluir ${itemName}`}
        title="Excluir"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>

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
