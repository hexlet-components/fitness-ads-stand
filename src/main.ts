import "./style.css";
import { adLink, ads, parseSite } from "./links";

const storageKey = "fitness-ads-stand:site";

const comments = [
  "Хочу абонемент в бассейн, удобно по вечерам",
  "Попробовать йогу, никогда не занималась",
  "Нужен персональный тренер, хочу похудеть к лету",
  "Сколько стоит абонемент на год?",
  "Перезвоните",
  "Есть ли групповые тренировки по утрам в выходные?",
];

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Хранилище может быть недоступно (приватный режим), тогда адрес живёт до перезагрузки.
const storage = {
  get: () => {
    try {
      return localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  },
  set: (value: string) => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // адрес останется в поле формы
    }
  },
};

const form = byId<HTMLFormElement>("site-form");
const input = form.elements.namedItem("site") as HTMLInputElement;
const error = byId<HTMLParagraphElement>("site-error");
const status = byId<HTMLSpanElement>("stand-status");

const applySite = (value: string): boolean => {
  const result = parseSite(value);
  const links = document.querySelectorAll<HTMLAnchorElement>("a[data-ad]");
  if (!result.ok) {
    for (const link of links) {
      link.removeAttribute("href");
    }
    status.textContent = "не указан";
    return false;
  }
  for (const link of links) {
    const ad = ads.find((item) => item.id === link.dataset.ad);
    if (ad) {
      link.href = adLink(result.url, ad);
    }
  }
  for (const host of document.querySelectorAll<HTMLElement>("[data-site-host]")) {
    host.textContent = result.url.hostname;
  }
  status.textContent = result.url.hostname;
  return true;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = parseSite(input.value);
  if (!result.ok) {
    error.textContent = result.error;
    return;
  }
  error.textContent = "";
  input.value = result.url.toString();
  storage.set(input.value);
  applySite(input.value);
  byId<HTMLDetailsElement>("stand").open = false;
});

// Без адреса сайта объявления никуда не ведут, поэтому стенд просит его вписать.
document.addEventListener("click", (event) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-ad]");
  if (link && !link.hasAttribute("href")) {
    event.preventDefault();
    byId<HTMLDetailsElement>("stand").open = true;
    error.textContent = "Сначала впишите адрес своего сайта и нажмите «Сохранить»";
    input.focus();
  }
});

const renderComments = () => {
  const list = byId<HTMLUListElement>("comments");
  for (const text of comments) {
    const item = document.createElement("li");
    item.className =
      "flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm";
    const label = document.createElement("span");
    label.textContent = text;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-white";
    button.textContent = "Копировать";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Скопировано";
      } catch {
        button.textContent = "Не вышло";
      }
      setTimeout(() => {
        button.textContent = "Копировать";
      }, 1500);
    });
    item.append(label, button);
    list.append(item);
  }
};

renderComments();
const saved = storage.get();
input.value = saved;
if (applySite(saved)) {
  byId<HTMLDetailsElement>("stand").open = false;
}
