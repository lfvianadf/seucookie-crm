"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const authorizationId = String(formData.get("authorization_id") ?? "");
  const consentQuery = authorizationId ? `&authorization_id=${encodeURIComponent(authorizationId)}` : "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos")}${consentQuery}`);
  }

  redirect(authorizationId ? `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}` : "/pedidos");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
