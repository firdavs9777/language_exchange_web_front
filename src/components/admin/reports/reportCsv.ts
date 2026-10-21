import { Report } from "../../../store/slices/adminSlice";
import { regionName } from "./reportFormat";

/**
 * The report as a CSV file, built in the browser from the same JSON the page
 * shows (and the emails send), so the three can't disagree.
 *
 * One block per section of the page: a title line, a header row, the rows,
 * then a blank line. Labels are English and values raw (counts, seconds), so
 * the file reads the same whoever exports it and sums cleanly in a sheet.
 */

/** Cells a spreadsheet would evaluate as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** One RFC 4180 cell. Strings that look like formulas are prefixed with `'`. */
export const csvCell = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return isFinite(value) ? String(value) : "";
  let s = String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const row = (cells: any[]): string => cells.map(csvCell).join(",");

const block = (title: string, header: string[], rows: any[][]): string =>
  [title, row(header), ...rows.map(row)].join("\r\n");

const seconds = (ms: any): number | null =>
  typeof ms === "number" && isFinite(ms) ? Math.round(ms / 1000) : null;

const list = <T>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);

export const toCsv = (report: Report): string => {
  const web = report.web;
  const members = report.members;
  const prev: any = report.previous || {};
  const taps = web.storeTaps;
  const p = (key: string) => (prev[key] === undefined ? null : prev[key]);

  const blocks = [
    row(["BananaTalk report", report.period, report.periodKey, report.label]),
    block("Summary", ["metric", "current", "previous"], [
      ["visitors", web.visitors, p("visitors")],
      ["page_views", web.pageViews, p("pageViews")],
      ["visits", web.visits, p("visits")],
      ["pages_per_visit", web.pagesPerVisit, null],
      ["avg_visit_seconds", seconds(web.avgVisitMs), null],
      ["web_signups", members.webSignups, p("webSignups")],
      ["signups", members.signups, p("signups")],
      ["active_members", members.active, p("active")],
      ["store_taps", taps.total, p("storeTaps")],
      ["ios_taps", taps.ios, p("iosTaps")],
      ["android_taps", taps.android, p("androidTaps")],
    ]),
    block(
      "Visitors and page views",
      ["time", "visitors", "page_views"],
      list(web.series).map((r) => [r.x, r.visitors, r.pageViews])
    ),
    block(
      "Countries",
      ["code", "country", "visitors"],
      list(web.countries).map((r) => [r.code, regionName(r.code, "en"), r.count])
    ),
    block("Sources", ["type", "name", "visits"], list(web.sources).map((r) => [r.type, r.name, r.count])),
    block(
      "Top pages",
      ["path", "views", "avg_seconds"],
      list(web.topPages).map((r) => [r.path, r.views, seconds(r.avgMs)])
    ),
    block("Funnel", ["step", "count"], [
      ["visited", web.funnel.visited],
      ["opened_signup", web.funnel.signupStarted],
      ["signed_up", web.funnel.signedUp],
      ["tapped_app_store", web.funnel.storeTaps],
    ]),
    block(
      "App store clicks by button",
      ["button", "ios", "android"],
      list(taps.byPlacement).map((r) => [r.placement, r.ios, r.android])
    ),
    block(
      "App store clicks by source",
      ["type", "name", "ios", "android"],
      list(taps.bySource).map((r) => [r.type, r.name, r.ios, r.android])
    ),
    block(
      "App store clicks over time",
      ["time", "ios", "android"],
      list(taps.series).map((r) => [r.x, r.ios, r.android])
    ),
    block("Devices", ["device", "visitors"], list(web.devices).map((r) => [r.device, r.count])),
    block("Site languages", ["language", "visitors"], list(web.languages).map((r) => [r.language, r.count])),
    block(
      "Members by section",
      ["section", "members", "avg_seconds_per_member"],
      list(web.sections).map((r) => [r.section, r.members, seconds(r.avgMs)])
    ),
    block(
      "Section top pages",
      ["section", "path", "views"],
      list(web.sections).reduce(
        (rows: any[][], s) => rows.concat(list(s.topPages).map((pg) => [s.section, pg.path, pg.views])),
        []
      )
    ),
    block("Members", ["metric", "value"], [
      ["signups", members.signups],
      ["signups_started", members.signupsStarted],
      ["web_signups", members.webSignups],
      ["active", members.active],
      ["total_users", members.totalUsers],
      ["completed_users", members.completedUsers],
      ["retention", members.retention],
      ...list(members.appPlatforms).map((r) => [`app_platform_${r.key}`, r.count]),
    ]),
    block(
      "Sign-ups by",
      ["breakdown", "key", "count"],
      (["native", "learning", "country", "platform", "gender"] as const).reduce(
        (rows: any[][], name) =>
          rows.concat(list(members.breakdowns && members.breakdowns[name]).map((r) => [name, r.key, r.count])),
        []
      )
    ),
    block("App activity", ["metric", "count"], [
      ["messages", report.app.messages],
      ["conversations", report.app.conversations],
      ["moments", report.app.moments],
      ["stories", report.app.stories],
      ["calls", report.app.calls],
    ]),
    block("VIP", ["metric", "value"], [
      ["new_vip", report.vip.newVip],
      ["expiring_in_7_days", report.vip.expiringSoon],
      ...list(report.vip.activeByPlan).map((r) => [`active_${r.plan}`, r.count]),
    ]),
  ];
  return `${blocks.join("\r\n\r\n")}\r\n`;
};
