"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { formatarTelefone, normalizarTelefone } from "@/lib/telefone";

/**
 * Campo de telefone com máscara.
 *
 * Guarda o valor formatado só pra exibição; o que é enviado ao servidor são
 * os dígitos, num campo oculto. Assim o telefone entra no banco sempre no
 * mesmo formato e continua servindo como chave pra reencontrar o cliente.
 *
 * `name` faz o campo funcionar em <form> nativo; `onChange` (com os dígitos
 * já limpos) atende quem controla o estado por fora.
 */
export function InputTelefone({
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value?: string;
  onChange?: (digitos: string) => void;
}) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(
    formatarTelefone(String(defaultValue ?? ""))
  );

  const exibido = controlado ? formatarTelefone(value) : interno;

  return (
    <>
      <Input
        {...props}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={props.placeholder ?? "(84) 99999-8888"}
        value={exibido}
        onChange={(e) => {
          const digitos = normalizarTelefone(e.target.value);
          if (!controlado) setInterno(formatarTelefone(digitos));
          onChange?.(digitos);
        }}
        onBlur={onBlur}
      />
      {/* o formulário envia os dígitos, não a máscara */}
      {name && <input type="hidden" name={name} value={normalizarTelefone(exibido)} />}
    </>
  );
}
