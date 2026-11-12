// Entity: WeeklyReport (Platform Management - US-PM07)
// Holds the metrics for one 7-day week and the previous week for comparison.
// Weeks run Monday 00:00 to the next Monday 00:00 in Singapore time (UTC+8).

const SG_OFFSET_HOURS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseWeekStart(weekStart) {
  if (typeof weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new Error('Please provide the week start date as YYYY-MM-DD');
  }

  const start = new Date(`${weekStart}T00:00:00+0${SG_OFFSET_HOURS}:00`);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid week start date');
  }

  // Reject dates like 2026-02-31 that JS would silently roll over.
  const checkDate = new Date(start.getTime() + SG_OFFSET_HOURS * 3600000)
    .toISOString().slice(0, 10);
  if (checkDate !== weekStart) {
    throw new Error('Invalid week start date');
  }

  // getUTCDay on the Singapore-local date: 1 = Monday.
  const localDay = new Date(start.getTime() + SG_OFFSET_HOURS * 3600000).getUTCDay();
  if (localDay !== 1) {
    throw new Error('A week must start on a Monday');
  }

  return start;
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null; // null = no baseline
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

class WeeklyReport {
  constructor({ weekStart, current, previous }) {
    this.weekStart = weekStart;
    this.weekEnd = new Date(
      new Date(`${weekStart}T00:00:00+0${SG_OFFSET_HOURS}:00`).getTime() + 6 * DAY_MS +
      SG_OFFSET_HOURS * 3600000
    ).toISOString().slice(0, 10);
    this.generatedAt = new Date();

    this.totals = {
      newProjects: current.newProjects,
      views: current.views,
      shortlists: current.shortlists
    };
    this.previousTotals = {
      newProjects: previous.newProjects,
      views: previous.views,
      shortlists: previous.shortlists
    };
    this.changePercent = {
      newProjects: percentChange(current.newProjects, previous.newProjects),
      views: percentChange(current.views, previous.views),
      shortlists: percentChange(current.shortlists, previous.shortlists)
    };
    this.daily = current.daily;
    this.byCategory = current.byCategory;
  }
}

WeeklyReport.DAY_MS = DAY_MS;
WeeklyReport.SG_OFFSET_HOURS = SG_OFFSET_HOURS;
WeeklyReport.parseWeekStart = parseWeekStart;
WeeklyReport.percentChange = percentChange;
module.exports = WeeklyReport;
