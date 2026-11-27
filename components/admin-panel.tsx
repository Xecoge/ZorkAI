"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, KeyRound, RefreshCw, RotateCcw, ShieldCheck, ShieldMinus, ShieldPlus, Snowflake } from "lucide-react";

type Account = {
  id: string;
  email: string;
  name: string;
  plan: string;
  planName: string;
  role: "user" | "admin" | "owner";
  status: "active" | "banned" | "frozen";
  statusReason: string;
  statusUntil: number | null;
  blocked: boolean;
  unlimited: boolean;
  balance: number | null;
  createdAt: number;
};

type AuditRow = {
  id: string;
  actorEmail: string;
  action: string;
  targetId: string | null;
  detail: string;
  createdAt: number;
};

type AdminData = {
  me: { email: string; role: string; owner: boolean };
  plans: { id: string; name: string }[];
  provider: {
    baseUrl: string;
    source: "env" | "admin" | "none";
    activeKeyHint: string | null;
    envKeyHint: string | null;
    storedKeyHint: string | null;
  };
  stats: { users: number; chats: number; messages: number; banned: number; frozen: number; admins: number };
  accounts: Account[];
  audit: AuditRow[];
};

const DURATIONS = [
  { label: "Навсегда", ms: 0 },
  { label: "1 день", ms: 24 * 3600_000 },
  { label: "7 дней", ms: 7 * 24 * 3600_000 },
  { label: "30 дней", ms: 30 * 24 * 3600_000 },
];

function when(ms: number): string {
  return new Date(ms).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", { cache: "no-store" });
      if (!res.ok) {
        setError(res.status === 403 ? "Доступ только для владельца и админов." : `Не удалось загрузить панель (${res.status}).`);
        setData(null);
        return;
      }
      setData((await res.json()) as AdminData);
      setError("");
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: string, body: Record<string, unknown> = {}, label = "") {
    setBusy(label || action);
    setNotice("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; models?: number };
      if (!res.ok || payload.ok === false) {
        setNotice(payload.error || `Ошибка ${res.status}`);
      } else {
        setNotice(payload.models !== undefined ? `Ключ принят, моделей доступно: ${payload.models}` : "Готово");
        await load();
      }
    } catch {
      setNotice("Сеть недоступна.");
    } finally {
      setBusy("");
      setConfirming(null);
    }
  }

  const accounts = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.accounts;
    return data.accounts.filter((a) => a.email.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }, [data, query]);

  if (loading && !data) return <p className="text-[14px] text-secondary py-6">Загружаю панель…</p>;
  if (error && !data) return <p className="text-[14px] text-secondary py-6">{error}</p>;
  if (!data) return null;

  const until = duration ? Date.now() + duration : null;

  return (
    <div className="space-y-5 pb-4">
      <div className="rounded-xl border border-line bg-pane px-3.5 py-3">
        <div className="flex items-center gap-2 text-[14px] font-medium">
          <ShieldCheck className="w-4 h-4 text-secondary" />
          Панель управления
          <span className="ml-auto text-[12px] text-tertiary">
            {data.me.role === "owner" ? "владелец" : "админ"}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] text-tertiary break-all">{data.me.email}</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Аккаунтов", data.stats.users],
            ["Чатов", data.stats.chats],
            ["Сообщений", data.stats.messages],
            ["Забанено", data.stats.banned],
            ["Заморожено", data.stats.frozen],
            ["Админов", data.stats.admins],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-bg border border-line px-2 py-1.5">
              <div className="text-[15px] font-semibold tabular-nums">{value}</div>
              <div className="text-[11px] text-tertiary leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-pane px-3.5 py-3">
        <div className="flex items-center gap-2 text-[14px] font-medium">
          <KeyRound className="w-4 h-4 text-secondary" />
          Ключ провайдера
        </div>
        <p className="mt-1 text-[12.5px] text-tertiary break-all">
          Шлюз: {data.provider.baseUrl}
          <br />
          Ключ: {data.provider.activeKeyHint ?? "не задан"} · источник:{" "}
          {data.provider.source === "env" ? "переменная окружения" : data.provider.source === "admin" ? "сохранён здесь" : "нет"}
        </p>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Вставьте рабочий ключ шлюза"
            aria-label="Ключ провайдера"
            className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-bg border border-line text-[13px] outline-none focus:border-secondary"
          />
          <button
            onClick={() => act("provider-key", { key: keyInput }, "key")}
            disabled={!keyInput.trim() || busy === "key"}
            className="h-9 px-3 rounded-lg bg-text text-bg text-[13px] font-medium disabled:opacity-40 shrink-0"
          >
            Сохранить
          </button>
          <button
            onClick={() => act("test-provider", {}, "test")}
            disabled={busy === "test"}
            className="h-9 px-3 rounded-lg border border-line text-[13px] hover:bg-hover shrink-0"
          >
            Проверить
          </button>
        </div>
          <p className="mt-2 text-[12px] text-tertiary">
            Ключ из панели имеет приоритет над переменной окружения DRAKE_API_KEY
            {data.provider.envKeyHint ? ` (сейчас там ${data.provider.envKeyHint})` : ""}.
          </p>
      </div>

      <div className="rounded-xl border border-line bg-pane px-3.5 py-3">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по email или имени"
            aria-label="Поиск аккаунтов"
            className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-bg border border-line text-[13px] outline-none focus:border-secondary"
          />
          <button onClick={() => void load()} aria-label="Обновить" className="w-9 h-9 grid place-items-center rounded-lg border border-line hover:bg-hover shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Причина бана/заморозки (необязательно)"
            aria-label="Причина"
            className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-bg border border-line text-[13px] outline-none focus:border-secondary"
          />
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            aria-label="Срок"
            className="h-9 px-2 rounded-lg bg-bg border border-line text-[13px] shrink-0"
          >
            {DURATIONS.map((d) => (
              <option key={d.label} value={d.ms}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 space-y-2">
          {accounts.map((account) => {
            const pending = confirming === account.id + "ban" ? "ban" : confirming === account.id + "freeze" ? "freeze" : null;
            return (
              <div key={account.id} className="rounded-lg border border-line bg-bg px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium truncate">{account.name}</p>
                    <p className="text-[12px] text-tertiary break-all">{account.email}</p>
                  </div>
                  <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-line text-secondary">{account.planName}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full ${account.role === "owner" ? "bg-selected font-medium" : "text-secondary border border-line"}`}>
                    {account.role === "owner" ? "владелец" : account.role === "admin" ? "админ" : "пользователь"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      account.blocked ? "text-red-700 bg-red-500/10 border border-red-500/40 font-medium" : "text-secondary border border-line"
                    }`}
                  >
                    {account.blocked ? (account.status === "banned" ? "забанен" : "заморожен") : "активен"}
                  </span>
                  {account.statusUntil && account.blocked && <span className="text-tertiary">до {when(account.statusUntil)}</span>}
                  {account.statusReason && account.blocked && <span className="text-tertiary truncate max-w-[220px]">{account.statusReason}</span>}
                  {account.balance !== null && !account.unlimited && (
                    <span className="text-tertiary tabular-nums">{account.balance} кредитов</span>
                  )}
                  {account.unlimited && <span className="text-tertiary">безлимит</span>}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <select
                    value={account.plan}
                    onChange={(e) => act("set-plan", { userId: account.id, plan: e.target.value }, account.id + "plan")}
                    aria-label={`План для ${account.email}`}
                    className="h-8 px-2 rounded-lg bg-bg border border-line text-[12px]"
                  >
                    {data.plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>

                  {pending ? (
                    <>
                      <button
                        onClick={() => act(pending, { userId: account.id, reason, until }, account.id + pending)}
                        className="h-8 px-2.5 rounded-lg bg-red-500 text-white text-[12px] font-medium"
                      >
                        Точно?
                      </button>
                      <button onClick={() => setConfirming(null)} className="h-8 px-2.5 rounded-lg border border-line text-[12px]">
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirming(account.id + "ban")}
                        className="h-8 px-2.5 rounded-lg border border-line text-[12px] hover:bg-hover inline-flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" /> Бан
                      </button>
                      <button
                        onClick={() => setConfirming(account.id + "freeze")}
                        className="h-8 px-2.5 rounded-lg border border-line text-[12px] hover:bg-hover inline-flex items-center gap-1"
                      >
                        <Snowflake className="w-3.5 h-3.5" /> Заморозить
                      </button>
                    </>
                  )}

                  {account.blocked && (
                    <button
                      onClick={() => act("restore", { userId: account.id }, account.id + "restore")}
                      className="h-8 px-2.5 rounded-lg border border-line text-[12px] hover:bg-hover inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Разблокировать
                    </button>
                  )}

                  {account.role === "user" ? (
                    <button
                      onClick={() => act("set-role", { userId: account.id, role: "admin" }, account.id + "grant")}
                      className="h-8 px-2.5 rounded-lg border border-line text-[12px] hover:bg-hover inline-flex items-center gap-1"
                    >
                      <ShieldPlus className="w-3.5 h-3.5" /> Выдать админку
                    </button>
                  ) : (
                    account.role === "admin" && (
                      <button
                        onClick={() => act("set-role", { userId: account.id, role: "user" }, account.id + "revoke")}
                        className="h-8 px-2.5 rounded-lg border border-line text-[12px] hover:bg-hover inline-flex items-center gap-1"
                      >
                        <ShieldMinus className="w-3.5 h-3.5" /> Снять админку
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && <p className="text-[13px] text-tertiary py-3">Ничего не найдено.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-pane px-3.5 py-3">
        <div className="text-[14px] font-medium">Журнал действий</div>
        <ul className="mt-2 space-y-1.5">
          {data.audit.map((row) => (
            <li key={row.id} className="text-[12px] text-secondary flex gap-2">
              <span className="text-tertiary tabular-nums shrink-0">{when(row.createdAt)}</span>
              <span className="min-w-0 break-words">
                <span className="text-tertiary">{row.actorEmail}</span> → {row.action}
                {row.detail ? ` (${row.detail})` : ""}
              </span>
            </li>
          ))}
          {data.audit.length === 0 && <li className="text-[12px] text-tertiary">Пока пусто.</li>}
        </ul>
      </div>

      {notice && (
        <p className="text-[12.5px] text-secondary inline-flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> {notice}
        </p>
      )}
    </div>
  );
}
