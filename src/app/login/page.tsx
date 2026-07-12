import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Label, Input, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutro-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo-completa.png"
            alt="Seu Cookie"
            width={160}
            height={160}
            priority
            className="mb-2 rounded-2xl shadow-md"
          />
          <p className="text-sm text-neutro-500">CRM de gestão</p>
        </div>

        <form
          action={login}
          className="rounded-xl border border-border bg-white p-6 shadow-md"
        >
          {erro && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-erro-bg px-3 py-2.5 text-sm text-erro-text">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {erro}
            </div>
          )}

          <FieldGroup className="mb-6">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
          </FieldGroup>

          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
