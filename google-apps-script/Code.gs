/**
 * 🚀 Google Forms → GitHub Issues Bridge
 *
 * 工作原理：
 * 1. 用户在 Google Form 提交反馈
 * 2. 数据写入 Google Sheet
 * 3. 本脚本监听到新行 → 自动创建 GitHub Issue
 *
 * ====== 安装步骤 ======
 * 1. 创建 Google Form (tools.new → Google Forms)
 * 2. 将回复保存到 Google Sheet
 * 3. 打开 Sheet → 扩展程序 → Apps Script
 * 4. 粘贴本文件内容
 * 5. 替换下方的 REPO_OWNER / REPO_NAME / GITHUB_TOKEN
 * 6. 保存 → 部署 → 设置触发器:
 *    - 函数: onFormSubmit
 *    - 事件: 来自电子表格 → 提交表单时
 * 7. (可选) 设置每日触发器给已关闭的 issue 发满意度调查
 *
 * ====== 获取 Token ======
 * 在 GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
 * 创建 token，权限选 Issues: Read & Write
 */

// ⚡ 修改这里 ⚡
const REPO_OWNER = 'dev-buddy2023';
const REPO_NAME  = 'user-feedback';
const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN';

// Google Sheet 列号（从 0 开始）
// 根据你的 Form 实际字段调整
const COL_MAP = {
  timestamp:  0,   // 时间戳
  type:       1,   // 反馈类型 (Bug/Feature/Other)
  summary:    2,   // 标题/摘要
  detail:     3,   // 详细描述
  device:     4,   // 设备
  severity:   5,   // 严重程度
  email:      6,   // 邮箱（可选）
};

/**
 * 表单提交时触发 → 自动创建 GitHub Issue
 */
function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const data = sheet.getRange(row, 1, 1, 7).getValues()[0];

  const feedback = {
    timestamp: data[COL_MAP.timestamp],
    type:      data[COL_MAP.type] || 'Other',
    summary:   data[COL_MAP.summary] || '(无标题)',
    detail:    data[COL_MAP.detail] || '',
    device:    data[COL_MAP.device] || '',
    severity:  data[COL_MAP.severity] || '',
    email:     data[COL_MAP.email] || '',
  };

  const issue = buildIssue(feedback);
  const result = createGitHubIssue(issue);

  // 在 Sheet 备注列写入 Issue URL
  const noteCol = 8; // H列
  if (result && result.html_url) {
    sheet.getRange(row, noteCol).setValue(result.html_url);
  }
}

/**
 * 构建 GitHub Issue payload
 */
function buildIssue(f) {
  let title, body, labels;

  switch (f.type.toLowerCase()) {
    case 'bug':
      title = `[Bug] ${f.summary}`;
      labels = ['bug', 'from-form'];
      body = `## 🔍 问题描述\n${f.summary}\n\n---\n### 📝 详细描述\n${f.detail || '(无)'}\n\n`;
      if (f.device)   body += `### 📱 设备\n${f.device}\n\n`;
      if (f.severity) body += `### ⚠️ 严重程度\n${f.severity}\n\n`;
      break;

    case 'feature':
      title = `[Feature] ${f.summary}`;
      labels = ['enhancement', 'from-form'];
      body = `## 💡 功能建议\n${f.summary}\n\n---\n### 📝 详细描述\n${f.detail || '(无)'}\n\n`;
      if (f.device)   body += `### 📱 设备\n${f.device}\n\n`;
      if (f.severity) body += `### 🔥 优先级\n${f.severity}\n\n`;
      break;

    default:
      title = `[Feedback] ${f.summary}`;
      labels = ['other', 'from-form'];
      body = `## 📝 反馈\n${f.summary}\n\n---\n### 详细内容\n${f.detail || '(无)'}\n\n`;
  }

  body += `---\n*📅 提交时间: ${f.timestamp}*\n`;
  if (f.email) body += `*📧 用户邮箱: ${f.email}*\n`;
  body += `*🤖 来源: Google Forms*\n`;

  return { title, body, labels };
}

/**
 * 调用 GitHub API 创建 Issue
 */
function createGitHubIssue(issue) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Google-Forms-Bridge',
    },
    payload: JSON.stringify(issue),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (response.getResponseCode() === 201) {
    Logger.log(`✅ Issue created: ${result.html_url}`);
    return result;
  } else {
    Logger.log(`❌ Failed: ${response.getContentText()}`);
    return null;
  }
}

/**
 * 📊 生成周报：统计本周反馈
 * 手动运行或用定时触发器
 */
function generateWeeklyReport() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let bugs = 0, features = 0, others = 0;
  let latest = 0;

  data.forEach((row, i) => {
    if (i === 0) return; // header
    const ts = new Date(row[COL_MAP.timestamp]);
    if (ts >= weekAgo) {
      latest++;
      switch ((row[COL_MAP.type] || '').toLowerCase()) {
        case 'bug':     bugs++; break;
        case 'feature': features++; break;
        default:        others++;
      }
    }
  });

  const msg = `📊 *本周反馈周报*\n\n`
    + `📅 ${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}\n`
    + `├ 🐛 Bug: ${bugs}\n`
    + `├ 💡 功能建议: ${features}\n`
    + `├ 📝 其他: ${others}\n`
    + `└ 📦 总计: ${latest}\n\n`;

  Logger.log(msg);

  // 可选：发送到 Telegram / Email
  // 见下方 sendTelegram() 示例
  return msg;
}

/**
 * 可选：Telegram 通知（当有新反馈时）
 */
function sendTelegramNotification(message) {
  const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
  const CHAT_ID   = 'YOUR_CHAT_ID';
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const options = {
    method: 'post',
    payload: {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    },
  };
  UrlFetchApp.fetch(url, options);
}

/**
 * 简单测试：手动运行检查配置
 */
function testConnection() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
  const options = {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'Google-Forms-Bridge-Test',
    },
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());
  Logger.log(response.getResponseCode() === 200
    ? `✅ 连接成功！仓库: ${result.full_name}`
    : `❌ 连接失败: ${response.getContentText()}`);
}
