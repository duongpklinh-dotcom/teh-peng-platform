// US-PM07 Generate weekly report - BCE boundary class: WeeklyReportPage
// Talks to ReportController through GET /api/reports/weekly?weekStart=YYYY-MM-DD.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Workspace from '../../components/Workspace';
import { apiRequest, isMonday, lastMonday } from './managementApi';
import '../../styles/admin.css';
import '../../styles/management.css';

const METRICS = [
  ['newProjects', 'New IDPs'],
  ['views', 'Project views'],
  ['shortlists', 'Times shortlisted']
];

function Change({ value }) {
  if (value === null) return <small>No activity last week</small>;
  if (value === 0) return <small>No change vs last week</small>;

  return (
    <small className={value > 0 ? 'pm-up' : 'pm-down'}>
      {value > 0 ? '\u25B2' : '\u25BC'} {Math.abs(value)}% vs last week
    </small>
  );
}

export default function WeeklyReports({ user }) {
  const [weekStart, setWeekStart] = useState(lastMonday());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isManager = user?.role === 'platform_management';

  async function handleGenerate(event) {
    event.preventDefault();
    if (loading) return;

    if (!weekStart) {
      setError('Please choose a week start date.');
      return;
    }
    if (!isMonday(weekStart)) {
      setError('A week starts on a Monday. Please pick a Monday.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setReport(await apiRequest(`/api/reports/weekly?weekStart=${encodeURIComponent(weekStart)}`));
    } catch (err) {
      setReport(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Opens the browser print dialog; choose "Save as PDF" as the destination.
  // The document title becomes the suggested file name.
  function handleExportPdf() {
    const originalTitle = document.title;
    document.title = `weekly-report-${report.weekStart}`;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    window.print();
  }

  const maxViews = report ? Math.max(1, ...report.daily.map(day => day.views)) : 1;

  return (
    <div className="add-project-page">
      <Workspace label="Platform management" title="Weekly Reports">
        {!isManager ? (
          <div className="panel add-project-form">
            <p>Please log in as a platform manager to view reports.</p>
            <Link className="text-link" to="/login">Login</Link>
          </div>
        ) : (
          <>
            <form className="panel pm-report-controls pm-no-print" onSubmit={handleGenerate} noValidate>
              <label>
                Week starting (Monday)
                <input
                  type="date"
                  value={weekStart}
                  onChange={event => { setWeekStart(event.target.value); setError(''); }}
                />
              </label>
              <button className="pill" type="submit" disabled={loading}>
                {loading ? 'Generating...' : 'Generate report'}
              </button>
            </form>

            {error && <div className="admin-error" role="alert">{error}</div>}

            {report && (
              <div className="panel admin-panel">
                <div className="admin-heading">
                  <button
                    type="button"
                    className="pill outline pm-no-print"
                    style={{ float: 'right' }}
                    onClick={handleExportPdf}
                  >
                    Export PDF
                  </button>
                  <h2>Week of {report.weekStart} to {report.weekEnd}</h2>
                  <p className="muted">
                    Generated {new Date(report.generatedAt).toLocaleString('en-SG')}. Weeks run
                    Monday to Sunday (Singapore time).
                  </p>
                </div>

                <div className="pm-metrics">
                  {METRICS.map(([key, label]) => (
                    <div className="pm-metric" key={key}>
                      <span>{label}</span>
                      <strong>{report.totals[key]}</strong>
                      <Change value={report.changePercent[key]} />
                      <small> (last week: {report.previousTotals[key]})</small>
                    </div>
                  ))}
                </div>

                <h3>Day by day</h3>
                <div className="pm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="pm-num">New IDPs</th>
                        <th className="pm-num">Views</th>
                        <th className="pm-num">Shortlists</th>
                        <th>Views trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.daily.map(day => (
                        <tr key={day.date}>
                          <td>{day.date}</td>
                          <td className="pm-num">{day.newProjects}</td>
                          <td className="pm-num">{day.views}</td>
                          <td className="pm-num">{day.shortlists}</td>
                          <td style={{ width: '28%' }}>
                            <span
                              className="pm-bar"
                              style={{ width: `${(day.views / maxViews) * 100}%` }}
                              aria-hidden="true"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 style={{ marginTop: 32 }}>By category</h3>
                {report.byCategory.length === 0 ? (
                  <p className="admin-empty">No activity recorded for this week.</p>
                ) : (
                  <div className="pm-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th className="pm-num">New IDPs</th>
                          <th className="pm-num">Views</th>
                          <th className="pm-num">Shortlists</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byCategory.map(row => (
                          <tr key={row.category}>
                            <td>{row.category}</td>
                            <td className="pm-num">{row.newProjects}</td>
                            <td className="pm-num">{row.views}</td>
                            <td className="pm-num">{row.shortlists}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Workspace>
    </div>
  );
}
