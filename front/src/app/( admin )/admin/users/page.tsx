// app/admin/users/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
} from "lucide-react";

/* ------------------- Tipos ------------------- */
type AuthMini = {
  id: number;
  email: string;
  subjectType: "user" | "professional" | "admin";
  isBlocked?: boolean; // NOVO
};

type UserRow = {
  id: number;
  name: string;
  birthDate: string | null;
  gender: "male" | "female" | string | null;
  profilePicture: string | null;
  createdAt: string;
  updatedAt: string;
  authentications: AuthMini[];
};

type UsersResponse = {
  data: UserRow[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

type SortBy = "createdAt" | "updatedAt" | "name";
type Order = "asc" | "desc";

/* ------------------- Página ------------------- */
export default function AdminUsersPage() {
  // filtros & paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [queryInput, setQueryInput] = useState("");
  const [q, setQ] = useState(""); // valor efetivo (debounced)
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [order, setOrder] = useState<Order>("desc");

  // dados
  const [rows, setRows] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<UsersResponse["meta"] | null>(null);

  // ux
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // bloquear / desbloquear
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockingId, setBlockingId] = useState<number | null>(null);
  const [blocking, setBlocking] = useState(false);

  /* -------- debounce da busca -------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(queryInput.trim());
      setPage(1); // voltar p/ primeira página quando muda a busca
    }, 400);
    return () => clearTimeout(t);
  }, [queryInput]);

  /* -------- fetch -------- */
  async function fetchUsers() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get<UsersResponse>("/user/all", {
        params: {
          page,
          perPage,
          q: q || undefined,
          sortBy,
          order,
        },
      });
      setRows(data.data);
      setMeta(data.meta);
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao carregar usuários");
      } else {
        setErr("Falha ao carregar usuários");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, q, sortBy, order]);

  /* -------- toggle acesso (bloquear/desbloquear) -------- */
  async function toggleAccess(userId: number) {
    setBlocking(true);
    setErr(null);
    try {
      await api.put(`/admin/users/user/${userId}/toggle-access`);
      await fetchUsers();
    } catch (error) {
      if (isAxiosError(error)) {
        setErr(error.response?.data?.message || error.message || "Falha ao alterar acesso do usuário");
      } else {
        setErr("Falha ao alterar acesso do usuário");
      }
    } finally {
      setBlocking(false);
      setConfirmOpen(false);
      setBlockingId(null);
    }
  }

  /* -------- helpers de UI -------- */
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = meta?.hasNextPage ?? page < totalPages;

  function primaryAuth(u: UserRow) {
    return u.authentications?.[0];
  }
  function emailOf(u: UserRow) {
    return primaryAuth(u)?.email ?? "—";
  }
  function isUserBlocked(u: UserRow) {
    return Boolean(primaryAuth(u)?.isBlocked);
  }

  function formatDate(iso?: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  }

  function pictureUrl(key?: string | null) {
    if (!key) return null;
    if (/^https?:\/\//i.test(key)) return key;
    const base = process.env.NEXT_PUBLIC_FILES_BASE_URL || "";
    return base ? `${base}/${key}` : key;
  }

  /* -------- render -------- */
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Topbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              Lista completa com busca, paginação e ações administrativas
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-80">
              <Label htmlFor="q" className="sr-only">
                Buscar
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="q"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div>
                <Label htmlFor="sortBy" className="text-xs text-muted-foreground">
                  Ordenar por
                </Label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortBy);
                    setPage(1);
                  }}
                  className="mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="createdAt">Criado em</option>
                  <option value="updatedAt">Atualizado em</option>
                  <option value="name">Nome</option>
                </select>
              </div>
              <div>
                <Label htmlFor="order" className="text-xs text-muted-foreground">
                  Ordem
                </Label>
                <select
                  id="order"
                  value={order}
                  onChange={(e) => {
                    setOrder(e.target.value as Order);
                    setPage(1);
                  }}
                  className="mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>

              <div>
                <Label htmlFor="perPage" className="text-xs text-muted-foreground">
                  Por página
                </Label>
                <select
                  id="perPage"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <Button variant="outline" onClick={fetchUsers} className="self-end">
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Erro */}
        {err && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Erro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{err}</CardContent>
          </Card>
        )}

        {/* Tabela */}
        <Card>
          <CardHeader className="flex items-center justify-between space-y-0">
            <CardTitle className="text-base">Resultados</CardTitle>
            <div className="text-xs text-muted-foreground">
              {meta ? `${meta.total} usuários no total` : "—"}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-t border-border/30 text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left">
                    <th>Usuário</th>
                    <th>E-mail</th>
                    <th>Gênero</th>
                    <th>Criado</th>
                    <th>Atualizado</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="px-4 py-3">
                          <Skeleton className="h-6 w-44" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-6 w-56" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-6 w-20" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-6 w-24" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-6 w-24" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Skeleton className="ml-auto h-9 w-32 rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    rows.map((u) => {
                      const isBlocked = isUserBlocked(u);
                      const email = emailOf(u);

                      return (
                        <tr key={u.id} className="border-t border-border/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <AvatarMini name={u.name} src={""} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{u.name || `#${u.id}`}</div>
                                <div className="truncate text-xs text-muted-foreground">ID: {u.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{email}</span>
                              {isBlocked && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 capitalize">{u.gender ?? "—"}</td>
                          <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                          <td className="px-4 py-3">{formatDate(u.updatedAt)}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <AlertDialog
                                open={confirmOpen && blockingId === u.id}
                                onOpenChange={(open) => {
                                  if (!blocking) setConfirmOpen(open);
                                  if (open) setBlockingId(u.id);
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setBlockingId(u.id);
                                      setConfirmOpen(true);
                                    }}
                                    // estilo dinâmico:
                                    className={
                                      isBlocked
                                        ? "border-green-600 text-green-700 hover:bg-green-600 hover:text-white"
                                        : "bg-red-600 text-white hover:bg-red-700"
                                    }
                                    variant={isBlocked ? "outline" : "destructive"}
                                  >
                                    {isBlocked ? (
                                      <>
                                        <Unlock className="mr-2 h-4 w-4" />
                                        Desbloquear
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Bloquear
                                      </>
                                    )}
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {isBlocked ? "Desbloquear acesso?" : "Bloquear acesso?"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O usuário <strong>{u.name}</strong> será{" "}
                                      <strong>{isBlocked ? "reautorizado" : "impedido"}</strong> de acessar a plataforma.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={blocking}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => toggleAccess(u.id)}
                                      disabled={blocking}
                                      className={
                                        isBlocked
                                          ? "bg-green-600 hover:bg-green-700"
                                          : "bg-red-600 hover:bg-red-700"
                                      }
                                    >
                                      {blocking
                                        ? isBlocked
                                          ? "Desbloqueando..."
                                          : "Bloqueando..."
                                        : isBlocked
                                        ? "Confirmar desbloqueio"
                                        : "Confirmar bloqueio"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between gap-3 border-t border-border/30 px-4 py-3">
              <div className="text-xs text-muted-foreground">
                {meta ? (
                  <>
                    Página <strong>{meta.page}</strong> de <strong>{meta.totalPages}</strong> —{" "}
                    <strong>{meta.total}</strong> usuários
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrev || loading}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext || loading}
                >
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------- Subcomponentes ------------------- */

function AvatarMini({ name, src }: { name?: string; src: string | null }) {
  const initials = useMemo(() => {
    const n = (name || "").trim();
    if (!n) return "—";
    const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] ?? "").toUpperCase();
    const b = (parts[1]?.[0] ?? "").toUpperCase();
    return (a + b).slice(0, 2) || a || "—";
  }, [name]);

  return (
    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border/30 bg-muted text-xs font-semibold">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || "Foto"}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-muted-foreground">{initials}</span>
      )}
    </div>
  );
}
