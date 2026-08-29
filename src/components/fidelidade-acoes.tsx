"use client";

import { useState, useTransition } from "react";
import { Send, Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registrarResgate } from "@/lib/actions/fidelidade";
import {
  calcularFidelidade,
  mensagemFidelidade,
  linkWhatsApp,
} from "@/lib/fidelidade";
import { cartaoFidelidadeSvg } from "@/lib/cartao-svg";

export function FidelidadeAcoes({
  clienteId,
  nome,
  telefone,
  saldo,
}: {
  clienteId: string;
  nome: string;
  telefone: string;
  saldo: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [enviando, setEnviando] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const toast = useToast();

  const fidelidade = calcularFidelidade(saldo);
  const temCortesia = fidelidade.cortesias > 0;
  const mensagem = mensagemFidelidade(nome, fidelidade);

  /** Rasteriza o cartão. PNG e não SVG porque o WhatsApp trata SVG como
   *  documento — chegaria como anexo pra baixar, não como foto na conversa. */
  function gerarPng(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // 2x pra não borrar quando o WhatsApp reamostra
        const canvas = document.createElement("canvas");
        canvas.width = 1800;
        canvas.height = 1240;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("sem canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("sem blob"))),
          "image/png"
        );
      };
      img.onerror = () => reject(new Error("falha ao carregar svg"));
      img.src =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(cartaoFidelidadeSvg(nome, fidelidade));
    });
  }

  /**
   * Manda o cartão pro cliente.
   *
   * O wa.me só aceita texto na URL — nenhum link consegue anexar imagem.
   * Então há dois caminhos, nesta ordem:
   *
   * 1. Compartilhamento nativo (celular): abre a folha do sistema com imagem
   *    e texto juntos; você escolhe WhatsApp e o contato. É o mais próximo de
   *    um clique só.
   * 2. Baixar + abrir a conversa (desktop, ou celular sem suporte): o arquivo
   *    cai na pasta de downloads e o WhatsApp abre com o texto pronto pra
   *    você anexar.
   */
  async function enviarCartao() {
    setEnviando(true);
    try {
      const blob = await gerarPng();
      const primeiroNome = nome.trim().split(/\s+/)[0].toLowerCase();
      const arquivo = new File([blob], `cartao-${primeiroNome}.png`, {
        type: "image/png",
      });

      // canShare com files é o teste que importa: navigator.share existe em
      // navegadores que não aceitam arquivo, e aí o envio falharia calado
      if (navigator.canShare?.({ files: [arquivo] })) {
        // Só o arquivo. Mandar `text` junto fazia o WhatsApp tratar os dois
        // como itens separados e enviar o cartão duas vezes; `title` seria
        // ignorado pela maioria dos apps, e o texto sumiria sem aviso. A
        // mensagem fica na tela pra copiar quando quiser.
        await navigator.share({ files: [arquivo] });
        setEnviando(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo.name;
      link.click();
      URL.revokeObjectURL(url);

      window.open(linkWhatsApp(telefone, mensagem), "_blank", "noopener");
      toast("Cartão baixado — anexe na conversa que abriu");
    } catch (e) {
      // cancelar a folha de compartilhamento cai aqui; não é erro pra avisar
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast("Não foi possível gerar o cartão.");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiada(true);
      // volta ao normal sozinho: um "copiado!" permanente vira ruído
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      toast("Não foi possível copiar.");
    }
  }

  function resgatar() {
    startTransition(async () => {
      try {
        await registrarResgate(clienteId);
        toast("Cortesia entregue, cartão zerado");
      } catch (e) {
        toast(
          e instanceof Error && e.message
            ? e.message
            : "Não foi possível registrar."
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={enviarCartao}
          loading={enviando}
          className="flex-1 sm:flex-none"
        >
          <Send className="h-4 w-4" strokeWidth={1.75} />
          Enviar cartão
        </Button>

        {temCortesia && (
          <Button onClick={resgatar} loading={isPending} className="flex-1 sm:flex-none">
            <Gift className="h-4 w-4" strokeWidth={1.75} />
            Entreguei
          </Button>
        )}
      </div>

      {/* sugestão de legenda: o compartilhamento manda só a imagem, então o
          texto fica aqui à mão pra quem quiser mandar junto */}
      <button
        type="button"
        onClick={copiarMensagem}
        className="group flex w-full cursor-pointer gap-2 rounded-lg border border-border bg-berinjela-50/50 px-3 py-2 text-left transition-colors duration-150 hover:bg-berinjela-50"
      >
        <span className="min-w-0 flex-1 text-xs leading-relaxed text-neutro-600">
          {mensagem}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-neutro-500 group-hover:text-berinjela">
          {copiada ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              copiar
            </>
          )}
        </span>
      </button>
    </div>
  );
}
