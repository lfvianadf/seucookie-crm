"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

// Para formulários com action direto (Server Action), sem useTransition no
// componente pai. useFormStatus só funciona dentro de um <form> — por isso
// esse botão precisa ser um componente separado (client) do que renderiza
// o <form>. Mostra loading e trava clique duplo sozinho.
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" loading={pending}>
      {children}
    </Button>
  );
}
