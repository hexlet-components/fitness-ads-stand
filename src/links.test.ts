import { describe, expect, test } from "vitest";
import { adLink, ads, parseSite } from "./links";

const site = (input: string) => {
  const result = parseSite(input);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.url;
};

describe("parseSite", () => {
  test("добавляет https к адресу без схемы", () => {
    expect(site("pulse.example.ru").toString()).toBe("https://pulse.example.ru/");
  });

  test("отбрасывает старые метки и якорь, остальные параметры оставляет", () => {
    expect(site("https://pulse.example.ru/club?utm_source=vk&lang=ru#form").toString()).toBe(
      "https://pulse.example.ru/club?lang=ru",
    );
  });

  test.each(["", "   ", "ftp://pulse.example.ru", "pulse", "https://"])("отклоняет %j", (input) => {
    expect(parseSite(input).ok).toBe(false);
  });
});

describe("adLink", () => {
  test("ставит метки объявления", () => {
    const search = ads.find((ad) => ad.id === "search");
    expect(search).toBeDefined();
    expect(adLink(site("pulse.example.ru"), search!)).toBe(
      "https://pulse.example.ru/?utm_source=yandex&utm_medium=cpc&utm_campaign=trial",
    );
  });

  test("у каждой площадки свой источник", () => {
    expect(new Set(ads.map((ad) => ad.source)).size).toBe(ads.length);
  });
});
