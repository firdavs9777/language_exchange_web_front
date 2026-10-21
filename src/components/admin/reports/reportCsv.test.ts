import { toCsv, csvCell } from "./reportCsv";
import { REPORT_FIXTURE } from "./reportFixture";

const blocks = (csv: string) => csv.trim().split(/\r?\n\r?\n/).map((b) => b.split(/\r?\n/));

it("has a title and a header row per block", () => {
  const csv = toCsv(REPORT_FIXTURE);
  const all = blocks(csv);
  const titles = all.map((b) => b[0]);
  expect(titles).toEqual(
    expect.arrayContaining([
      "Summary",
      "Visitors and page views",
      "Countries",
      "Sources",
      "Top pages",
      "Funnel",
      "App store clicks by button",
      "App store clicks by source",
      "App store clicks over time",
      "Devices",
      "Site languages",
      "Members by section",
      "Section top pages",
      "Members",
      "Sign-ups by",
      "App activity",
      "VIP",
    ])
  );
  // The first line names the period; every block after it has a title and a header.
  for (const b of all.slice(1)) expect(b.length).toBeGreaterThanOrEqual(2);
  const countries = all.find((b) => b[0] === "Countries")!;
  expect(countries[1]).toBe("code,country,visitors");
  expect(countries[2]).toBe("KR,South Korea,1640");
  const summary = all.find((b) => b[0] === "Summary")!;
  expect(summary[1]).toBe("metric,current,previous");
  expect(summary).toContain("visitors,4812,4296");
});

it("first line names the period", () => {
  const csv = toCsv(REPORT_FIXTURE);
  expect(csv.split(/\r?\n/)[0]).toBe('BananaTalk report,week,2026-W42,"Oct 12 – 18, 2026"');
});

it("escapes commas and quotes in paths", () => {
  const csv = toCsv({
    ...REPORT_FIXTURE,
    web: {
      ...REPORT_FIXTURE.web,
      topPages: [{ path: '/a,b"c', views: 3, avgMs: 1000 }],
    },
  });
  const pages = blocks(csv).find((b) => b[0] === "Top pages")!;
  expect(pages[1]).toBe("path,views,avg_seconds");
  expect(pages[2]).toBe('"/a,b""c",3,1');
});

it("neutralises cells a spreadsheet would run as a formula", () => {
  expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  expect(csvCell("+1")).toBe("'+1");
  expect(csvCell(-5)).toBe("-5");
  expect(csvCell(null)).toBe("");
  expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
});

it("writes empty cells, not null or NaN, when previous is missing", () => {
  const csv = toCsv({ ...REPORT_FIXTURE, previous: null, members: { ...REPORT_FIXTURE.members, retention: null } });
  expect(csv).not.toMatch(/null|NaN|undefined|Infinity/);
  const summary = blocks(csv).find((b) => b[0] === "Summary")!;
  expect(summary).toContain("visitors,4812,");
});
