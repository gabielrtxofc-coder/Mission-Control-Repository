import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { MissionControlLogo } from "@/components/brand/logo";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MissionControlLogo size="lg" />
          <h1 className="mt-6 text-xl font-semibold text-text">Bem-vindo de volta</h1>
          <p className="mt-1.5 text-sm text-muted">
            Entre para gerenciar projetos e tarefas da sua equipe.
          </p>
        </div>
        <div className="surface-panel p-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Acesso restrito à equipe. Solicite seu convite a um administrador.
        </p>
      </div>
    </main>
  );
}
