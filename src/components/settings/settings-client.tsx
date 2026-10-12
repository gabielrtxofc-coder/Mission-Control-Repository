"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  KeyRound,
  Moon,
  Palette,
  Sun,
  Tags,
  UserRound,
  Users,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { api, ClientApiError } from "@/lib/client-api";
import { AVATAR_COLORS, PROJECT_COLORS } from "@/lib/constants";
import { formatDateBR } from "@/lib/dates";
import { applyTheme, type ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  avatarColor: string;
  isActive: boolean;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
};

type TagRow = { id: string; name: string; color: string };

export function SettingsClient({
  initialTab,
  user,
  workspace,
  role,
  members,
  tags,
}: {
  initialTab: string;
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle: string | null;
    avatarColor: string;
    isActive: boolean;
    prefs: Record<string, unknown>;
  };
  workspace: { id: string; name: string; slug: string };
  role: "ADMIN" | "MEMBER";
  members: MemberRow[];
  tags: TagRow[];
}) {
  const isAdmin = role === "ADMIN";
  const validTabs = isAdmin
    ? ["profile", "appearance", "members", "workspace", "tags", "security"]
    : ["profile", "appearance", "security"];
  const [tab, setTab] = React.useState(
    validTabs.includes(initialTab) ? initialTab : "profile",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">Configurações</h1>
        <p className="mt-0.5 text-sm text-muted">
          Preferências pessoais, equipe e espaço de trabalho.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-3.5 w-3.5" aria-hidden />
            Aparência
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="members">
                <Users className="h-3.5 w-3.5" aria-hidden />
                Membros
              </TabsTrigger>
              <TabsTrigger value="workspace">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                Espaço de trabalho
              </TabsTrigger>
              <TabsTrigger value="tags">
                <Tags className="h-3.5 w-3.5" aria-hidden />
                Etiquetas
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="security">
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            Segurança
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "profile" && <ProfileSection user={user} />}
      {tab === "appearance" && <AppearanceSection user={user} />}
      {tab === "members" && isAdmin && <MembersSection members={members} currentUserId={user.id} />}
      {tab === "workspace" && isAdmin && <WorkspaceSection workspace={workspace} />}
      {tab === "tags" && isAdmin && <TagsSection tags={tags} />}
      {tab === "security" && <SecuritySection />}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel p-6">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection({
  user,
}: {
  user: { id: string; name: string; email: string; jobTitle: string | null; avatarColor: string };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(user.name);
  const [jobTitle, setJobTitle] = React.useState(user.jobTitle ?? "");
  const [color, setColor] = React.useState(user.avatarColor);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch("/api/auth/profile", {
        name: name.trim(),
        jobTitle: jobTitle.trim() || null,
        avatarColor: color,
      });
      toast.success("Perfil atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ClientApiError ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Perfil pessoal" description="Como você aparece para o restante da equipe.">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={name} color={color} size="lg" />
          <div>
            <p className="text-sm font-medium text-text">{name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="profile-title">Cargo</Label>
            <Input
              id="profile-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ex.: CTO, Product Designer"
            />
          </div>
        </div>

        <div>
          <Label>Cor do avatar</Label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-text" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Cor ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>

        <Button variant="primary" onClick={save} loading={saving}>
          Salvar alterações
        </Button>
      </div>
    </Section>
  );
}

function AppearanceSection({
  user,
}: {
  user: { prefs: Record<string, unknown> };
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(
    Boolean(user.prefs.sidebarCollapsed),
  );
  const [density, setDensity] = React.useState(
    (user.prefs.density as string) ?? "comfortable",
  );
  const [theme, setTheme] = React.useState<ThemeName>(
    user.prefs.theme === "light" ? "light" : "dark",
  );
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch("/api/auth/profile", {
        prefs: {
          sidebarCollapsed: collapsed,
          density: density === "compact" ? "compact" : "comfortable",
          theme,
        },
      });
      applyTheme(theme);
      toast.success("Preferências salvas.");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar as preferências.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Preferências de interface"
      description="Ajustes de exibição aplicados à sua conta neste dispositivo e em outros."
    >
      <div className="space-y-5">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text">Menu lateral recolhido</p>
            <p className="text-xs text-muted">Inicia o aplicativo com o menu minimizado.</p>
          </div>
          <Switch checked={collapsed} onCheckedChange={setCollapsed} />
        </label>
        <Separator />
        <div>
          <Label htmlFor="density">Densidade da interface</Label>
          <Select
            id="density"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            className="max-w-xs"
          >
            <option value="comfortable">Confortável</option>
            <option value="compact">Compacta</option>
          </Select>
        </div>
        <Separator />
        <div>
          <Label>Tema</Label>
          <div
            role="group"
            aria-label="Tema da interface"
            className="mt-2 grid max-w-xs grid-cols-2 gap-2"
          >
            {(
              [
                { value: "dark", label: "Escuro", Icon: Moon },
                { value: "light", label: "Claro", Icon: Sun },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  theme === value
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-border bg-surface-2 text-muted hover:text-text",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" onClick={save} loading={saving}>
          Salvar preferências
        </Button>
      </div>
    </Section>
  );
}

function MembersSection({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [memberRole, setMemberRole] = React.useState<"ADMIN" | "MEMBER">("MEMBER");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const res = await api.post<{ temporaryPassword?: string | null }>("/api/members", {
        email: email.trim(),
        name: name.trim(),
        jobTitle: jobTitle.trim() || null,
        role: memberRole,
        ...(password ? { password } : {}),
      });
      if (res.temporaryPassword) setTempPassword(res.temporaryPassword);
      toast.success("Membro adicionado.");
      setInviteOpen(false);
      setEmail("");
      setName("");
      setJobTitle("");
      setPassword("");
      router.refresh();
    } catch (error) {
      if (error instanceof ClientApiError) {
        toast.error(error.message);
      } else {
        toast.error("Não foi possível adicionar o membro.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(userId: string, role: "ADMIN" | "MEMBER") {
    try {
      await api.patch(`/api/members/${userId}`, { role });
      toast.success("Papel atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Erro ao atualizar.");
    }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/api/members/${userId}`, { isActive });
      toast.success(isActive ? "Membro reativado." : "Membro desativado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Erro ao atualizar.");
    }
  }

  async function remove(userId: string, memberName: string) {
    if (!window.confirm(`Remover ${memberName} do workspace? As tarefas atribuídas ficarão sem responsável.`)) {
      return;
    }
    try {
      await api.delete(`/api/members/${userId}`);
      toast.success("Membro removido.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Erro ao remover.");
    }
  }

  return (
    <Section
      title="Gestão de membros"
      description="Administradores podem adicionar pessoas, alterar papéis e desativar acessos."
    >
      <div className="space-y-4">
        {tempPassword && (
          <div className="rounded-md border border-accent/40 bg-accent-soft p-4">
            <p className="text-sm font-medium text-accent">Senha temporária gerada</p>
            <p className="mt-1 text-xs text-muted">
              Compartilhe com o novo membro com segurança. Ela não será exibida novamente.
            </p>
            <code className="mt-2 block select-all rounded bg-surface-2 px-3 py-2 text-sm text-text">
              {tempPassword}
            </code>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTempPassword(null)}>
              Entendi, ocultar
            </Button>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setInviteOpen((v) => !v)}>
            {inviteOpen ? "Cancelar" : "Adicionar membro"}
          </Button>
        </div>

        {inviteOpen && (
          <form onSubmit={invite} className="space-y-4 rounded-md border border-border bg-surface-2 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="member-name">Nome *</Label>
                <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} required />
                <FieldError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="member-email">E-mail *</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <FieldError message={errors.email} />
              </div>
              <div>
                <Label htmlFor="member-title">Cargo</Label>
                <Input id="member-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="member-role">Papel</Label>
                <Select
                  id="member-role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as "ADMIN" | "MEMBER")}
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="member-password">Senha inicial (opcional)</Label>
                <Input
                  id="member-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
                <p className="mt-1 text-xs text-muted">
                  Sempre que possível, defina uma senha forte ou use a gerada automaticamente.
                </p>
              </div>
            </div>
            <Button type="submit" variant="primary" loading={saving}>
              Adicionar ao workspace
            </Button>
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50 text-left">
                <th className="px-4 py-2.5 font-medium text-muted">Membro</th>
                <th className="px-4 py-2.5 font-medium text-muted">Papel</th>
                <th className="px-4 py-2.5 font-medium text-muted">Entrou em</th>
                <th className="px-4 py-2.5 font-medium text-muted">Situação</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.name} color={member.avatarColor} size="sm" />
                      <div>
                        <p className="text-text">
                          {member.name}
                          {member.id === currentUserId && (
                            <span className="ml-1.5 text-xs text-muted">(você)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        void changeRole(member.id, e.target.value as "ADMIN" | "MEMBER")
                      }
                      disabled={member.id === currentUserId}
                      className="cursor-pointer rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-text disabled:opacity-50"
                      aria-label={`Papel de ${member.name}`}
                    >
                      <option value="MEMBER">Membro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDateBR(member.joinedAt.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={member.isActive ? "accent" : "default"}>
                      {member.isActive ? "Ativo" : "Desativado"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleActive(member.id, !member.isActive)}
                        >
                          {member.isActive ? "Desativar" : "Reativar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={() => void remove(member.id, member.name)}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

function WorkspaceSection({
  workspace,
}: {
  workspace: { id: string; name: string; slug: string };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(workspace.name);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch("/api/workspace", { name: name.trim() });
      toast.success("Espaço de trabalho atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Espaço de trabalho"
      description="Informações básicas do espaço onde a equipe colabora."
    >
      <div className="space-y-4">
        <div className="max-w-md">
          <Label htmlFor="workspace-name">Nome do espaço</Label>
          <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="max-w-md">
          <Label>Identificador (slug)</Label>
          <Input value={workspace.slug} disabled className="opacity-60" />
          <p className="mt-1 text-xs text-muted">
            O identificador é fixo e usado em URLs internas.
          </p>
        </div>
        <Button variant="primary" onClick={save} loading={saving}>
          Salvar
        </Button>
      </div>
    </Section>
  );
}

function TagsSection({ tags }: { tags: TagRow[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<string>(PROJECT_COLORS[0]!);
  const [saving, setSaving] = React.useState(false);

  async function createTag(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/tags", { name: name.trim(), color });
      toast.success("Etiqueta criada.");
      setName("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Erro ao criar etiqueta.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(id: string, tagName: string) {
    if (!window.confirm(`Excluir a etiqueta “${tagName}”?`)) return;
    try {
      await api.delete(`/api/tags/${id}`);
      toast.success("Etiqueta excluída.");
      router.refresh();
    } catch {
      toast.error("Erro ao excluir etiqueta.");
    }
  }

  return (
    <Section
      title="Etiquetas"
      description="Classificações opcionais para organizar tarefas."
    >
      <div className="space-y-4">
        <form onSubmit={createTag} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="tag-name">Nome da etiqueta</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: urgente, cliente, infra"
            />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2",
                    color === c ? "border-text" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" variant="primary" loading={saving}>
            Criar etiqueta
          </Button>
        </form>

        {tags.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma etiqueta criada ainda.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{ borderColor: `${tag.color}44`, backgroundColor: `${tag.color}14` }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden
                />
                <span className="text-sm theme-adaptive-ink" style={{ color: tag.color }}>
                  {tag.name}
                </span>
                <button
                  type="button"
                  onClick={() => void removeTag(tag.id, tag.name)}
                  className="ml-1 text-muted hover:text-danger"
                  aria-label={`Excluir ${tag.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function SecuritySection() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    if (next.length < 8) {
      setError("A nova senha precisa de pelo menos 8 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/auth/password", {
        currentPassword: current,
        newPassword: next,
      });
      toast.success("Senha alterada com sucesso.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Não foi possível alterar a senha.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Segurança"
      description="Gerencie sua senha de acesso."
    >
      <form onSubmit={changePassword} className="max-w-sm space-y-4">
        <div>
          <Label htmlFor="current-password">Senha atual</Label>
          <Input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <FieldError message={error} />}
        <Button type="submit" variant="primary" loading={saving}>
          Alterar senha
        </Button>
      </form>
    </Section>
  );
}
