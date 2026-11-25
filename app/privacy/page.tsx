const SECTIONS = [
  {
    h: "1. What Zork stores",
    p: "Zork stores the account you create (name, email, password hash), your conversations and their titles, the chat mode you pick, your settings, and your privacy preferences. Everything is stored in the deployment's own database.",
  },
  {
    h: "2. What is sent to model providers",
    p: "When you send a message, the conversation text is sent to the AI provider configured for this deployment so it can generate a reply. If no external provider is configured, replies are produced locally and your messages do not leave the deployment.",
  },
  {
    h: "3. Cookies",
    p: "Zork sets one session cookie so you stay signed in, and stores your theme and preference choices in your browser's local storage. No advertising or tracking cookies are used.",
  },
  {
    h: "4. Deleting your data",
    p: "You can delete conversations from the chat view. Deleting your account removes its conversations and settings from the deployment's database.",
  },
  {
    h: "5. Contact",
    p: "Questions about this policy can be sent to the operator of the deployment you are using.",
  },
];

export const metadata = { title: "Privacy Policy — Zork" };

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-pane">
      <header className="px-5 py-4">
        <a href="/" aria-label="Zork home" className="inline-flex text-[15px] font-semibold tracking-tight text-text hover:opacity-80 transition-opacity">
          Zork
        </a>
      </header>
      <main className="max-w-[680px] mx-auto px-4 pb-24">
        <h1 className="text-[30px] font-semibold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-tertiary mb-8">Last updated: 25 November 2026</p>
        <p className="text-[15px] text-secondary mb-8">
          This policy describes what the Zork deployment stores and shares. It is a plain-language summary for this deployment, not legal advice and not reviewed by a lawyer.
        </p>
        <div className="flex flex-col gap-7">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-[17px] font-semibold mb-1.5">{s.h}</h2>
              <p className="text-[14px] text-secondary leading-relaxed">{s.p}</p>
            </section>
          ))}
          <section id="choices">
            <h2 className="text-[17px] font-semibold mb-1.5">6. Your privacy choices</h2>
            <p className="text-[14px] text-secondary leading-relaxed">
              You can control which optional features use your data in{" "}
              <a href="/privacy-choices" className="text-accent hover:underline">Your privacy choices</a>. Choices are
              saved to your account and applied immediately.
            </p>
          </section>
        </div>
        <p className="mt-12 text-[14px] text-secondary">
          See also our <a href="/terms" className="text-accent hover:underline">Terms of Service</a>.
        </p>
      </main>
    </div>
  );
}
