const REPO_OWNER = 'dev-buddy2023';
const REPO_NAME  = 'user-feedback';

const state = {
  issues: [],
  filter: 'all',    // all | open | closed | bug | feature
  loading: true,
  error: null,
};

async function init() {
  const app = document.getElementById('app');
  renderSkeleton(app);
  await loadIssues();
  render(app);
}

async function loadIssues() {
  try {
    state.loading = true;
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=100&sort=created&direction=desc`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
    /** @type {import('github-api-sdk').Issue[]} */
    let issues = await res.json();
    // PRs also appear as issues — filter them out
    state.issues = issues.filter(i => !i.pull_request);
    state.loading = false;
  } catch (err) {
    state.error = err.message;
    state.loading = false;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function countByLabel(issues, label) {
  return issues.filter(i => i.labels.some(l => l.name === label)).length;
}

function renderSkeleton(/** @type {HTMLElement} */ el) {
  el.innerHTML = `<div class="loading">正在加载反馈数据…</div>`;
}

function render(/** @type {HTMLElement} */ el) {
  if (state.loading) { renderSkeleton(el); return; }
  if (state.error) {
    el.innerHTML = `<div class="error">⚠️ 加载失败: ${state.error}</div>`;
    return;
  }

  const filtered = getFilteredIssues();
  const total    = state.issues.length;
  const open     = state.issues.filter(i => i.state === 'open').length;
  const closed   = total - open;
  const bugs     = countByLabel(state.issues, 'bug');
  const features = countByLabel(state.issues, 'enhancement');

  el.innerHTML = `
    <div class="container">
      <!-- Header -->
      <header>
        <h1>📬 用户反馈中心</h1>
        <p class="subtitle">直接提交 · 公开透明 · 持续改进</p>
      </header>

      <!-- Stats -->
      <div class="stats">
        <div class="stat-card" data-stat="all" onclick="setFilter('all')">
          <span class="stat-num">${total}</span>
          <span class="stat-label">全部反馈</span>
        </div>
        <div class="stat-card open" data-stat="open" onclick="setFilter('open')">
          <span class="stat-num">${open}</span>
          <span class="stat-label">待处理</span>
        </div>
        <div class="stat-card closed" data-stat="closed" onclick="setFilter('closed')">
          <span class="stat-num">${closed}</span>
          <span class="stat-label">已处理</span>
        </div>
        <div class="stat-card bug" data-stat="bug" onclick="setFilter('bug')">
          <span class="stat-num">${bugs}</span>
          <span class="stat-label">Bug</span>
        </div>
        <div class="stat-card feature" data-stat="feature" onclick="setFilter('feature')">
          <span class="stat-num">${features}</span>
          <span class="stat-label">功能建议</span>
        </div>
      </div>

      <!-- CTA -->
      <div class="cta">
        <a href="${FORM_URL}" target="_blank" class="btn btn-primary">
          ✍️ 提交反馈
        </a>
        <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}/issues" target="_blank" class="btn btn-secondary">
          📋 查看全部 Issue
        </a>
      </div>

      <!-- Filter Tabs -->
      <div class="tabs">
        ${['all','open','closed','bug','feature'].map(f =>
          `<button class="tab ${state.filter === f ? 'active' : ''}" onclick="setFilter('${f}')">
            ${filterLabel(f)} (${f === 'all' ? total : f === 'open' ? open : f === 'closed' ? closed : f === 'bug' ? bugs : features})
          </button>`
        ).join('')}
      </div>

      <!-- Issues List -->
      <div class="issues">
        ${filtered.length === 0
          ? '<div class="empty">🎉 没有符合条件的反馈</div>'
          : filtered.map(renderIssue).join('')}
      </div>

      <!-- Footer -->
      <footer>
        <p>Powered by <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}" target="_blank">GitHub Issues</a>
           · 数据自动来自 Google Forms</p>
      </footer>
    </div>
  `;
}

const FILTER_LABELS = { all: '全部', open: '待处理', closed: '已处理', bug: '🐛 Bug', feature: '💡 建议' };
function filterLabel(f) { return FILTER_LABELS[f] || f; }

function getFilteredIssues() {
  let list = [...state.issues];
  const f = state.filter;
  if (f === 'open')   list = list.filter(i => i.state === 'open');
  if (f === 'closed') list = list.filter(i => i.state === 'closed');
  if (f === 'bug')    list = list.filter(i => i.labels.some(l => l.name === 'bug'));
  if (f === 'feature') list = list.filter(i => i.labels.some(l => l.name === 'enhancement'));
  return list;
}

/** @param {import('github-api-sdk').Issue} issue */
function renderIssue(issue) {
  const labels = issue.labels.map(l =>
    `<span class="label" style="--label-color: #${l.color}">${l.name}</span>`
  ).join('');
  const isOpen = issue.state === 'open';

  return `
    <div class="issue-card">
      <div class="issue-left">
        <span class="issue-state ${isOpen ? 'open' : 'closed'}">${isOpen ? '🟢' : '✅'}</span>
      </div>
      <div class="issue-body">
        <a href="${issue.html_url}" target="_blank" class="issue-title">${issue.title}</a>
        <div class="issue-meta">
          <span>#${issue.number}</span>
          <span>·</span>
          <span>${formatDate(issue.created_at)}</span>
          ${issue.comments > 0 ? `<span>· 💬 ${issue.comments}</span>` : ''}
        </div>
        <div class="issue-labels">${labels}</div>
      </div>
    </div>
  `;
}

/** @param {string} f */
function setFilter(f) {
  state.filter = f;
  render(document.getElementById('app'));
}

// Make function accessible from HTML onclick
window.setFilter = setFilter;

// The Form URL will be injected at build time
const FORM_URL = window.__FORM_URL__ || 'https://forms.google.com/your-form-link';

document.addEventListener('DOMContentLoaded', init);
