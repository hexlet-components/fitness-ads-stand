// Контракт рабочего места менеджера со сценариями n8n студента.
// GET  /webhook/leads   → массив заявок
// POST /webhook/take    ← {"id": 7}, → заявка; 409, если заявку уже взяли
// GET  /webhook/report  → {"rows": [{source, visits, leads, processed, conversion}]}

export type Lead = {
  id: string;
  name: string;
  phone: string;
  comment: string;
  interest: string;
  direction: string;
  preferredTime: string;
  utmSource: string;
  utmCampaign: string;
  createdAt: string;
  status: string;
  processedAt: string;
  remindedAt: string;
};

export type ReportRow = {
  source: string;
  visits: number;
  leads: number;
  processed: number;
  conversion: string;
};

const text = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// n8n отдаёт строки таблицы с именами столбцов из шагов. Ответ вида {data: [...]} тоже принимается.
export const parseLeads = (payload: unknown): Lead[] => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : null;
  if (list === null) {
    throw new Error("Сценарий должен вернуть массив заявок");
  }
  return list
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .filter((item) => text(item.id) !== "")
    .map((item) => ({
      id: text(item.id),
      name: text(item.name),
      phone: text(item.phone),
      comment: text(item.comment),
      interest: text(item.interest),
      direction: text(item.direction),
      preferredTime: text(item.preferred_time),
      utmSource: text(item.utm_source),
      utmCampaign: text(item.utm_campaign),
      createdAt: text(item.created_at),
      status: text(item.status),
      processedAt: text(item.processed_at),
      remindedAt: text(item.reminded_at),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const parseReport = (payload: unknown): ReportRow[] => {
  const rows = (payload as { rows?: unknown })?.rows;
  if (!Array.isArray(rows)) {
    throw new Error("Сценарий должен вернуть объект с массивом rows");
  }
  return rows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => ({
      source: text(row.source) || "без метки",
      visits: count(row.visits),
      leads: count(row.leads),
      processed: count(row.processed),
      conversion: text(row.conversion) || "—",
    }));
};

// Что изменилось с прошлого опроса: новые заявки и новые напоминания.
export const changes = (before: Map<string, Lead>, after: Lead[]) => {
  const added = after.filter((lead) => !before.has(lead.id));
  const reminded = after.filter((lead) => {
    const old = before.get(lead.id);
    return (
      old !== undefined &&
      lead.remindedAt !== "" &&
      lead.remindedAt !== old.remindedAt &&
      lead.status === ""
    );
  });
  return { added, reminded };
};

export const moscowTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};
