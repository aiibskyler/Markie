import type { FontOption } from '../types';

export const builtinFonts: FontOption[] = [
  {
    id: 'noto-sans-sc',
    name: '思源黑体',
    family: 'Noto Sans SC',
    source: 'builtin',
    weights: [400, 700],
  },
  {
    id: 'noto-serif-sc',
    name: '思源宋体',
    family: 'Noto Serif SC',
    source: 'builtin',
    weights: [400, 700],
  },
  {
    id: 'lxgw-wenkai',
    name: '霞鹜文楷',
    family: 'LXGW WenKai',
    source: 'builtin',
    weights: [400],
  },
  {
    id: 'lxgw-neo-xihei',
    name: '霞鹜新晰黑',
    family: 'LXGW Neo XiHei',
    source: 'builtin',
    weights: [400],
  },
];

export const codeFonts: FontOption[] = [
  {
    id: 'consolas',
    name: 'Consolas',
    family: 'Consolas, Monaco, monospace',
    source: 'builtin',
    weights: [400],
  },
  {
    id: 'source-code-pro',
    name: 'Source Code Pro',
    family: 'Source Code Pro, monospace',
    source: 'builtin',
    weights: [400],
  },
];
