# 📬 User Feedback Center

一个轻量级的用户反馈系统，基于 **Google Forms + GitHub Issues + GitHub Pages** 构建。

## 架构

```
用户 ──→ Google Form ──→ Google Sheet ──→ Apps Script ──→ GitHub Issue ──→ GitHub Pages
  │                          │                                                   │
  │                    ┌─────┴─────┐                            ┌───────────────┘
  │                    │ 自动创建   │                            │ 公开看板
  ▼                    ▼           ▼                            ▼
提交反馈          数据落地      GitHub Issue              反馈列表 & 状态
```

## 快速部署

### 1. Google Form

1. 打开 [forms.google.com](https://forms.google.com)
2. 创建表单，建议字段：

   | 字段 | 类型 | 说明 |
   |------|------|------|
   | 反馈类型 | 单选题 | Bug / Feature / Other |
   | 一句话描述 | 短文本 | 必填 |
   | 详细描述 | 段落 |  |
   | 设备 | 单选题 | iPhone/Android/Web/Mac/Windows |
   | 严重程度 | 单选题 | Critical/Major/Minor/Suggestion |
   | 邮箱（可选） | 短文本 | 后续联系 |

3. 设置 → 将回复收集到 Google Sheet

### 2. Google Apps Script

1. 打开上述 Google Sheet → **扩展程序** → **Apps Script**
2. 复制 [`google-apps-script/Code.gs`](google-apps-script/Code.gs) 的内容粘贴进去
3. 修改开头的配置：
   ```js
   const GITHUB_TOKEN = '你的 GitHub Token';
   ```
4. 保存并部署
5. 设置触发器：`onFormSubmit` → 来自电子表格 → 提交表单时

> **获取 GitHub Token：** GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
> 权限选 `Issues: Read & Write`

### 3. GitHub Pages

这个仓库已经配置了 GitHub Pages，访问：

**https://dev-buddy2023.github.io/user-feedback/**

### 4. 配置 Google Form 链接

在 [`docs/index.html`](docs/index.html) 中找到这行并替换：
```html
window.__FORM_URL__ = 'https://forms.google.com/your-form-link';
```

## 工作流程

1. **用户提交** → Google Form
2. **自动创建** → GitHub Issue（带标签）
3. **自动打标** → GitHub Actions 根据标题关键词添加 severity / platform 标签
4. **每周统计** → GitHub Actions 生成统计报告
5. **公开看板** → GitHub Pages 实时展示所有反馈

## 目录结构

```
├── .github/
│   ├── ISSUE_TEMPLATE/       # Issue 模板
│   │   ├── 01-bug-report.yml
│   │   ├── 02-feature-request.yml
│   │   └── 03-other.yml
│   └── workflows/            # GitHub Actions
│       ├── auto-label.yml    # 自动标签
│       └── stats-report.yml  # 周统计
├── docs/                     # GitHub Pages
│   ├── index.html
│   └── app.js
├── google-apps-script/
│   └── Code.gs               # Google Apps Script 桥接代码
└── README.md
```
