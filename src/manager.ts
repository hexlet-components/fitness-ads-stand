import "./style.css";
import { changes, moscowTime, parseLeads, parseReport, type Lead } from "./manager-api";

// Страница живёт на сервере студента рядом с n8n, поэтому запросы идут на тот же адрес.
// Параметр ?api= нужен для локальной разработки стенда.
const apiBase = new URLSearchParams(location.search).get("api") ?? `${location.origin}/webhook`;
const pollInterval = 15_000;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const connection = byId<HTMLSpanElement>("connection");
const standNotice = byId<HTMLParagraphElement>("stand-notice");
const leadsList = byId<HTMLUListElement>("leads");
const leadsError = byId<HTMLParagraphElement>("leads-error");
const leadsEmpty = byId<HTMLParagraphElement>("leads-empty");
const waitingCount = byId<HTMLSpanElement>("waiting-count");

let known = new Map<string, Lead>();
let firstLoad = true;

if (location.hostname.endsWith("github.io")) {
  standNotice.textContent =
    "Эта страница работает на вашем сервере с n8n: откройте https://<адрес машины>/manager/.";
}

const describeFailure = async (response: Response, what: string): Promise<string> => {
  if (response.status === 401) {
    return "Сервер просит логин и пароль менеджера. Обновите страницу и введите их.";
  }
  if (response.status === 404) {
    return `Сценарий ${what} не найден. Проверьте, что он опубликован и путь вебхука совпадает с шагом.`;
  }
  const body = (await response.text()).slice(0, 200);
  return `Сценарий ${what} ответил ${response.status}${body ? `: ${body}` : ""}`;
};

const request = async (path: string, init?: RequestInit) =>
  fetch(`${apiBase}/${path}`, { credentials: "same-origin", ...init });

const beep = () => {
  try {
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
    tone.connect(gain).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + 0.4);
  } catch {
    // без звука страница тоже работает
  }
};

const notify = (title: string, lead: Lead) => {
  beep();
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body: `${lead.name}, ${lead.phone}${lead.interest ? ` · ${lead.interest}` : ""}`,
    });
  }
};

const field = (label: string, value: string) => {
  const line = document.createElement("p");
  const key = document.createElement("span");
  key.className = "text-slate-500";
  key.textContent = `${label}: `;
  line.append(key, value);
  return line;
};

const take = async (lead: Lead, button: HTMLButtonElement, note: HTMLParagraphElement) => {
  button.disabled = true;
  note.textContent = "";
  try {
    const response = await request("take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(lead.id) || lead.id }),
    });
    if (response.status === 409) {
      note.textContent = "Заявку уже взяли.";
    } else if (!response.ok) {
      note.textContent = await describeFailure(response, "«Обработка заявки»");
      button.disabled = false;
      return;
    }
    await poll();
  } catch {
    note.textContent = "Сервер не ответил. Проверьте, что машина с n8n работает.";
    button.disabled = false;
  }
};

const card = (lead: Lead, fresh: boolean) => {
  const item = document.createElement("li");
  const taken = lead.status !== "";
  const reminded = !taken && lead.remindedAt !== "";
  item.className = [
    "rounded-2xl bg-white p-5 shadow-sm transition",
    fresh ? "ring-2 ring-pink-400" : "",
    reminded ? "ring-2 ring-amber-400" : "",
    taken ? "opacity-70" : "",
  ].join(" ");

  const head = document.createElement("div");
  head.className = "mb-2 flex flex-wrap items-center gap-2";
  const name = document.createElement("p");
  name.className = "text-lg font-semibold";
  name.textContent = lead.name || "Без имени";
  head.append(name);
  const badge = (text: string, style: string) => {
    const tag = document.createElement("span");
    tag.className = `rounded-full px-2 py-0.5 text-xs font-medium ${style}`;
    tag.textContent = text;
    head.append(tag);
  };
  if (lead.interest) badge(lead.interest, "bg-violet-100 text-violet-800");
  if (fresh) badge("новая", "bg-pink-100 text-pink-800");
  if (reminded) badge("напоминание", "bg-amber-100 text-amber-800");
  const time = document.createElement("span");
  time.className = "ml-auto text-xs text-slate-400";
  time.textContent = moscowTime(lead.createdAt);
  head.append(time);

  const body = document.createElement("div");
  body.className = "grid gap-1 text-sm sm:grid-cols-2";
  body.append(field("Телефон", lead.phone));
  if (lead.direction) body.append(field("Направление", lead.direction));
  if (lead.preferredTime) body.append(field("Время", lead.preferredTime));
  if (lead.utmSource)
    body.append(field("Источник", [lead.utmSource, lead.utmCampaign].filter(Boolean).join(" · ")));
  if (lead.comment) body.append(field("Комментарий", lead.comment));

  const footer = document.createElement("div");
  footer.className = "mt-3 flex flex-wrap items-center gap-3";
  const note = document.createElement("p");
  note.className = "text-sm text-slate-500";
  if (taken) {
    const done = document.createElement("p");
    done.className = "text-sm font-medium text-emerald-700";
    done.textContent = `Взята в работу ${moscowTime(lead.processedAt)}`.trim();
    footer.append(done);
  } else {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "rounded-md bg-pink-500 px-4 py-2 font-medium text-white hover:bg-pink-400 disabled:opacity-50";
    button.textContent = "Взял в работу";
    button.addEventListener("click", () => take(lead, button, note));
    footer.append(button);
  }
  footer.append(note);

  item.append(head, body, footer);
  return item;
};

async function poll() {
  try {
    const response = await request("leads");
    if (!response.ok) {
      leadsError.textContent = await describeFailure(response, "«Заявки»");
      connection.textContent = "ошибка";
      return;
    }
    const leads = parseLeads(await response.json());
    const { added, reminded } = changes(known, leads);
    if (!firstLoad) {
      for (const lead of added) notify("Новая заявка", lead);
      for (const lead of reminded) notify("Заявку никто не взял", lead);
    }
    const freshIds = new Set(firstLoad ? [] : added.map((lead) => lead.id));
    leadsList.replaceChildren(...leads.map((lead) => card(lead, freshIds.has(lead.id))));
    leadsEmpty.classList.toggle("hidden", leads.length > 0);
    const waiting = leads.filter((lead) => lead.status === "").length;
    waitingCount.textContent = waiting > 0 ? String(waiting) : "";
    document.title =
      waiting > 0 ? `(${waiting}) Пульс — заявки` : "Пульс — рабочее место менеджера";
    leadsError.textContent = "";
    connection.textContent = `подключено · ${new Date().toLocaleTimeString("ru-RU")}`;
    known = new Map(leads.map((lead) => [lead.id, lead]));
    firstLoad = false;
  } catch (error) {
    leadsError.textContent =
      error instanceof SyntaxError
        ? "Сценарий «Заявки» ответил не JSON."
        : error instanceof Error && error.message.includes("массив")
          ? error.message
          : "Сервер не ответил. Проверьте, что машина с n8n работает.";
    connection.textContent = "нет связи";
  }
}

const loadReport = async () => {
  const table = byId<HTMLTableSectionElement>("report");
  const error = byId<HTMLParagraphElement>("report-error");
  try {
    const response = await request("report");
    if (!response.ok) {
      error.textContent = await describeFailure(response, "«Отчёт»");
      return;
    }
    const rows = parseReport(await response.json());
    table.replaceChildren(
      ...rows.map((row, index) => {
        const tr = document.createElement("tr");
        tr.className = index === rows.length - 1 ? "border-t border-slate-200 font-semibold" : "";
        for (const [value, right] of [
          [row.source, false],
          [String(row.visits), true],
          [String(row.leads), true],
          [String(row.processed), true],
          [row.conversion, true],
        ] as const) {
          const td = document.createElement("td");
          td.className = `px-4 py-2 ${right ? "text-right" : ""}`;
          td.textContent = value;
          tr.append(td);
        }
        return tr;
      }),
    );
    error.textContent = "";
  } catch (failure) {
    error.textContent =
      failure instanceof Error && failure.message.includes("rows")
        ? failure.message
        : "Сценарий «Отчёт» не ответил или ответил не JSON.";
  }
};

for (const tab of document.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
  tab.addEventListener("click", () => {
    for (const other of document.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
      const active = other === tab;
      other.setAttribute("aria-selected", String(active));
      byId<HTMLElement>(`tab-${other.dataset.tab}`).hidden = !active;
    }
    if (tab.dataset.tab === "report") void loadReport();
  });
}

byId<HTMLButtonElement>("report-refresh").addEventListener("click", () => void loadReport());

const notifyButton = byId<HTMLButtonElement>("notify");
if (!("Notification" in window) || Notification.permission === "granted") {
  notifyButton.hidden = true;
}
notifyButton.addEventListener("click", async () => {
  const permission = await Notification.requestPermission();
  notifyButton.hidden = permission === "granted";
});

void poll();
setInterval(() => void poll(), pollInterval);
