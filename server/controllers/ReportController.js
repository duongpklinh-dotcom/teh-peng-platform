// Control: ReportController (Platform Management)
// US-PM07 Generate weekly report: new IDPs, views and shortlists for a week,
// compared with the previous week.
//
// Data sources (shared MongoDB collections):
//   projects      { _id, category, createdAt }          - exists today
//   projectViews  { projectId, viewedAt }               - written by View Project Details
//   shortlists    { projectId, shortlistedAt }          - written by Favourites / Shortlist
// A missing/empty collection simply counts as zero.

const WeeklyReport = require('../models/WeeklyReport');

const { DAY_MS, SG_OFFSET_HOURS } = WeeklyReport;
const UNCATEGORISED = 'Uncategorised';

class ReportController {
  constructor(db) {
    this.projects = db.collection('projects');
    this.projectViews = db.collection('projectViews');
    this.shortlists = db.collection('shortlists');
  }

  // generateWeeklyReport(weekStart 'YYYY-MM-DD', a Monday) -> WeeklyReport
  async generateWeeklyReport(weekStart, now = new Date()) {
    let start;
    try {
      start = WeeklyReport.parseWeekStart(weekStart);
    } catch (validationError) {
      throw this.#error(validationError.message, 400);
    }

    if (start.getTime() > now.getTime()) {
      throw this.#error('Cannot generate a report for a week that has not started', 400);
    }

    const previousStart = new Date(start.getTime() - 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    const range = field => ({ [field]: { $gte: previousStart, $lt: end } });

    const [projects, views, shortlists] = await Promise.all([
      this.projects
        .find(range('createdAt'), { projection: { category: 1, createdAt: 1 } })
        .toArray(),
      this.projectViews
        .find(range('viewedAt'), { projection: { projectId: 1, viewedAt: 1 } })
        .toArray(),
      this.shortlists
        .find(range('shortlistedAt'), { projection: { projectId: 1, shortlistedAt: 1 } })
        .toArray()
    ]);

    // Views/shortlists refer to a project; look up its category.
    const allProjects = await this.projects
      .find({}, { projection: { category: 1 } })
      .toArray();
    const categoryOf = new Map(
      allProjects.map(project => [String(project._id), project.category || UNCATEGORISED])
    );

    return new WeeklyReport({
      weekStart,
      current: this.#summarise(projects, views, shortlists, start, categoryOf),
      previous: this.#summarise(projects, views, shortlists, previousStart, categoryOf, false)
    });
  }

  // Count events falling in [weekStart, weekStart + 7 days).
  #summarise(projects, views, shortlists, weekStart, categoryOf, detailed = true) {
    const startMs = weekStart.getTime();
    const inWeek = date => {
      const t = new Date(date).getTime();
      return t >= startMs && t < startMs + 7 * DAY_MS;
    };
    const dayIndex = date => Math.floor((new Date(date).getTime() - startMs) / DAY_MS);

    const weekProjects = projects.filter(p => inWeek(p.createdAt));
    const weekViews = views.filter(v => inWeek(v.viewedAt));
    const weekShortlists = shortlists.filter(s => inWeek(s.shortlistedAt));

    const summary = {
      newProjects: weekProjects.length,
      views: weekViews.length,
      shortlists: weekShortlists.length
    };

    if (!detailed) return summary;

    summary.daily = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(startMs + i * DAY_MS + SG_OFFSET_HOURS * 3600000)
        .toISOString().slice(0, 10),
      newProjects: 0,
      views: 0,
      shortlists: 0
    }));
    weekProjects.forEach(p => summary.daily[dayIndex(p.createdAt)].newProjects++);
    weekViews.forEach(v => summary.daily[dayIndex(v.viewedAt)].views++);
    weekShortlists.forEach(s => summary.daily[dayIndex(s.shortlistedAt)].shortlists++);

    const byCategory = new Map();
    const bucket = name => {
      if (!byCategory.has(name)) {
        byCategory.set(name, { category: name, newProjects: 0, views: 0, shortlists: 0 });
      }
      return byCategory.get(name);
    };
    weekProjects.forEach(p => bucket(p.category || UNCATEGORISED).newProjects++);
    weekViews.forEach(v => bucket(categoryOf.get(String(v.projectId)) || UNCATEGORISED).views++);
    weekShortlists.forEach(s =>
      bucket(categoryOf.get(String(s.projectId)) || UNCATEGORISED).shortlists++
    );
    summary.byCategory = [...byCategory.values()].sort(
      (a, b) => b.views - a.views || a.category.localeCompare(b.category)
    );

    return summary;
  }

  #error(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
  }
}

module.exports = ReportController;
