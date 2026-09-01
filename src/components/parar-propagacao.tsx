"use client";

/**
 * Impede que o clique num controle interno (toggle, excluir) dispare o
 * onClick do card/linha que o envolve — precisa ser Client Component porque
 * a página que usa isso (ex: /produtos) é Server Component, e um onClick
 * inline não é serializável nas props passadas pro Client Component pai.
 */
export function PararPropagacao({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </div>
  );
}
