export function renderCandidateReviewPage(candidateId: string): string {
  const reasons = [
    "Wrong summary",
    "Missing skill",
    "Wrong years",
    "Wrong English",
    "Wrong company",
    "Other",
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Knowledge Review</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f6f7f9; color: #111; }
    header { padding: 16px 24px; background: #fff; border-bottom: 1px solid #e3e6ea; }
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 24px 24px; min-height: calc(100vh - 72px); }
    .card { background: #fff; border: 1px solid #e3e6ea; border-radius: 8px; padding: 16px; }
    .card h2 { margin: 0 0 12px; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; vertical-align: top; }
    tr.clickable { cursor: pointer; }
    tr.clickable:hover, tr.selected { background: #f3f4ff; }
    .current { font-weight: 700; }
    .badge { padding: 2px 8px; border-radius: 999px; background: #eef2ff; font-size: 12px; }
    .muted { color: #666; font-size: 12px; }
    .queue { padding: 12px; background: #fff8f0; border: 1px solid #fde6c7; border-radius: 6px; margin-bottom: 12px; }
    .queue ul { margin: 8px 0 0; padding-left: 18px; }
    .preview-frame { width: 100%; height: 70vh; border: 1px solid #e3e6ea; border-radius: 6px; background: #fff; }
    .preview-text { width: 100%; height: 70vh; overflow: auto; border: 1px solid #e3e6ea; border-radius: 6px; padding: 12px; background: #fff; white-space: pre-wrap; font-family: Georgia, serif; }
    .provenance-panel { margin-top: 12px; padding: 12px; background: #f8f9ff; border-radius: 6px; border: 1px solid #e0e4ff; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .actions button { margin-top: 0; }
    label { display: block; margin-top: 12px; font-size: 14px; }
    input, select, textarea { width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box; }
    button { margin-top: 12px; padding: 10px 14px; cursor: pointer; }
    .primary { background: #3730a3; color: #fff; border: none; border-radius: 6px; }
    .secondary { background: #fff; border: 1px solid #ccc; border-radius: 6px; }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1 style="margin:0;font-size:1.25rem">Knowledge Review</h1>
    <p id="meta" class="muted" style="margin:4px 0 0">Loading…</p>
  </header>
  <div class="layout">
    <div class="card">
      <h2>Resume Document</h2>
      <p class="muted" id="resume-meta">Original file for cross-check</p>
      <div id="resume-preview">Loading resume…</div>
    </div>
    <div>
      <div class="card">
        <h2>Review Priority</h2>
        <div id="review-queue" class="queue muted">Loading queue…</div>
        <table>
          <thead><tr><th>Field</th><th>Priority</th><th>Current</th><th>Status</th></tr></thead>
          <tbody id="diff"></tbody>
        </table>
        <div id="provenance-panel" class="provenance-panel" style="display:none"></div>
        <div class="actions" id="review-actions" style="display:none">
          <button type="button" class="secondary" data-action="accept">👍 Accept</button>
          <button type="button" class="secondary" data-action="verify">✅ Verify</button>
          <button type="button" class="secondary" data-action="reject">👎 Reject</button>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>✏ Edit Knowledge</h2>
        <form id="edit-form">
          <label>Field
            <select id="field" required>
              <option value="summary">Summary</option>
              <option value="skills">Skills</option>
              <option value="english">English</option>
              <option value="years_of_experience">Years of Experience</option>
            </select>
          </label>
          <label>New Value
            <textarea id="humanValue" rows="3" required></textarea>
          </label>
          <label>Reason (optional)
            <select id="reason">
              <option value="">—</option>
              ${reasons.map((r) => `<option value="${r}">${r}</option>`).join("")}
            </select>
          </label>
          <button type="submit" class="primary">Save Edit</button>
        </form>
      </div>
      <div class="card" style="margin-top:16px">
        <button id="mark-ready" class="primary">Mark Candidate Ready</button>
        <span id="ready-status"></span>
      </div>
    </div>
  </div>
  <script>
    const candidateId = ${JSON.stringify(candidateId)};
    let reviewStartedAt = Date.now();
    let reviewData = null;
    let selectedField = null;

    function renderResumePreview(resume) {
      const container = document.getElementById('resume-preview');
      const meta = document.getElementById('resume-meta');
      if (!resume) { container.textContent = 'Resume not available'; return; }
      meta.textContent = resume.filename + ' · ' + resume.viewerType.toUpperCase();
      if (resume.viewerType === 'plain_text') {
        fetch(resume.contentUrl).then(r => r.text()).then(text => {
          container.innerHTML = '<pre class="preview-text"></pre>';
          container.querySelector('pre').textContent = text;
        });
      } else {
        container.innerHTML = '<iframe class="preview-frame" src="' + resume.contentUrl + '"></iframe>';
      }
    }

    function renderReviewQueue(data) {
      const el = document.getElementById('review-queue');
      if (!data.reviewQueue.length) {
        el.innerHTML = '<strong>All priority fields reviewed.</strong> Completion ' + (data.reviewCompletionRate * 100).toFixed(0) + '%';
        return;
      }
      el.innerHTML = '<strong>Review these fields first:</strong><ul>' +
        data.reviewQueue.map(item => '<li>' + item.priorityLabel + ' · ' + item.label + ' (' + item.confidenceLabel + ')</li>').join('') +
        '</ul>';
    }

    function showProvenance(row) {
      selectedField = row.field;
      const panel = document.getElementById('provenance-panel');
      const actions = document.getElementById('review-actions');
      panel.style.display = 'block';
      actions.style.display = 'flex';
      panel.innerHTML =
        '<strong>' + row.label + '</strong> · ' + row.reviewPriorityLabel + '<br/>' +
        '<div style="margin-top:8px"><span class="muted">Source</span><br/>' + row.provenance.source + '</div>' +
        '<div style="margin-top:8px"><span class="muted">Confidence</span><br/>' + row.provenance.confidenceLabel + '</div>' +
        '<div style="margin-top:8px"><span class="muted">Current</span><br/>' + row.current + '</div>';
      document.querySelectorAll('#diff tr.clickable').forEach(tr => tr.classList.remove('selected'));
      const selected = document.querySelector('#diff tr[data-field="' + row.field + '"]');
      if (selected) selected.classList.add('selected');
      document.getElementById('field').value = row.field;
      document.getElementById('humanValue').value = row.current;
    }

    async function submitReview(action) {
      if (!selectedField) return;
      const body = {
        field: selectedField,
        action,
        reason: document.getElementById('reason').value || null,
        editDurationMs: Date.now() - reviewStartedAt,
      };
      if (action === 'edit') {
        body.humanValue = document.getElementById('humanValue').value;
      }
      const res = await fetch('/api/v1/candidates/' + candidateId + '/knowledge/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert('Review action failed'); return; }
      await load();
    }

    async function load() {
      const res = await fetch('/api/v1/candidates/' + candidateId + '/review');
      const data = await res.json();
      reviewData = data;
      document.getElementById('meta').textContent =
        data.name + ' · Completion ' + (data.reviewCompletionRate * 100).toFixed(0) + '% · Verification ' + (data.verificationRate * 100).toFixed(0) + '%';
      renderResumePreview(data.resume);
      renderReviewQueue(data);
      document.getElementById('diff').innerHTML = data.diff.map(row => {
        const current = row.edited ? '<span class="current">' + row.current + '</span>' : row.current;
        return '<tr class="clickable" data-field="' + row.field + '"><td>' + row.label + '</td><td>' + row.reviewPriorityLabel + '</td><td>' + current + '</td><td><span class="badge">' + row.status + '</span></td></tr>';
      }).join('');
      document.querySelectorAll('#diff tr.clickable').forEach(tr => {
        tr.addEventListener('click', () => {
          const row = data.diff.find(r => r.field === tr.dataset.field);
          if (row) showProvenance(row);
        });
      });
      document.getElementById('ready-status').textContent = data.ready ? 'Ready (TTQC ' + (data.ttqcMs/1000).toFixed(1) + 's)' : 'Not ready';
      document.getElementById('mark-ready').disabled = data.ready;
      reviewStartedAt = Date.now();
    }

    document.querySelectorAll('#review-actions button').forEach(btn => {
      btn.addEventListener('click', () => submitReview(btn.dataset.action));
    });

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      selectedField = document.getElementById('field').value;
      await submitReview('edit');
    });

    document.getElementById('mark-ready').addEventListener('click', async () => {
      const res = await fetch('/api/v1/candidates/' + candidateId + '/mark-ready', { method: 'POST' });
      if (!res.ok) { alert('Mark ready failed'); return; }
      await load();
    });

    load();
  </script>
</body>
</html>`;
}
