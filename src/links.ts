// Объявления площадок и сборка ссылок на сайт студента с UTM-метками.
// Метки совпадают с шагами проекта ai_engineer_lead_automation_project.

export type Ad = {
  id: "search" | "social" | "channel";
  source: string;
  medium: string;
  campaign: string;
};

export const ads: readonly Ad[] = [
  { id: "search", source: "yandex", medium: "cpc", campaign: "trial" },
  { id: "social", source: "vk", medium: "social", campaign: "spring" },
  { id: "channel", source: "telegram", medium: "messenger", campaign: "club" },
];

export type SiteResult = { ok: true; url: URL } | { ok: false; error: string };

// Адрес сайта студента: схема необязательна, метки и якорь из вставленного адреса отбрасываются.
export const parseSite = (input: string): SiteResult => {
  const text = input.trim();
  if (text === "") {
    return { ok: false, error: "Впишите адрес своего сайта" };
  }
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, error: "Это не похоже на адрес сайта" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Адрес сайта начинается с https://" };
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    return { ok: false, error: "В адресе нет домена, например pulse.example.ru" };
  }
  // Ключи собираются заранее: удаление во время обхода searchParams пропускает соседний ключ.
  const utmKeys = Array.from(url.searchParams.keys()).filter((key) => key.startsWith("utm_"));
  for (const key of utmKeys) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  return { ok: true, url };
};

export const adLink = (site: URL, ad: Ad): string => {
  const url = new URL(site);
  url.searchParams.set("utm_source", ad.source);
  url.searchParams.set("utm_medium", ad.medium);
  url.searchParams.set("utm_campaign", ad.campaign);
  return url.toString();
};
