"use client";

import { useTransition } from "react";
import { MessageCircle, Gift, Download } from "lucide-react";
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
  const toast = useToast();

  const fidelidade = calcularFidelidade(saldo);
  const temCortesia = fidelidade.cortesias > 0;

  /**
   * Baixa o cartão como PNG.
   *
   * O wa.me só carrega texto na URL — não dá pra anexar imagem por link.
   * Então o fluxo é: baixa aqui, abre o WhatsApp com a mensagem pronta, e
   * você anexa o arquivo na conversa.
   *
   * Converte pra PNG porque o WhatsApp trata SVG como documento, não como
   * foto: chegaria como anexo pra baixar em vez de aparecer na conversa.
   */
  function baixarCartao() {
    const svg = cartaoFidelidadeSvg(nome, fidelidade);
    const img = new Image();
    const svgUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

    img.onload = () => {
      // 2x pra não sair borrado quando o WhatsApp reamostra a imagem
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1160;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cartao-${nome.trim().split(/\s+/)[0].toLowerCase()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast("Cartão baixado — anexe no WhatsApp");
      }, "image/png");
    };

    img.onerror = () => toast("Não foi possível gerar o cartão.");
    img.src = svgUrl;
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
    <div className="flex gap-2">
      {/* abre o WhatsApp com o texto pronto: você lê antes de enviar, em vez
          de o sistema disparar sozinho pelas suas costas */}
      <Button
        variant="secondary"
        onClick={baixarCartao}
        title="Baixa o cartão como imagem pra anexar no WhatsApp"
      >
        <Download className="h-4 w-4" strokeWidth={1.75} />
        Cartão
      </Button>

      <a
        href={linkWhatsApp(telefone, mensagemFidelidade(nome, fidelidade))}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 sm:flex-none"
      >
        <Button variant="secondary" className="w-full">
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          Avisar
        </Button>
      </a>

      {temCortesia && (
        <Button onClick={resgatar} loading={isPending} className="flex-1 sm:flex-none">
          <Gift className="h-4 w-4" strokeWidth={1.75} />
          Entreguei
        </Button>
      )}
    </div>
  );
}
