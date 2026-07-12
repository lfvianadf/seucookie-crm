"use client";

import { useRef, useState } from "react";
import { Upload, Receipt } from "lucide-react";
import { Label } from "@/components/ui/field";

export function NotaUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setNomeArquivo(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file && inputRef.current) {
      const transferencia = new DataTransfer();
      transferencia.items.add(file);
      inputRef.current.files = transferencia.files;
      handleFile(file);
    }
  }

  return (
    <div>
      <Label>Foto do cupom</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 ease-out ${
          arrastando
            ? "border-rosa bg-rosa/5"
            : "border-border-strong hover:border-neutro-300"
        }`}
      >
        {preview ? (
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-lg bg-berinjela-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="max-w-[220px] truncate text-sm font-medium text-berinjela">
                {nomeArquivo}
              </p>
              <p className="text-xs text-neutro-500">Toque pra trocar</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-berinjela-50 text-neutro-500">
              <Upload className="h-4.5 w-4.5" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-berinjela">
              Toque pra tirar foto ou escolher arquivo
            </p>
            <p className="mt-0.5 text-xs text-neutro-500">
              ou arraste a imagem do cupom aqui
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        name="foto"
        accept="image/*"
        capture="environment"
        required
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />

      {!preview && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-neutro-400">
          <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} />
          JPG ou PNG, direto da câmera do celular funciona bem.
        </p>
      )}
    </div>
  );
}
