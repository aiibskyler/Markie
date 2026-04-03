# Markie

[中文](#中文说明) | [English](#english)

Markie 是一个面向内容创作者的 Markdown 海报生成工具。你可以把 Markdown 文本快速转换成适合分享的图片、PDF 或 HTML 页面，并对主题、字体、排版、装饰元素和导出尺寸做细致调整。

Markie is a Markdown-to-poster generator for creators. It turns Markdown into polished shareable images, PDFs, or HTML pages, with flexible control over themes, typography, layout, decorations, and export sizes.

## 中文说明

### 项目简介

Markie 基于 React + TypeScript + Vite 构建，提供实时编辑和实时预览能力，适合把笔记、文章摘录、社媒文案、教程内容快速整理成更适合传播的视觉化成品。

### 功能特性

- Markdown 实时编辑与实时预览
- 内置多套主题，可一键切换
- 支持中英双语界面切换
- 支持全局字体、标题字体、代码字体设置
- 支持正文字号、行高、缩进、段落间距等排版控制
- 支持引用、代码块、列表、分割线、图片等元素样式调整
- 支持水印、LOGO、二维码、边框等装饰元素
- 支持自由尺寸、小红书、朋友圈、A4 竖版、A4 横版模式
- A4 模式支持分页预览与多页导出
- 支持导出 PNG、PDF、HTML
- 支持部署到 GitHub Pages

### 技术栈

- React 19
- TypeScript
- Vite
- Zustand
- marked
- KaTeX
- html2canvas
- modern-screenshot
- jsPDF

### 快速开始

#### 1. 安装依赖

```bash
npm install
```

#### 2. 启动开发环境

```bash
npm run dev
```

#### 3. 构建生产版本

```bash
npm run build
```

#### 4. 本地预览生产包

```bash
npm run preview
```

### 使用说明

1. 在左侧编辑器输入或粘贴 Markdown 内容。
2. 在顶部导航中切换尺寸、主题、样式和装饰配置。
3. 在右侧预览区查看实时效果。
4. 在导出面板中选择 PNG、PDF 或 HTML 输出格式。

### 导出说明

- `PNG`
  - 普通模式下导出单张图片
  - A4 分页模式下会按页分别下载多个 PNG 文件
- `PDF`
  - A4 模式下按页生成多页 PDF
- `HTML`
  - 导出完整页面，可在浏览器中打开和滚动查看

### GitHub Pages 部署

项目已包含 GitHub Pages 的 Actions 工作流文件：

- `.github/workflows/deploy-pages.yml`

使用方式：

1. 把仓库推送到 GitHub。
2. 在仓库 `Settings > Pages` 中将 `Source` 设为 `GitHub Actions`。
3. 推送到 `main` 分支后会自动构建并部署。

当前 `vite.config.ts` 中的 `base` 配置为：

```ts
base: '/Markie/'
```

如果你的仓库名不是 `Markie`，请同步修改这个值。

### 项目结构

```text
src/
├── components/
│   ├── Editor/
│   ├── Preview/
│   ├── Toolbar/
│   ├── SizePanel/
│   ├── StylePanel/
│   ├── DecorPanel/
│   └── ExportDialog/
├── fonts/
├── i18n/
├── stores/
├── themes/
├── types/
└── utils/
```

### 仓库地址

- GitHub: https://github.com/aiibskyler/Markie

### 已知说明

- 超长的单个 Markdown 块元素在 A4 分页下目前不会做更细粒度拆分。
- 构建时会看到 Vite 关于 chunk size 的提示，但当前不影响正常使用与部署。

---

## English

### Overview

Markie is built with React + TypeScript + Vite. It provides live editing and live preview, making it easy to turn notes, article snippets, social posts, and tutorial content into polished visual assets.

### Features

- Live Markdown editing and preview
- Multiple built-in visual themes
- Bilingual UI in Chinese and English
- Configurable global, heading, and code fonts
- Fine-grained typography controls for body size, line height, indent, and spacing
- Style customization for headings, quotes, code blocks, lists, dividers, and images
- Decorative elements including watermark, logo, QR code, and border frame
- Export presets for free size, Xiaohongshu, WeChat Moments, A4 portrait, and A4 landscape
- Paginated preview and multi-page export for A4 modes
- Export to PNG, PDF, and HTML
- Ready for GitHub Pages deployment

### Tech Stack

- React 19
- TypeScript
- Vite
- Zustand
- marked
- KaTeX
- html2canvas
- modern-screenshot
- jsPDF

### Getting Started

#### 1. Install dependencies

```bash
npm install
```

#### 2. Start the dev server

```bash
npm run dev
```

#### 3. Build for production

```bash
npm run build
```

#### 4. Preview the production build

```bash
npm run preview
```

### How To Use

1. Write or paste Markdown into the editor.
2. Adjust size, theme, style, and decoration settings from the top navigation.
3. Review the result in the live preview panel.
4. Export as PNG, PDF, or HTML from the export panel.

### Export Notes

- `PNG`
  - Exports a single image in normal modes
  - Downloads multiple files page by page in A4 paginated modes
- `PDF`
  - Generates a multi-page PDF in A4 modes
- `HTML`
  - Exports a complete standalone page that can be opened and scrolled in a browser

### GitHub Pages Deployment

This project already includes a GitHub Pages workflow:

- `.github/workflows/deploy-pages.yml`

To deploy:

1. Push the repository to GitHub.
2. In `Settings > Pages`, choose `GitHub Actions` as the source.
3. Push to the `main` branch to trigger build and deployment.

The current `vite.config.ts` uses:

```ts
base: '/Markie/'
```

If your repository name is not `Markie`, update this value accordingly.

### Project Structure

```text
src/
├── components/
│   ├── Editor/
│   ├── Preview/
│   ├── Toolbar/
│   ├── SizePanel/
│   ├── StylePanel/
│   ├── DecorPanel/
│   └── ExportDialog/
├── fonts/
├── i18n/
├── stores/
├── themes/
├── types/
└── utils/
```

### Repository

- GitHub: https://github.com/aiibskyler/Markie

### Notes

- Very large single Markdown blocks are not yet split further inside A4 pagination.
- Vite may show a chunk size warning during build, but it does not block normal usage or deployment.
