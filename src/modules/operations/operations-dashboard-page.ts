export function renderOperationsDashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Operations Dashboard</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #111; background: #f6f7f9; }
    body { margin: 0; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    .sub { color: #555; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #e3e6ea; border-radius: 8px; padding: 16px; }
    .card h2 { margin: 0 0 12px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: #444; }
    .metric { margin-bottom: 12px; }
    .label { font-size: 0.85rem; color: #666; }
    .value { font-size: 1.4rem; font-weight: 600; }
    .trend { font-size: 0.85rem; color: #666; margin-top: 4px; }
    .delta-good { color: #0a7a32; }
    .delta-bad { color: #b42318; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #eee; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 0.75rem; }
    .hero { grid-column: 1 / -1; border-left: 4px solid #3730a3; }
  </style>
</head>
<body>
  <h1>Operations Dashboard</h1>
  <p class="sub">Internal only — Founder / CTO / Product</p>
  <div id="root" class="grid">Loading…</div>
  <script>
    function fmtPct(v) { return (v * 100).toFixed(1) + '%'; }
    function fmtRateTrend(metric, asPercent) {
      const today = asPercent ? fmtPct(metric.today) : metric.today;
      const yesterday = asPercent ? fmtPct(metric.yesterday) : metric.yesterday;
      const d = metric.delta_percent;
      const cls = d === null ? '' : (d <= 0 ? 'delta-good' : 'delta-bad');
      const arrow = d === null ? '—' : (d <= 0 ? '↓' : '↑');
      const delta = d === null ? 'n/a' : Math.abs(d) + '%';
      return '<div class="trend">Yesterday: ' + yesterday + ' ' + arrow + ' ' + delta + '</div>';
    }
    function durationCard(title, metric) {
      return '<div class="card"><h2>' + title + '</h2><div class="metric"><div class="value">' + metric.today_formatted +
        '</div>' + fmtRateTrend({ today: metric.today_ms, yesterday: metric.yesterday_ms, delta_percent: metric.delta_percent }, false) + '</div></div>';
    }
    function trendCard(title, metric, asPercent) {
      const today = asPercent ? fmtPct(metric.today) : metric.today;
      return '<div class="card"><h2>' + title + '</h2><div class="metric"><div class="value">' + today +
        '</div>' + fmtRateTrend(metric, asPercent) + '</div></div>';
    }
    function ttqcByModeCard(rows) {
      const body = rows.length
        ? rows.map(r => '<tr><td>' + r.mode + '</td><td>' + r.avg_ttqc_formatted + '</td><td>' + r.count + '</td></tr>').join('')
        : '<tr><td colspan="3">No data yet</td></tr>';
      return '<div class="card"><h2>TTQC by Mode (EPIC-002)</h2><table><thead><tr><th>Mode</th><th>Avg TTQC</th><th>Count</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    function tableCard(title, rows, col1, col2) {
      const body = rows.length ? rows.map(r => '<tr><td>' + r[col1] + '</td><td><span class="badge">' + r[col2] + '</span></td></tr>').join('') : '<tr><td colspan="2">No data yet</td></tr>';
      return '<div class="card"><h2>' + title + '</h2><table><thead><tr><th>' + col1 + '</th><th>Count</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    function fieldReviewStatsCard(rows) {
      const body = rows.length
        ? rows.map(r => '<tr><td>' + r.field + '</td><td>' + r.reviewed_count + '</td><td>' + fmtPct(r.override_rate) + '</td><td>' + fmtPct(r.acceptance_rate) + '</td></tr>').join('')
        : '<tr><td colspan="4">No data yet</td></tr>';
      return '<div class="card"><h2>Field Review Stats (Q1–Q3)</h2><table><thead><tr><th>Field</th><th>Reviewed</th><th>Override %</th><th>Accept %</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    function fieldDurationCard(rows) {
      const body = rows.length
        ? rows.map(r => '<tr><td>' + r.field + '</td><td>' + r.avg_duration_formatted + '</td><td>' + r.count + '</td></tr>').join('')
        : '<tr><td colspan="3">No data yet</td></tr>';
      return '<div class="card"><h2>Avg Time-on-Field (Q5)</h2><table><thead><tr><th>Field</th><th>Avg Duration</th><th>Count</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    function reviewModeSplitCard(rows) {
      const body = rows.length
        ? rows.map(r => '<tr><td>' + r.mode + '</td><td>' + r.count + '</td><td>' + fmtPct(r.percent_of_reviews) + '</td><td>' + fmtPct(r.abandon_rate) + '</td></tr>').join('')
        : '<tr><td colspan="4">No data yet</td></tr>';
      return '<div class="card"><h2>Review Mode Split (EPIC-002)</h2><table><thead><tr><th>Mode</th><th>Uses</th><th>% of Reviews</th><th>Abandon %</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
      const body = rows.length
        ? rows.map(r => '<tr><td>' + r.priority + '</td><td>' + r.reviewed_count + '</td><td>' + fmtPct(r.percent_of_reviews) + '</td><td>' + fmtPct(r.override_rate) + '</td></tr>').join('')
        : '<tr><td colspan="4">No data yet</td></tr>';
      return '<div class="card"><h2>Review Queue Activity by Priority (Q4)</h2><table><thead><tr><th>Priority</th><th>Reviewed</th><th>% of Reviews</th><th>Override %</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    fetch('/internal/operations-dashboard').then(r => r.json()).then(d => {
      const root = document.getElementById('root');
      root.innerHTML = [
        '<div class="card hero"><h2>Why People Override AI</h2>' + tableCard('', d.ai.why_people_override_ai, 'reason', 'count').replace('<div class="card"><h2></h2>', '') + '</div>',
        trendCard('Resumes Imported Today', d.business.resumes_imported_today, false),
        '<div class="card"><h2>Resumes This Week</h2><div class="value">' + d.business.resumes_imported_this_week + '</div></div>',
        trendCard('Qualified Candidates', d.business.qualified_candidates_created, false),
        durationCard('Average TTQC', d.business.average_ttqc),
        durationCard('Median TTQC', d.business.median_ttqc),
        ttqcByModeCard(d.business.ttqc_by_mode),
        durationCard('Average Parse Time', d.ai.average_parse_time),
        trendCard('LLM Usage Rate', d.ai.llm_usage_rate, true),
        trendCard('Human Override Rate', d.ai.average_human_override_rate, true),
        trendCard('AI Acceptance Rate', d.ai.average_ai_acceptance_rate, true),
        trendCard('Verification Rate', d.ai.average_verification_rate, true),
        trendCard('Review Completion Rate', d.ai.average_review_completion_rate, true),
        trendCard('Average Confidence', d.ai.average_confidence, true),
        tableCard('Top Missing Fields', d.ai.top_missing_fields, 'field', 'count'),
        fieldReviewStatsCard(d.ai.field_review_stats),
        fieldDurationCard(d.ai.field_edit_duration),
        reviewByPriorityCard(d.ai.review_by_priority),
        trendCard('Import Success Rate', d.reliability.import_success_rate, true),
        trendCard('Import Failure Rate', d.reliability.import_failure_rate, true),
        durationCard('Avg Processing Time', d.reliability.average_processing_time),
        trendCard('OCR Usage Rate', d.reliability.ocr_usage_rate, true),
        trendCard('LLM Failure Rate', d.reliability.llm_failure_rate, true),
        trendCard('Daily Active Recruiters', d.usage.daily_active_recruiters, false),
        trendCard('Avg CVs / Day', d.usage.average_cvs_imported_per_day, false),
        tableCard('Imports per Recruiter', d.usage.imports_per_recruiter, 'recruiter_id', 'count'),
        reviewModeSplitCard(d.usage.review_mode_split),
      ].join('');
    }).catch(err => { document.getElementById('root').textContent = 'Failed to load: ' + err; });
  </script>
</body>
</html>`;
}
