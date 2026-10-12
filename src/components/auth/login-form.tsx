"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { api, ClientApiError } from "@/lib/client-api";

type FieldErrors = { email?: string; password?: string };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) nextErrors.email = "E-mail inválido.";
    if (!password) nextErrors.password = "Informe a senha.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/login", { email: email.trim(), password });
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 401) {
        setErrors({ password: "E-mail ou senha incorretos." });
      } else if (error instanceof ClientApiError && error.status === 429) {
        toast.error(error.message);
      } else {
        toast.error("Não foi possível entrar. Tente novamente.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          autoFocus
        />
        <FieldError message={errors.email} />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        <FieldError message={errors.password} />
      </div>
      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        Entrar
      </Button>
    </form>
  );
}
