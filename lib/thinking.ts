// Central localization for AI status labels. The status language follows the
// user's message language (detected server-side from the message text).
export type StatusStage =
  | "thinking"
  | "analyzing"
  | "planning"
  | "processing"
  | "searching"
  | "preparing"
  | "generating";

export type Lang = "en" | "ru";

export const STATUS_LABELS: Record<Lang, Record<StatusStage, string>> = {
  en: {
    thinking: "Thinking",
    analyzing: "Analyzing your request",
    planning: "Planning the response",
    processing: "Processing information",
    searching: "Searching for relevant information",
    preparing: "Preparing the answer",
    generating: "Generating response",
  },
  ru: {
    thinking: "Думаю",
    analyzing: "Анализирую запрос",
    planning: "Планирую ответ",
    processing: "Обрабатываю информацию",
    searching: "Ищу подходящую информацию",
    preparing: "Подготавливаю ответ",
    generating: "Генерирую ответ",
  },
};

export function statusLabel(stage: StatusStage, lang: Lang): string {
  return STATUS_LABELS[lang][stage] ?? STATUS_LABELS.en[stage];
}

export function detectLang(text: string): Lang {
  return /[\u0400-\u04FF]/.test(text) ? "ru" : "en";
}
