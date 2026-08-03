/**
 * Cabeçalho padrão de todas as telas.
 *
 * No desktop é título à esquerda e ação à direita, como sempre foi. No
 * celular a ação desce pra baixo e ocupa a largura toda — antes ela era
 * espremida na mesma linha do título e virava um alvo de toque ruim, que é
 * justamente onde os fluxos de cadastro rápido acontecem.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-berinjela sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-neutro-500">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}
