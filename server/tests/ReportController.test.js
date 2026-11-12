// Test-first cases for US-PM07 Generate weekly report.
const test = require('node:test');
const assert = require('node:assert/strict');
const ReportController = require('../controllers/ReportController');

// Singapore (UTC+8) helper: '2026-11-02' + hour -> Date
const sg = (day, hour = 12) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+08:00`);

// Minimal fake db that honours the {field: {$gte,$lt}} range filter.
function makeDb({ projects = [], projectViews = [], shortlists = [] }) {
  const data = { projects, projectViews, shortlists };
  const dateField = { projects: 'createdAt', projectViews: 'viewedAt', shortlists: 'shortlistedAt' };

  return {
    collection: name => ({
      find: filter => ({
        toArray: async () => {
          const field = dateField[name];
          const range = filter && filter[field];
          return data[name].filter(doc =>
            !range || (doc[field] >= range.$gte && doc[field] < range.$lt)
          );
        }
      })
    })
  };
}

const NOW = sg('2026-11-12');
const WEEK = '2026-11-02'; // a Monday

test('Counts new projects, views and shortlists inside the week', async () => {
  const db = makeDb({
    projects: [
      { _id: 'p1', category: 'Residential', createdAt: sg('2026-11-02', 9) },
      { _id: 'p2', category: 'Commercial', createdAt: sg('2026-11-08', 23) }
    ],
    projectViews: [
      { projectId: 'p1', viewedAt: sg('2026-11-03') },
      { projectId: 'p1', viewedAt: sg('2026-11-03') },
      { projectId: 'p2', viewedAt: sg('2026-11-05') }
    ],
    shortlists: [{ projectId: 'p2', shortlistedAt: sg('2026-11-04') }]
  });

  const report = await new ReportController(db).generateWeeklyReport(WEEK, NOW);

  assert.deepEqual(report.totals, { newProjects: 2, views: 3, shortlists: 1 });
  assert.equal(report.weekStart, '2026-11-02');
  assert.equal(report.weekEnd, '2026-11-08');
});

test('Compares against the previous week and calculates percent change', async () => {
  const db = makeDb({
    projectViews: [
      { projectId: 'p1', viewedAt: sg('2026-10-27') },
      { projectId: 'p1', viewedAt: sg('2026-10-28') },
      { projectId: 'p1', viewedAt: sg('2026-11-03') },
      { projectId: 'p1', viewedAt: sg('2026-11-04') },
      { projectId: 'p1', viewedAt: sg('2026-11-05') }
    ]
  });

  const report = await new ReportController(db).generateWeeklyReport(WEEK, NOW);

  assert.equal(report.previousTotals.views, 2);
  assert.equal(report.totals.views, 3);
  assert.equal(report.changePercent.views, 50);
});

test('Percent change is null when the previous week had no activity', async () => {
  const db = makeDb({ shortlists: [{ projectId: 'p1', shortlistedAt: sg('2026-11-03') }] });
  const report = await new ReportController(db).generateWeeklyReport(WEEK, NOW);

  assert.equal(report.changePercent.shortlists, null);
  assert.equal(report.changePercent.views, 0); // 0 -> 0
});

test('Events on the week boundary are assigned to the correct week', async () => {
  const db = makeDb({
    projectViews: [
      { projectId: 'p1', viewedAt: sg('2026-11-02', 0) },   // first moment of the week
      { projectId: 'p1', viewedAt: sg('2026-11-09', 0) }    // belongs to next week
    ]
  });
  const report = await new ReportController(db).generateWeeklyReport(WEEK, NOW);

  assert.equal(report.totals.views, 1);
});

test('Returns seven daily rows and a per-category breakdown', async () => {
  const db = makeDb({
    projects: [{ _id: 'p1', category: 'Residential', createdAt: sg('2026-11-02') }],
    projectViews: [
      { projectId: 'p1', viewedAt: sg('2026-11-04') },
      { projectId: 'ghost', viewedAt: sg('2026-11-04') }
    ]
  });
  const report = await new ReportController(db).generateWeeklyReport(WEEK, NOW);

  assert.equal(report.daily.length, 7);
  assert.equal(report.daily[0].date, '2026-11-02');
  assert.equal(report.daily[0].newProjects, 1);
  assert.equal(report.daily[2].views, 2);

  const residential = report.byCategory.find(row => row.category === 'Residential');
  assert.deepEqual(
    [residential.newProjects, residential.views],
    [1, 1]
  );
  assert.equal(report.byCategory.find(row => row.category === 'Uncategorised').views, 1);
});

test('Empty week returns zeros, not an error', async () => {
  const report = await new ReportController(makeDb({})).generateWeeklyReport(WEEK, NOW);
  assert.deepEqual(report.totals, { newProjects: 0, views: 0, shortlists: 0 });
  assert.equal(report.byCategory.length, 0);
});

test('Rejects a missing or badly formatted date', async () => {
  const controller = new ReportController(makeDb({}));
  await assert.rejects(controller.generateWeeklyReport('', NOW), error => error.status === 400);
  await assert.rejects(controller.generateWeeklyReport('02/11/2026', NOW), /YYYY-MM-DD/);
  await assert.rejects(controller.generateWeeklyReport('2026-02-31', NOW), /Invalid week start date/);
});

test('Rejects a date that is not a Monday', async () => {
  await assert.rejects(
    new ReportController(makeDb({})).generateWeeklyReport('2026-11-03', NOW),
    /must start on a Monday/
  );
});

test('Rejects a week that has not started yet', async () => {
  await assert.rejects(
    new ReportController(makeDb({})).generateWeeklyReport('2026-11-16', NOW),
    /has not started/
  );
});
