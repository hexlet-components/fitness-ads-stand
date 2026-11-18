import { describe, expect, test } from "vitest";
import { changes, moscowTime, parseLeads, parseReport, type Lead } from "./manager-api";

const row = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Клиент ${id}`,
  phone: "+7 900 000-00-00",
  created_at: `2026-11-18T1${id}:00:00.000+03:00`,
  status: null,
  ...extra,
});

describe("parseLeads", () => {
  test("принимает массив строк таблицы и сортирует от новых к старым", () => {
    const leads = parseLeads([
      row(1),
      row(3),
      row(2, { utm_source: "vk", preferred_time: "вечер" }),
    ]);
    expect(leads.map((lead) => lead.id)).toEqual(["3", "2", "1"]);
    expect(leads[1]).toMatchObject({ utmSource: "vk", preferredTime: "вечер", status: "" });
  });

  test("принимает ответ вида {data: [...]}", () => {
    expect(parseLeads({ data: [row(1)] })).toHaveLength(1);
  });

  test("отбрасывает строки без id", () => {
    expect(parseLeads([row(1), { name: "без id" }, null])).toHaveLength(1);
  });

  test("отклоняет ответ без массива", () => {
    expect(() => parseLeads({ ok: true })).toThrow("массив заявок");
  });
});

describe("parseReport", () => {
  test("читает строки отчёта и подставляет «без метки» и прочерк", () => {
    expect(parseReport({ rows: [{ source: "", visits: "10", leads: 2, processed: 1 }] })).toEqual([
      { source: "без метки", visits: 10, leads: 2, processed: 1, conversion: "—" },
    ]);
  });

  test("отклоняет ответ без rows", () => {
    expect(() => parseReport([])).toThrow("rows");
  });
});

describe("changes", () => {
  const lead = (id: string, extra: Partial<Lead> = {}): Lead => ({
    ...parseLeads([row(1)])[0]!,
    id,
    ...extra,
  });

  test("находит новые заявки и свежие напоминания по необработанным", () => {
    const before = new Map([
      ["1", lead("1")],
      ["2", lead("2")],
      ["3", lead("3")],
    ]);
    const after = [
      lead("1", { remindedAt: "2026-11-18T12:00:00Z" }),
      lead("2", { remindedAt: "2026-11-18T12:00:00Z", status: "processed" }),
      lead("3"),
      lead("4"),
    ];
    const { added, reminded } = changes(before, after);
    expect(added.map((item) => item.id)).toEqual(["4"]);
    expect(reminded.map((item) => item.id)).toEqual(["1"]);
  });
});

test("moscowTime показывает время по Москве", () => {
  expect(moscowTime("2026-11-18T07:42:00Z")).toBe("18.11, 10:42");
  expect(moscowTime("не дата")).toBe("");
});
