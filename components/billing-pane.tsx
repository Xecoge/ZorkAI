"use client";

import { useEffect, useState } from "react";
import { CreditCard, Coins, Activity } from "lucide-react";
import { GhostLoader } from "./ghost";
import { MODELS } from "@/lib/ai/config";

type Billing = {
  plan: { id: string; name: string; priceCents: number; unlimited: boolean; status: string; renewsAt: number };
  credits: { unlimited: boolean; monthlyAllowance: number | null; used: number; remaining: number | null };
  usage: {
    tokensIn: number;
    tokensOut: number;
    tokensTotal: number;
    byModel: { model: string; requests: number; inputTokens: number; outputTokens: number; credits: number }[];
  };
  transactions: { id: string; kind: string; credits: number; model: string | null; description: string | null; createdAt: number }[];
  billing: { id: string; kind: string; plan: string | null; amountCents: number; status: string; createdAt: number }[];
};

const money = (c: number) => `$${(c / 100).toFixed(0)}`;
const num = (n: number) => n.toLocaleString("en-US");
const date = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Billing & Plan dashboard — every number is read from /api/billing (DB).
export function BillingPane({ onUpgrade }: { onUpgrade: () => void }) {
  const [data, setData] = useState<Billing | null>(null);
  const [plans, setPlans] = useState<{ id: string; name: string; priceAfterPromoCents: number; promoPercent: number }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Billing could not be loaded."));
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setPlans((d.plans ?? []).filter((p: { id: string }) => p.id !== "xmax")))
      .catch(() => setPlans([]));
  }, []);

  if (error) return <p role="alert" className="pt-4 text-[13px] text-danger">{error}</p>;
  if (!data)
    return (
      <div className="pt-10 flex justify-center">
        <GhostLoader size={32} intensity="subtle" />
      </div>
    );

  const { plan, credits, usage } = data;
  const pct = credits.unlimited || !credits.monthlyAllowance ? 0 : Math.min(100, Math.round((credits.used / credits.monthlyAllowance) * 100));

  return (
    <div className="pt-2 flex flex-col gap-5">
      <section aria-label="Subscription">
        <p className="text-[13px] text-tertiary mb-2 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Subscription</p>
        <div className="rounded-2xl border border-line px-4 py-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-[16px] font-semibold">
              {plan.name}
              {plan.unlimited ? (
                <span className="ml-2 text-[11px] font-medium text-accent border border-accent/40 rounded-full px-2 py-0.5 align-middle">Unlimited Credits</span>
              ) : null}
            </p>
            <p className="text-[13px] text-tertiary capitalize">
              {plan.id === "free" ? `Free · ${plan.status}` : `${money(plan.priceCents)}/mo · ${plan.status}`}
            </p>
          </div>
          <button onClick={onUpgrade} className="ml-auto h-9 px-4 rounded-full bg-text text-bg text-[13px] font-medium hover:opacity-85 transition-opacity">
            {plan.id === "free" ? "View plans" : "Change plan"}
          </button>
        </div>

        {plans.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {plans.map((p) => {
              const current = p.id === plan.id;
              return (
                <button
                  key={p.id}
                  onClick={onUpgrade}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${current ? "border-accent/60 bg-accent/10" : "border-line hover:bg-chrome"}`}
                >
                  <span className="block text-[13px] font-medium">{p.name}</span>
                  <span className="block text-[12px] text-tertiary">
                    {p.id === "free" ? "Free" : `${money(p.priceAfterPromoCents)}/mo`}
                    {p.id !== "free" && p.promoPercent > 0 ? ` · −${p.promoPercent}%` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Credit balance">
        <p className="text-[13px] text-tertiary mb-2 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" /> Credit balance</p>
        <div className="rounded-2xl border border-line px-4 py-4">
          {credits.unlimited ? (
            <p className="text-[15px] font-medium text-accent">Unlimited Credits</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span>{num(credits.used ?? 0)} used of {num(credits.monthlyAllowance ?? 0)}</span>
                <span className="text-tertiary">{num(credits.remaining ?? 0)} remaining</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-chrome overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="xq-bar-fill h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
      </section>

      <section aria-label="Usage">
        <p className="text-[13px] text-tertiary mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Usage this period</p>
        <div className="rounded-2xl border border-line divide-y divide-line">
          <Row label="Total tokens" value={num(usage.tokensTotal)} />
          <Row label="Input tokens" value={num(usage.tokensIn)} />
          <Row label="Output tokens" value={num(usage.tokensOut)} />
          {usage.byModel.length === 0 ? (
            <div className="px-4 py-3.5 text-[13px] text-tertiary">No model usage yet — send your first message.</div>
          ) : (
            usage.byModel.map((m) => (
              <Row
                key={m.model}
                label={`${MODELS.find((x) => x.id === m.model)?.name ?? "Model"} · ${m.requests} request${m.requests === 1 ? "" : "s"}`}
                value={`${num(m.credits)} credits · ${num(m.inputTokens + m.outputTokens)} tokens`}
              />
            ))
          )}
        </div>
      </section>

      <section aria-label="Transaction history">
        <p className="text-[13px] text-tertiary mb-2">Transactions</p>
        <div className="rounded-2xl border border-line divide-y divide-line">
          {data.transactions.length === 0 ? (
            <div className="px-4 py-3.5 text-[13px] text-tertiary">No transactions yet.</div>
          ) : (
            data.transactions.slice(0, 10).map((t) => (
              <Row
                key={t.id}
                label={t.description ?? t.kind}
                value={`${t.credits > 0 ? "+" : ""}${num(Math.round(t.credits * 1000) / 1000)} credits · ${date(t.createdAt)}`}
              />
            ))
          )}
        </div>
      </section>

      {data.billing.length > 0 && (
        <section aria-label="Payments">
          <p className="text-[13px] text-tertiary mb-2">Payments</p>
          <div className="rounded-2xl border border-line divide-y divide-line">
            {data.billing.map((b) => (
              <Row key={b.id} label={`${b.plan ?? "Plan"} payment`} value={`${money(b.amountCents)} · ${b.status} · ${date(b.createdAt)}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-[14px] text-secondary truncate">{label}</span>
      <span className="text-[14px] font-medium tabular-nums truncate">{value}</span>
    </div>
  );
}
