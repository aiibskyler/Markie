# Markie - Markdown to Beautiful Image Tool

## Overview
A React + TypeScript SPA that converts Markdown into beautifully styled poster images for social media sharing. Inspired by [Madopic](https://github.com/xiaolinbaba/Madopic) with enhanced beautification features.

## Tech Stack
- **Vite + React 18 + TypeScript** — Build framework
- **marked.js** — Markdown parsing
- **KaTeX + mhchem** — Math/chemistry formula rendering
- **Mermaid.js** — Flowcharts, sequence diagrams, Gantt charts
- **ECharts** — Data visualizations
- **html2canvas + jsPDF** — PNG/PDF export
- **CSS Modules** — Style isolation
- **Zustand** — Lightweight state management

## Project Structure
```
src/
├── components/
│   ├── Editor/          # Markdown editor
│   ├── Preview/         # Real-time preview canvas
│   ├── Toolbar/         # Top toolbar
│   ├── ThemePanel/      # Theme selection panel
│   ├── StylePanel/      # Element style customization panel
│   ├── DecorPanel/      # Decoration elements panel
│   └── ExportDialog/    # Export dialog
├── themes/              # Preset theme definitions
├── fonts/               # Font resource management
├── stores/              # Zustand state
├── utils/               # Export/render utilities
└── types/               # TypeScript types
```

## Font System
- Built-in 4 Chinese fonts (self-hosted): Noto Serif SC, LXGW WenKai, Noto Sans SC, LXGW Neo XiHei
- User custom font upload (.ttf/.otf/.woff2) via FontFace API
- Granular font control: global / per-element (heading, body, code) / CJK vs Latin split
- Subset loading for performance (400/700 weights only)

## Theme Template System
8-10 presets: Minimal White, Dark Night, Gradient Blue, Warm Orange, Academic, Xiaohongshu, Forest Green, Lavender.
Each theme defines: background, text colors, card style, code block style, accent color, recommended font.

## Element Style Customization
Per-element style controls: headings (H1-H6), body text, blockquotes, code blocks, lists, dividers, images.
Controls: font size, weight, color, alignment, spacing, border radius, shadows.

## Decoration Elements
- Text/image watermarks (customizable opacity, angle, spacing)
- Logo placement (corners, size)
- QR code generation from URL
- Page numbering
- Decorative border frames

## Export Modes
- Free mode (custom dimensions)
- Xiaohongshu (3:4 ratio)
- WeChat Moments (long vertical)
- A4 landscape/portrait
- Formats: PNG, PDF, HTML

## Deployment
GitHub Pages via `vite.config.ts` base path configuration.
