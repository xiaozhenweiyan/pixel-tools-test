# Pixel Tools

> A retro pixel-style pure frontend tool collection website, covering five categories: Learning, Art, Sandbox, Tools, and Entertainment. All features run 100% in the browser — no backend, no login, no network required (network is only needed for the first load; after PWA installation, it works offline).

<p align="center">
  <strong>Retro Deep-Space Pixel Theme · Bilingual (CN/EN) · PWA Offline · Responsive Design · Mouse Drag Particle Effects</strong>
</p>

# 像素风格工具网站 · Pixel Tools

> 一个复古像素风格的纯前端工具集合网站，覆盖学习、艺术、沙盒、工具、娱乐五大类别，所有功能 100% 在浏览器中运行，无需后端、无需登录、无需联网（仅首次加载需要网络，PWA 安装后可离线使用）。

<p align="center">
  <strong>复古深空像素风 · 中英文双语 · PWA 离线可用 · 响应式设计 · 鼠标拖拽粒子特效</strong>
</p>

---

## Table of Contents

- [Online Access](#online-access)
- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Tool Directory](#tool-directory)
  - [Learning](#learning)
    - [Pixel AI](#像素-ai-pixel-ai)
  - [Art](#art)
  - [Sandbox](#sandbox)
  - [Tools](#tools)
  - [Entertainment](#entertainment)
- [Prediction System (40 Methods)](#prediction-system-40-methods)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [File Manifest](#file-manifest)
- [Local Development](#local-development)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [PWA & Service Worker Strategy](#pwa--service-worker-strategy)
- [Internationalization (i18n)](#internationalization-i18n)
- [Tutorial System](#tutorial-system)
- [Function System Parameter Dialog](#function-system-parameter-dialog)
- [Homepage Interaction](#homepage-interaction)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Mouse Drag Particle Effects](#mouse-drag-particle-effects)
- [MCP Server](#mcp-server)
- [WebAssembly Acceleration](#webassembly-acceleration)
- [Browser Compatibility](#browser-compatibility)
- [Performance & Accessibility](#performance--accessibility)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## 目录

- [在线访问](#在线访问)
- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [工具目录](#工具目录)
  - [学习类 LEARNING](#学习类-learning)
    - [像素AI](#像素-ai-pixel-ai)
  - [艺术类 ART](#艺术类-art)
  - [沙盒类 SANDBOX](#沙盒类-sandbox)
  - [工具类 TOOLS](#工具类-tools)
  - [娱乐类 ENTERTAINMENT](#娱乐类-entertainment)
- [预测系统 40 种方法](#预测系统-40-种方法)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [文件清单](#文件清单)
- [本地开发](#本地开发)
- [部署到 GitHub Pages](#部署到-github-pages)
- [PWA 与 Service Worker 策略](#pwa-与-service-worker-策略)
- [国际化（i18n）](#国际化i18n)
- [教程系统](#教程系统)
- [函数系统参数弹窗](#函数系统参数弹窗)
- [首页交互](#首页交互)
- [键盘快捷键](#键盘快捷键)
- [鼠标拖拽粒子特效](#鼠标拖拽粒子特效)
- [MCP Server](#mcp-server)
- [WebAssembly 加速](#webassembly-加速)
- [浏览器兼容性](#浏览器兼容性)
- [性能与无障碍](#性能与无障碍)
- [更新日志](#更新日志)
- [贡献](#贡献)
- [常见问题 FAQ](#常见问题-faq)
- [License](#license)
- [致谢](#致谢)

---

## Online Access

- Online Demo: <https://xiaozhenweiyan.github.io/pixel-tools/>
- GitHub Repository: <https://github.com/xiaozhenweiyan/pixel-tools>

> Recommended browsers: latest Chrome / Edge / Firefox / Safari. After the first load, click the "Install" button in the browser address bar to add the site as a PWA to your desktop, after which it can be used offline.

---

## Project Overview

Pixel Tools is a pure frontend tool collection website with a Retro Deep-Space Pixel Theme visual design. All tools are implemented with vanilla JavaScript + Canvas API, without relying on any frontend framework (React / Vue / Angular, etc.). Only the pixel art generator borrows [p5.js](https://p5js.org/) as a drawing helper library.

The website includes 20+ standalone tools, distributed across 5 top-level categories:

- **Learning**: Math predictor, function plotter, calculator, pixel programming (maze + neural network visualizer), 7 math learning cards
- **Art**: Pixel art generator (8 art modes), pixel drawing editor (multi-layer + palette), pixel music synthesizer (8-bit chip music)
- **Sandbox**: Physics simulator (Falling Sand style), AI image pixelizer
- **Tools**: Pixel clock (clock + calendar + pomodoro timer)
- **Entertainment**: Pixel RPG mini-game (turn-based combat)

The entire project has zero backend dependencies. All data is stored in the browser's `localStorage` / `IndexedDB`. User information (nickname, avatar, background) is persisted in `localStorage` with a `pixel_user_session` cookie (max-age one year) as a registered marker, which remains after closing the browser, so there's no need to re-register on the next visit; logging out clears both `localStorage` and the cookie. Other data is destroyed when the browser is closed (unless the user actively keeps it). All image processing (pixelization, drawing export) is done entirely on the client side; images are never uploaded to any server.

---

## Core Features

- **Retro Deep-Space Pixel UI**: Unified color palette (deep space blue `#1a1a2e`, panel purple `#2d2d44`, gold accent `#ffd700`), pixel borders (`3px solid`), hard shadows (`4px 4px 0`), monospace font (Courier New). All buttons, inputs, panels, and dialogs follow the same set of design tokens (CSS Variables), presenting the retro aesthetic of 8-bit / 16-bit era computer interfaces.
- **Bilingual Support (i18n)**: A complete i18n system supporting `auto` / `zh` / `en` modes. `auto` follows the system language, and switching takes effect immediately without refreshing (some pages may prompt for a refresh). All visible text (buttons, prompts, tutorials, error messages) have bilingual mappings. Adding a new language only requires extending the translation table in `js/i18n.js`.
- **PWA Offline + Installable**: All static assets are cached via Service Worker, enabling fully offline use after installation to desktop. `manifest.json` provides app icon, name, and theme color. After installation, there's no browser address bar, delivering an experience close to a native app.
- **Responsive Design**: Desktop dual-column layout, mobile single-column adaptive, touch-friendly button sizes and spacing. All tools work properly across phone, tablet, and desktop sizes.
- **Homepage Category Collapsing**: 5 top-level categories can be independently collapsed/expanded, with state saved to `localStorage` and auto-restored on next visit.
- **Homepage "Recent" Quick Access**: Automatically records the 3 most recently visited tools. Auto-hides when there are no records. Supports one-click clearing.
- **ESC Key Navigation**: Press ESC on any sub-page to go back to the previous level. Press repeatedly to return to the homepage step by step. When an input is focused, ESC prioritizes blurring the input. Page scroll position is saved when switching pages and auto-restored when returning (including ESC returns), instead of jumping to the top.
- **Mouse Drag Particle Effects**: Dragging the mouse on the page leaves a pixel-style particle trail, at the topmost layer (`z-index: 99999`) but without blocking interaction (`pointer-events: none`). Particles have gravity, decay, and fade-out effects. Touch events on mobile also trigger this.
- **Per-page Tutorials**: Each tool page has a "Tutorial" button that opens a page-specific usage guide, including basic operations, parameter descriptions, tips, etc. The homepage tutorial button is at the top-right of the viewport; other pages' tutorial buttons are at the bottom center of the viewport.
- **Function System Parameter Animation**: The function system supports parameters `a, b, c, d...`. After adding a function, parameter sliders automatically appear. You can set min value, max value, and step. Click "Play Animation" to make parameters cycle automatically in a sine wave pattern, making it easy to observe the overall behavior of a function family.
- **Adaptive Coordinate Unit Length**: The coordinate systems of the predictor and function system use a 1-2-5 nice unit tick strategy, automatically selecting the nearest standard unit length (1, 0.5, 0.2, 0.1, 2, 5, 10...) based on the zoom level, displayed at the bottom-left of the axes, auto-adjusting on zoom, always maintaining 5-10 major ticks.
- **Pure Frontend (Zero Backend / Zero Login / Zero Data Collection)**: All computation, storage, and rendering happen in the browser. Data never leaves the device. No user system, no login/registration, no server logs, no telemetry. Closing the browser destroys data (unless the user actively keeps it).
- **WebAssembly Acceleration** (experimental, fixed): The reaction-diffusion mode can optionally enable Wasm acceleration, using an inline JS optimized kernel approach with no external wasm file dependency, delivering 3-5x performance improvement over the pure JS version.
- **MCP Server Integration**: Includes an MCP (Model Context Protocol) server (`mcp-server/server.py`) that wraps the calculator and predictor as MCP tools, available for direct invocation by MCP clients like TRAE, Claude Desktop, Cursor, etc., letting AI assistants directly use this site's capabilities.
- **Pixel-style Custom Dialogs**: All prompts, confirmations, and parameter inputs use custom `.pixel-dialog` pixel-style dialogs with deep space blue + gold border + Courier New + hard shadows, replacing the browser's native `prompt()` / `alert()` for a unified visual style.
- **Zero-framework Vanilla JS**: Apart from p5.js (used only by the pixel art generator), there are no third-party frontend frameworks. All JS uses ES5-compatible syntax + IIFE pattern, loading fast, easy to debug, and directly callable in DevTools Console via global functions.
- **Rich Content**: Built-in 8 pixel art modes, 7 math learning cards, 40 sequence prediction methods, 5 function fitting demos (funcfit / overfit / offsetfit + neural network + regression), dungeon-style pixel RPG, 4 maze algorithms, 8-bit music synthesizer, 20+ tools.

---

## Tool Directory

### Learning

#### PIXEL MATH

Entry point for the math tool collection, containing three core tools:

- **Prediction System PIXEL PREDICTOR**: Input a number sequence, use 40 mathematical methods + neural network to predict the next value. Supports weight fusion, long-term training, backtest validation, JSON/CSV export.
- **Function System PIXEL FUNCTION**: Plot 2D/3D function graphs. Supports parameter sliders, animation playback, mouse drag panning, scroll wheel zoom, automatic unit length adjustment.
- **Calculator System PIXEL CALCULATOR**: Pixel-style calculator supporting arithmetic, expression evaluation, trigonometric functions, logarithms, exponentiation, parentheses, constants (pi, e), DEG/RAD toggle, operation step display, history.

#### PIXEL PROGRAMMING

Algorithm visualization tool collection:

- **Pixel Maze PIXEL MAZE**: Generates mazes using 4 algorithms (Recursive Backtracker, Prim, Kruskal, Eller). Supports BFS shortest path solving animation, adjustable rows/columns and wall thickness, exportable as pixel image.
- **Neural Network Visualizer NN VISUALIZER**: Visualizes neural network training process, real-time display of forward/backward propagation, weight changes, loss curves, decision boundaries. Supports XOR, sine fitting, classification and other datasets.

#### LEARNING SYSTEM

Math learning card collection, helping understand math concepts through animation and interaction:

- **Arithmetic ARITHMETIC**: Basic addition, subtraction, multiplication, division, with block array animation demonstrating the operation process.
- **Mixed Arithmetic MIXED ARITHMETIC**: Four-operation mixed arithmetic with parentheses, demonstrating operation priority.
- **Fraction FRACTION**: Fraction addition/subtraction/multiplication/division, reduction, common denominator animation.
- **Decimal DECIMAL**: Decimal operations, conversion to/from fractions animation.
- **Equation EQUATION**: Linear/quadratic equations in one variable, balance scale animation solving.
- **Geometry GEOMETRY**: Area/perimeter/volume formulas, interactive shapes.
- **Speed Challenge SPEED CHALLENGE**: 60-second timed quiz, local leaderboard.

#### 像素 AI PIXEL AI

AI chat tool supporting major large language models.

- **Multi-provider support**: 9 providers + custom OpenAI-compatible endpoint
  - OpenAI (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo)
  - Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)
  - Google Gemini (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.0 Pro)
  - Qwen / 通义千问 (Qwen Max, Qwen Plus, Qwen Turbo, Qwen Long)
  - ERNIE / 文心一言 (ERNIE 4.0, ERNIE 3.5, ERNIE Lite)
  - DeepSeek (DeepSeek Chat, DeepSeek Coder)
  - Mistral (Mistral Large, Mistral Medium, Mistral Small)
  - Groq (Llama 3.3 70B, Mixtral 8x7B, Gemma 7B)
  - Custom: OpenAI-compatible API endpoints
- **Local API Key storage**: API keys stored only in browser localStorage, never uploaded to any server
- **Token usage tracking**: per-message input/output/total tokens + session total
- **Chat history**: messages retained within session
- **Bilingual UI**: full Chinese/English interface
- **Clear chat**: one-click clear all messages

### Art

#### PIXEL DRAWING

- **Pixel Art Generator PIXEL ART**: Generates pixel art based on seeded random algorithms, with 8 art modes (Flow Field, Particles, Mosaic, Spiral, Fractal Tree, Voronoi tessellation, Wave interference, Reaction-Diffusion). Adjustable resolution, density, hue, recursion depth and other parameters. Supports animation playback and PNG export. Same seed + same parameters = same image, convenient for reproduction.
- **Pixel Drawing Editor PIXEL DRAWING EDITOR**: Pixel-by-pixel hand-drawing creation. Supports brush, eraser, fill, eyedropper, line, rectangle, circle and other tools, multi-layer operations, NES / GameBoy / CGA retro palettes + custom colors. Adjustable canvas size, PNG export. Canvas CSS display size increased from max-width 512px to 768px, logical pixel options (16 / 32 / 64 / 128) unchanged, for a clearer creative experience.

#### PIXEL MUSIC

- **Pixel Music Synthesizer PIXEL MUSIC SYNTH**: 8-bit chip music creation tool, multi-track sequence editor (melody, bass, drums), square wave / triangle wave / sawtooth wave / noise and other timbres, adjustable BPM, piano keyboard input, oscilloscope visualization, WAV export.

### Sandbox

- **Physics Simulator PHYSICS SANDBOX**: Pixel-style 2D physics sandbox, similar to Falling Sand Game. Simplified to 3 substances (EMPTY eraser / WATER / HYDROGEN), with water's falling + lateral flow physics fully preserved. Added hydrogen: floats upward (opposite to gravity), can rise through water, invisible by default. Added "Gas" button: click to toggle hydrogen visibility (when visible, appears as semi-transparent light blue). Adjustable brush size, play/pause control.
- **AI Image Pixelizer IMAGE PIXELIZER**: Upload any image and automatically convert it to pixel style. Adjustable pixel block size, palette (NES / GameBoy / CGA / custom), color count, real-time preview, download pixelized image. All processing is done purely on the frontend; images are not uploaded to any server.

### Tools

- **Pixel Clock PIXEL CLOCK**: Retro pixel-style clock, calendar, and pomodoro timer tool.
  - Digital clock: Real-time display of current time, multiple pixel font styles.
  - Calendar: Monthly view, click dates to add event markers.
  - Pomodoro timer: 25-minute work + 5-minute break cycle to improve focus.

### Entertainment

- **Pixel RPG PIXEL RPG**: Pixel RPG dungeon maze adventure — a masked figure in black explores dungeons, with turn-based combat, wall torches lighting the way, slimes as the main enemies, and a downward corridor leading to the next floor.
  - Arrow keys / WASD to control character movement in the dungeon, or click/touch any movable cell on the map for auto-navigation.
  - Click map for auto-navigation (BFS pathfinding): Click/touch any movable cell on the map, and the player automatically moves cell by cell along the BFS shortest path. Supports mobile touch and desktop mouse. Click a monster to pathfind to an adjacent cell and auto-attack; if a monster blocks the path, the player stops to let you decide.
  - **Wiki Encyclopedia**: Click to view game documentation (HP/EXP/ATK/DEF meanings, operation guide, item catalog, monster mechanics).
  - **Floor System**: The dungeon is counted by floors; entering the exit goes to the next floor.
  - **7-slot Equipment System**: Left hand, right hand, head, body, legs, feet, accessory — 7 equipment slots in total.
  - **8 Items**: Wooden sword, Recovery Potion I, Leather helmet, Leather armor, Leather leggings, Leather boots, Experience Gem I, Attack Ring. Each item has a unique pixel art icon (canvas-drawn).
  - **Inventory Interaction**: Click an item cell to select and view details (attributes/description). Consumables can be used, equipment can be equipped/unequipped. Click two cells to swap items. Click outside to deselect.
  - Torches on corridor walls illuminate the field of view, creating a dim dungeon atmosphere.
  - Encountering enemies like slimes triggers turn-based combat, where you can choose attack, skill, item, and other commands.
  - Defeating enemies grants experience points; leveling up improves attributes. Chests drop random items.
  - 8-bit sound effects.

---

## Prediction System (40 Methods)

The prediction system (PIXEL PREDICTOR) has 40 built-in mathematical prediction methods, fused by weight to produce the final prediction result. All methods are computed on the client side with no backend calls.

| # | ID | Method | Description |
|---|----|--------|-------------|
| 1 | `naive` | Naive | Uses the last value as the prediction |
| 2 | `seasonal_naive` | Seasonal Naive | Uses the value from the previous cycle |
| 3 | `drift` | Drift | Adds average change trend to the naive method |
| 4 | `mean` | Mean | Average of all sequence values |
| 5 | `median` | Median | Median of all sequence values |
| 6 | `sma` | Simple Moving Average (SMA) | Simple moving average |
| 7 | `wma` | Weighted Moving Average (WMA) | Weighted moving average (higher weight for recent values) |
| 8 | `ses` | Simple Exponential Smoothing (SES) | Simple exponential smoothing |
| 9 | `holt` | Holt Linear | Holt's linear trend method |
| 10 | `holt_winters` | Holt-Winters | Holt-Winters seasonal trend method |
| 11 | `linear` | Linear Regression | Least squares linear regression |
| 12 | `poly2` | Polynomial Regression Poly2 | Quadratic polynomial fitting |
| 13 | `poly3` | Polynomial Regression Poly3 | Cubic polynomial fitting |
| 14 | `ar1` | Autoregression AR(1) | First-order autoregression |
| 15 | `ar2` | Autoregression AR(2) | Second-order autoregression |
| 16 | `geometric` | Geometric Growth | Geometric series growth |
| 17 | `diff1` | First-order Diff Extrapolation Diff1 | First-order difference extrapolation |
| 18 | `diff2` | Second-order Diff Extrapolation Diff2 | Second-order difference extrapolation |
| 19 | `fibonacci` | Fibonacci Golden Ratio | Fibonacci golden ratio |
| 20 | `fourier` | Fourier Extrapolation | Fourier series extrapolation |
| 21 | `seasonal_naive3` | Seasonal Naive(3) | Seasonal naive with period 3 |
| 22 | `exp_smooth_03` | SES-0.3 | Exponential smoothing with α=0.3 |
| 23 | `exp_smooth_07` | SES-0.7 | Exponential smoothing with α=0.7 |
| 24 | `sma5` | SMA-5 | 5-point simple moving average |
| 25 | `poly4` | Polynomial Regression Poly4 | Quartic polynomial fitting |
| 26 | `ar3` | Autoregression AR(3) | Third-order autoregression |
| 27 | `harmonic_mean` | Harmonic Mean | Harmonic mean |
| 28 | `cagr` | CAGR | Compound annual growth rate |
| 29 | `log_linear` | Log-Linear Regression | Linear regression after log transform |
| 30 | `weighted_last` | Weighted-Last | Last-weighted average |
| 31 | `diff_extrap` | Diff Extrap | Difference extrapolation |
| 32 | `weighted_median` | Weighted Median | Weighted median |
| 33 | `recursive_avg` | Recursive Avg | Recursive average |
| 34 | `sign_preserving` | Sign-Preserving | Sign-preserving prediction |
| 35 | `second_order` | Second Order | Second-order trend extrapolation |
| 36 | `moving_median` | Moving Median | Moving median |
| 37 | `triple_smooth` | Triple Smooth | Triple smoothing |
| 38 | `symmetric_proj` | Symmetric Proj | Symmetric projection |
| 39 | `ratio_diff` | Ratio Diff | Ratio differencing |
| 40 | `abs_log_linear` | Abs Log-Lin | Absolute value log-linear |

Additionally, there are **Neural Network Prediction** (standalone, not part of the fusion), **Overfitting Algorithm** (standalone, not part of the fusion), **Offset Algorithm** (standalone, not part of the fusion), and **Function Fitting** (with R² evaluation).

Weight modes supported:
- **Backtest Weights**: Leave-one-out backtest MAPE de-normalized weights; lower error means higher weight.
- **Uniform Weights**: All methods have equal weight.

---

## Tech Stack

- **Vanilla JavaScript**: No frontend frameworks (React / Vue / Angular), using only ES5-compatible syntax for maximum compatibility.
- **Canvas 2D API**: All drawing (charts, functions, pixel art, physics simulation) uses the Canvas 2D API.
- **Web Audio API**: The pixel music synthesizer uses Web Audio API for real-time 8-bit timbre synthesis.
- **Service Worker + Cache API**: PWA offline caching, using Network-First strategy to ensure users get the latest version.
- **CSS Variables**: Unified palette and design token management.
- **p5.js** (used only by the pixel art generator): As a drawing helper library.
- **WebAssembly** (experimental): Wasm-accelerated version of the reaction-diffusion mode, generated by Emscripten compiling C source code.
- **localStorage**: Saves user settings (nickname, avatar, background, language, category collapse state, recent tools, speed challenge leaderboard, etc.). User information (nickname, avatar, background) is persisted in localStorage (changed from sessionStorage), remaining after closing the browser; a cookie `pixel_user_session` (max-age one year) is also set as a registered marker.
- **IndexedDB / Blob URL**: Saves avatar and background images (storing base64 directly in localStorage would exceed limits).
- **GitHub Actions**: Automatic deployment to GitHub Pages.

---

## Project Structure

```
pixel-tools/
├── index.html                  # Main entry HTML (all page divs, toggled via hidden class)
├── styles/
│   └── pixel.css               # Global styles (CSS Variables + pixel-art components)
├── js/
│   ├── app.js                  # Main app logic (page switching, history stack, home enhancements, tutorials)
│   ├── i18n.js                 # Internationalization (Chinese/English bilingual, per-page tutorial content)
│   ├── mouse-trails.js         # Mouse drag particle effects (topmost canvas, pointer-events: none)
│   ├── expression-parser.js    # Expression parser (AST, used by calculator and function system)
│   ├── predictors.js           # 40 sequence prediction methods
│   ├── weights.js              # Weight calculation + backtesting (backtest / computeWeights / ensemblePredict)
│   ├── nn.js                   # Neural network (incremental training, long-term training mode)
│   ├── funcfit.js              # Function fitting (with R² evaluation)
│   ├── overfit.js              # Overfitting algorithm (independent, not part of ensemble)
│   ├── offsetfit.js            # Offset algorithm (independent, not part of ensemble)
│   ├── chart.js                # Line chart + weight bar chart (custom pixel-style scrollbar + zoom buttons)
│   ├── function-plotter.js     # 2D function plotting (coordinate system, unit length, parameter sliders, animation)
│   ├── function-3d.js          # 3D function rendering (z=f(x,y), mouse rotation)
│   ├── math-cards.js           # Math learning cards (arithmetic + mixed operations)
│   ├── math-cards-ext.js       # Math cards extension (fractions / decimals / equations / geometry / speed math)
│   ├── maze-generator.js       # Maze generator (4 algorithms + BFS solve animation)
│   ├── nn-visualizer.js        # Neural network visualizer (forward/backprop, loss curve, decision boundary)
│   ├── pixel-art.js            # Pixel art generator (8 art modes, requires p5.js)
│   ├── pixel-drawing-editor.js # Pixel drawing editor (multi-layer + palette + toolbar)
│   ├── pixel-music.js          # Pixel music synthesizer (Web Audio API + sequencer + oscilloscope)
│   ├── physics-sandbox.js      # Physics simulator (Falling Sand style, element interactions)
│   ├── image-pixelizer.js      # Image pixelizer (palette quantization + color limit)
│   ├── pixel-clock.js          # Pixel clock (clock + calendar + pomodoro timer)
│   ├── pixel-rpg.js            # Pixel RPG (turn-based combat + leveling)
│   └── pixel-ai.js             # Pixel AI chat (9 LLM providers, token tracking, bilingual)
├── wasm/
│   ├── reaction-diffusion.c    # Reaction-diffusion C source (Gray-Scott model)
│   └── build.sh                # Emscripten build script
├── mcp-server/                 # MCP Server (FastMCP + Python)
│   ├── server.py               # Main service (calculate / predict_sequence / list_predictors)
│   ├── requirements.txt        # Dependencies (mcp)
│   └── README.md               # MCP Server documentation
├── icons/
│   ├── icon-192.png            # PWA icon 192px
│   └── icon-512.png            # PWA icon 512px
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions auto-deploy to Pages
├── service-worker.js           # PWA Service Worker (Network-First strategy)
├── manifest.json               # PWA Manifest
├── .gitignore
└── README.md                   # This document
```

---

## File Manifest

Detailed explanation of each source file's purpose, key functions, and dependencies, helping contributors quickly locate code.

### Root Directory Files

#### `index.html`
- **Purpose**: Main entry HTML, containing the DOM structure for all site pages. Each tool page is defined via `<div class="page" id="xxx-page">`, with display toggled using the `hidden` class. Synchronously loads global scripts like `js/i18n.js`, `js/mouse-trails.js`, as well as tool-specific scripts.
- **Key Content**: Homepage landing-page, 5 category entries, 20+ tool page divs, settings page, tutorial modal, Toast container, mouse particle canvas.
- **Dependencies**: All `js/*.js`, `styles/pixel.css`, `manifest.json`, `service-worker.js`.

#### `service-worker.js`
- **Purpose**: PWA Service Worker, responsible for offline caching and version management. Uses Network-First strategy to ensure users get the latest version on every refresh, falling back to cache when offline.
- **Key Functions / Events**: `install` (precache key resources + `skipWaiting`), `activate` (delete old caches + `clients.claim` + notify `SW_UPDATED`), `fetch` (route strategy by resource type).
- **Dependencies**: `CACHE_VERSION` constant, `CACHE_NAME`, `PRECACHE_URLS` list.

#### `manifest.json`
- **Purpose**: PWA manifest, declaring app name, icons, theme color, display mode, etc., enabling the site to be recognized by browsers as an installable PWA.
- **Key Fields**: `name`, `short_name`, `icons` (192/512px), `theme_color` (deep space blue), `background_color`, `display: standalone`, `start_url`.
- **Dependencies**: `icons/icon-192.png`, `icons/icon-512.png`.

### `js/` Directory

#### `js/app.js`
- **Purpose**: Main application entry, coordinating page switching, history stack, homepage enhancements, settings page, parameter panels, calculator, tutorial system, Toast prompts, etc. It is the "control center" of the entire project.
- **Key Functions**: `navigateTo(pageId)` (page switching + history stack), `goBack()` (ESC return to previous level), `showToast(msg)` (custom pixel-style Toast), `showTutorial(pageId)` (popup tutorial for the page), `initSettings()` (settings panel initialization), `initApp()` (application entry).
- **Dependencies**: `js/i18n.js` (translations), `js/mouse-trails.js` (particles), `js/predictors.js` + `js/weights.js` + `js/chart.js` (prediction system combination), `js/expression-parser.js` (calculator), `js/function-plotter.js` (function system).

#### `js/i18n.js`
- **Purpose**: Internationalization module, containing Chinese/English translation tables + translation functions. All elements tagged with `data-i18n` are auto-updated; the translation table also includes page-specific tutorial content.
- **Key Functions**: `i18n.t(key, params)` (with parameter interpolation), `i18n.setMode(mode)` (switch `auto`/`zh`/`en`), `i18n.apply()` (batch update DOM), `i18n.getMode()`.
- **Dependencies**: No external dependencies; listens for `languagechange` event for other components to respond.

#### `js/mouse-trails.js`
- **Purpose**: Mouse drag particle effects, generating pixel-style particle trails along the mouse trajectory, with gravity, decay, and fade-out effects. At the topmost layer `z-index: 99999` but `pointer-events: none`, not blocking interaction.
- **Key Functions**: `initMouseTrails()`, `spawnParticle(x, y)`, `updateParticles()` (`requestAnimationFrame` loop), `resizeCanvas()`.
- **Dependencies**: `#mouse-trails-canvas` DOM element (provided by `index.html`).

#### `js/pixel-art.js`
- **Purpose**: Pixel art generator, 8 art modes (flow field, particles, mosaic, spiral, fractal tree, Voronoi, wave interference, reaction-diffusion), seeded random for reproducibility, optional Wasm acceleration kernel.
- **Key Functions**: `setup()` / `draw()` (p5.js lifecycle), `generateFlowField()`, `generateReactionDiffusion()`, `loadWasmModule()` (initialize inline JS optimized kernel), `exportPNG()`.
- **Dependencies**: p5.js (CDN loaded), `js/i18n.js`.

#### `js/pixel-drawing-editor.js`
- **Purpose**: Pixel drawing editor, pixel-by-pixel hand-drawing creation. Supports brush, eraser, fill, eyedropper, line, rectangle, circle and other tools, multi-layer operations, NES / GameBoy / CGA retro palettes + custom colors.
- **Key Functions**: `initDrawingEditor()`, `setTool(tool)`, `drawPixel(x, y, color)`, `floodFill()`, `mergeLayers()`, `exportPNG()`.
- **Dependencies**: Canvas 2D API, `js/i18n.js`.

#### `js/pixel-music.js`
- **Purpose**: Pixel music synthesizer, 8-bit chip music creation tool. Multi-track sequence editor (melody, bass, drums), square wave / triangle wave / sawtooth wave / noise and other timbres, adjustable BPM, piano keyboard input, oscilloscope visualization, WAV export.
- **Key Functions**: `initMusicSynth()`, `playNote(freq, duration)`, `playSequence()`, `renderOscilloscope()`, `exportWAV()`.
- **Dependencies**: Web Audio API, `js/i18n.js`.

#### `js/expression-parser.js`
- **Purpose**: Expression parser, parsing string expressions into AST and evaluating them. Also supports extracting parameter symbols from functions; it is the shared infrastructure for the calculator and function system.
- **Key Functions**: `parseExpression(str)` (returns AST root node), `evaluateAST(node, scope)` (evaluate by scope), `extractVariables(node)` (extract parameter symbols, filtering reserved words `x`/`pi`/`e`/`sin`/`cos`/`tan`/`log`/`sqrt`/`abs`/`exp`/`ln`), `tokenize(str)`.
- **Dependencies**: No external dependencies, pure algorithm implementation.

#### `js/function-plotter.js`
- **Purpose**: Function system 2D plotting engine, plotting `y=f(x, a, b, c...)`. Includes coordinate system rendering, 1-2-5 nice unit ticks, scroll wheel zoom, drag panning, parameter sliders, animation playback.
- **Key Functions**: `drawAxes()`, `plotFunction(fn, params)`, `zoomCanvas(factor)`, `panCanvas(dx, dy)`, `startAnimation()` (parameters cycle in sine wave), `addFunction(expr)`.
- **Dependencies**: `js/expression-parser.js`, Canvas 2D API, `js/i18n.js`.

#### `js/function-3d.js`
- **Purpose**: Function system 3D plotting, plotting `z=f(x, y)` surfaces. Mouse drag to rotate view, scroll wheel zoom, supports parameterization.
- **Key Functions**: `init3D()`, `drawSurface()`, `rotateView(dx, dy)`, `project3D(x, y, z)`.
- **Dependencies**: `js/expression-parser.js`, Canvas 2D API.

#### `js/chart.js`
- **Purpose**: Prediction system line chart + weight bar chart rendering engine. Adaptive ticks, scroll wheel zoom, drag panning, custom pixel-style scrollbar and zoom buttons.
- **Key Functions**: `setupCanvas()`, `drawLineChart(series, predictions)`, `drawWeightBars(weights, labels)`, `computeNiceUnit(range)` (1-2-5 tick algorithm), `zoomChart(factor)`.
- **Dependencies**: Canvas 2D API, `js/i18n.js`.

#### `js/predictors.js`
- **Purpose**: Collection of 40 sequence prediction method implementations, the algorithmic core of the prediction system. Covers naive method, moving average, exponential smoothing, regression, autoregression, Fourier, difference extrapolation, etc.
- **Key Functions**: `predict_naive(series)`, `predict_sma(series, window)`, `predict_ses(series, alpha)`, `predict_holt_winters(series, ...)`, `predict_poly2()` / `predict_poly3()` / `predict_poly4()`, `predict_fourier()`, `predict_ar1()` / `predict_ar2()` / `predict_ar3()`, and the unified `predictors` array (each item contains `id` / `name` / `fn`).
- **Dependencies**: Pure algorithm, no external dependencies.

#### `js/weights.js`
- **Purpose**: Prediction weight calculation and backtesting. Based on leave-one-out backtest MAPE de-normalized to get each method's weight, then performs multi-method fusion prediction.
- **Key Functions**: `backtest(series, predictorFn)` (leave-one-out backtest → MAPE), `computeWeights(series, predictors)` (de-normalized weights), `uniformWeights(n)`, `ensemblePredict(series, predictors, weights, steps)` (fusion prediction), `computeMethodStats()`.
- **Dependencies**: `js/predictors.js`.

#### `js/nn.js`
- **Purpose**: Neural network prediction implementation, including incremental training and long-term training modes. Independent from the 40 methods, not part of the fusion, serving as a comparison showcase.
- **Key Functions**: `trainNN(series, options)`, `predictNN(model, steps)`, `forwardPass()`, `backwardPass()`, `saveModel()` / `loadModel()`.
- **Dependencies**: Pure JS matrix operations, no third-party libraries.

#### `js/nn-visualizer.js`
- **Purpose**: Neural network visualization tool, real-time display of forward/backward propagation, weight changes, loss curves, decision boundaries. Supports XOR, sine fitting, classification and other datasets.
- **Key Functions**: `initVisualizer()`, `drawNetwork()`, `drawDecisionBoundary()`, `trainStep()`, `drawLossCurve()`.
- **Dependencies**: Canvas 2D API, `js/nn.js` (shared training logic).

#### `js/funcfit.js`
- **Purpose**: Function fitting demo module, performing polynomial / exponential / logarithmic fitting on input sequences, and computing R² to evaluate goodness of fit.
- **Key Functions**: `fitPolynomial(series, degree)`, `computeR2(series, fitFn)`, `drawFitCurve()`, `evaluateFit(x)`.
- **Dependencies**: Canvas 2D API, `js/chart.js` (shared drawing).

#### `js/overfit.js`
- **Purpose**: Overfitting demo module, runs independently and is not part of the fusion. Demonstrates the phenomenon where high-degree polynomials fit training points perfectly but generalize poorly.
- **Key Functions**: `fitHighOrder(series, degree)`, `drawOverfitCurve()`, `computeGeneralizationError()`.
- **Dependencies**: Canvas 2D API, `js/chart.js`.

#### `js/offsetfit.js`
- **Purpose**: Offset fitting demo module, runs independently and is not part of the fusion. Attempts to overlay a constant offset on each base method to find the best correction term.
- **Key Functions**: `fitWithOffset(series, predictorFn)`, `findBestOffset()`, `drawOffsetCurve()`.
- **Dependencies**: `js/predictors.js`, Canvas 2D API.

#### `js/math-cards.js`
- **Purpose**: Math learning card main module, covering arithmetic + mixed arithmetic. Helps understand basic concepts through block array animations and operation step displays.
- **Key Functions**: `initArithmeticCard()`, `initMixedArithmeticCard()`, `renderBlockAnimation()`, `checkAnswer()`.
- **Dependencies**: Canvas 2D API, `js/i18n.js`.

#### `js/math-cards-ext.js`
- **Purpose**: Math learning card extension module, covering 5 card types: fraction, decimal, equation, geometry, speed challenge.
- **Key Functions**: `initFractionCard()`, `initDecimalCard()`, `initEquationCard()`, `initGeometryCard()`, `initSpeedChallenge()` (includes 60-second timer + local leaderboard).
- **Dependencies**: Canvas 2D API, `js/i18n.js`, `localStorage` (speed challenge leaderboard).

#### `js/maze-generator.js`
- **Purpose**: Maze generator, supporting 4 algorithms (Recursive Backtracker, Prim, Kruskal, Eller), adjustable rows/columns and wall thickness, BFS shortest path solving animation, pixel image export.
- **Key Functions**: `generateMaze(rows, cols, algorithm)`, `solveBFS(maze, start, end)`, `drawMaze()`, `animateSolution(path)`, `exportMazePNG()`.
- **Dependencies**: Canvas 2D API, `js/i18n.js`.

#### `js/physics-sandbox.js`
- **Purpose**: Physics sandbox simulator, similar to Falling Sand Game. Simplified to 3 substances (EMPTY eraser / WATER / HYDROGEN), with water's falling + lateral flow physics fully preserved; added hydrogen that floats upward (opposite to gravity), can rise through water, invisible by default; added "Gas" button to toggle hydrogen visibility (semi-transparent light blue when visible).
- **Key Functions**: `initPhysicsSandbox()`, `step()` (update grid per frame), `paintCell(x, y, element)`, `interactCells()`, `setBrushSize(n)`, `toggleGasVisibility()` (toggle hydrogen visibility).
- **Dependencies**: Canvas 2D API, `js/i18n.js`.

#### `js/image-pixelizer.js`
- **Purpose**: AI image pixelizer tool, uploads images and automatically converts them to pixel style. Adjustable pixel block size, palette (NES / GameBoy / CGA / custom), color count, real-time preview, download pixelized image. All processing is done purely on the frontend.
- **Key Functions**: `handleImageUpload(file)`, `pixelizeImage(img, blockSize, palette)`, `applyPalette(colors, palette)`, `exportPixelizedPNG()`.
- **Dependencies**: Canvas 2D API, `URL.createObjectURL`, `js/i18n.js`.

#### `js/pixel-clock.js`
- **Purpose**: Pixel clock tool, including three modes: digital clock, monthly calendar view, and pomodoro timer.
- **Key Functions**: `initClock()`, `renderDigitalClock()`, `renderCalendar()`, `startPomodoro()` (25-minute work + 5-minute break cycle), `addCalendarEvent(date, label)`.
- **Dependencies**: Canvas 2D API, `js/i18n.js`, `localStorage` (event markers).

#### `js/pixel-rpg.js`
- **Purpose**: Pixel RPG dungeon maze adventure mini-game. A masked figure in black explores dungeons, with turn-based combat, wall torches lighting the way, slimes as the main enemies, and a downward corridor leading to the next floor. Supports clicking/touching any movable cell on the map, with the player automatically moving cell by cell along the BFS shortest path (compatible with touch and mouse pointerdown events); keyboard operation can interrupt auto-navigation.
- **Key Functions**: `initRPG()`, `generateDungeon(level)`, `handlePlayerMove(dx, dy)`, `findPathBFS(start, end)` (BFS pathfinding), `autoNavigate(path)` (auto cell-by-cell movement), `startBattle(enemy)`, `takeTurn(action)`, `nextFloor()`.
- **Dependencies**: Canvas 2D API, Web Audio API (8-bit sound effects), `js/i18n.js`.

### `styles/` Directory

#### `styles/pixel.css`
- **Purpose**: Global stylesheet, defining all pixel-style visual specs. Includes CSS Variables design tokens (palette, spacing, fonts), button / input / panel / dialog / Toast / tutorial modal / scrollbar and other component styles, responsive breakpoints, `prefers-reduced-motion` adaptation, `focus-visible` focus styles.
- **Key Selectors**: `:root` (CSS Variables), `.pixel-btn`, `.pixel-input`, `.pixel-dialog`, `.tutorial-btn`, `.toast`, `canvas` (global canvas reset rules), `#mouse-trails-canvas` (particle canvas exception).
- **Dependencies**: Directly `<link>`-ed by `index.html`.

### `wasm/` Directory

#### `wasm/reaction-diffusion.c`
- **Purpose**: C source code for the Gray-Scott reaction-diffusion model, originally used to compile to WebAssembly via Emscripten to accelerate the reaction-diffusion mode. Currently switched to an inline JS optimized kernel approach; this source code is retained as an algorithm reference.
- **Key Functions**: `simulate_step(u, v, du, dv, width, height, params)` (single iteration step), `init_grid()`.
- **Dependencies**: Standard C library; compilation output was previously directed to `js/reaction_diffusion.wasm`.

#### `wasm/build.sh`
- **Purpose**: Emscripten compilation script, calling `emcc` to compile `reaction-diffusion.c` into a WebAssembly module. Currently retained as an optional compilation path; the runtime no longer depends on the compilation output.
- **Key Command**: `emcc reaction-diffusion.c -O3 -s WASM=1 -o ../js/reaction_diffusion.wasm ...`.
- **Dependencies**: Emscripten SDK (emsdk).

### `mcp-server/` Directory

#### `mcp-server/server.py`
- **Purpose**: MCP (Model Context Protocol) server, wrapping the site's calculator and predictor as MCP tools, available for direct invocation by MCP clients like TRAE, Claude Desktop, Cursor, etc., letting AI assistants remotely use this site's capabilities.
- **Key Functions / Tools**: `calculate(expression, angle_mode?)` (restricted `eval` + character whitelist), `predict_sequence(series, count?, weight_mode?)` (4 basic method fusion), `list_predictors()` (list available prediction methods).
- **Dependencies**: FastMCP (`mcp` package, see `requirements.txt`), Python standard library `math`.

#### `mcp-server/requirements.txt`
- **Purpose**: Python dependency list, recording the pip packages needed to run the MCP Server.
- **Key Content**: `mcp>=1.x` (FastMCP SDK).
- **Dependencies**: Installed via `pip install -r requirements.txt`.

#### `mcp-server/README.md`
- **Purpose**: MCP Server dedicated documentation, explaining installation, configuration, and integration with various MCP clients (TRAE / Claude Desktop / Cursor).
- **Key Content**: Installation commands, client configuration JSON examples, security notes.
- **Dependencies**: References the tools exposed by `server.py`.

---

## Local Development

This project is a pure static website with no build step required. Open it with any static server.

```bash
# 1. 克隆仓库
git clone https://github.com/xiaozhenweiyan/pixel-tools.git
cd pixel-tools

# 2. 启动静态服务器（任选其一）

# 方式 A：Python 3
python3 -m http.server 8000

# 方式 B：Node.js（需先 npm i -g serve）
serve -p 8000

# 方式 C：VS Code Live Server 扩展（右键 index.html → Open with Live Server）

# 3. 在浏览器访问
# http://localhost:8000
```

> **Important**: You must access via `http://localhost`, not directly with the `file://` protocol. Reasons:
> 1. Service Worker can only be registered under `http://` or `https://` protocols.
> 2. Some browsers restrict `localStorage` and ES Modules under the `file://` protocol.
> 3. CDN resources like p5.js may fail to load under `file://`.

### Modification and Debugging

- All JS uses IIFE pattern, mounted on the `window` global, directly callable in the browser DevTools Console.
- No need to refresh after modifying CSS (some browsers support hot reload); refreshing the page is needed after modifying JS.
- After modifying the Service Worker, you need to close all tabs and reopen them, or refresh once after the new SW activates (automatically handled via `skipWaiting` + `clients.claim` in `service-worker.js`).
- Debugging Service Worker: Chrome DevTools → Application → Service Workers → check "Update on reload".

---

## Deploy to GitHub Pages

This project is automatically deployed via GitHub Actions. Each push to the `main` branch triggers deployment.

### Automatic Deployment Configuration

The `.github/workflows/deploy.yml` configuration is as follows:

- **Trigger**: push to `main` branch, or manual workflow_dispatch.
- **Permissions**: `pages: write` + `id-token: write` (required for GitHub Pages deployment).
- **Concurrency Control**: `group: pages`; new deployments cancel ongoing old deployments.
- **Steps**: checkout → configure-pages → upload-artifact (path: `.`) → deploy-pages.

### Manual Deployment

If you want to manually deploy to your own GitHub Pages:

1. Fork this repository.
2. Go to repository Settings → Pages → Source: select "GitHub Actions".
3. Push code to the `main` branch and wait for Actions to complete, then access `https://<your-username>.github.io/pixel-tools/`.

### Custom Domain

If you need to use a custom domain, add a `CNAME` file in the repository root (content is the domain name), and configure a CNAME record at your DNS provider pointing to `<username>.github.io`.

---

## PWA & Service Worker Strategy

`service-worker.js` uses a **Network-First** strategy to ensure users get the latest version on every refresh:

| Resource Type | Strategy | Description |
|---------------|----------|-------------|
| HTML documents | Network-First | Network first, fall back to cache when offline |
| JS / CSS / Images | Network-First | Network first, avoiding SWR causing two refreshes to take effect |
| Third-party CDN (p5.js) | Cache-First | Cross-origin resources cache first, offline fallback |

### Cache Version Management

`CACHE_VERSION` must be upgraded after each deployment (currently `v13`). When the new SW activates, all old version caches are automatically deleted:

```javascript
const CACHE_VERSION = 'v13';
const CACHE_NAME = 'pixel-tools-' + CACHE_VERSION;
```

### SW Update Flow

1. The browser detects byte changes in `service-worker.js` and downloads the new version in the background.
2. New SW installs (`install` event) → precaches key resources → `self.skipWaiting()` to take over immediately.
3. New SW activates (`activate` event) → deletes all old caches → `self.clients.claim()` to immediately control all clients → notifies all clients `SW_UPDATED`.
4. Clients receiving the `SW_UPDATED` message can prompt users to refresh (some pages auto-refresh).

### Debugging Service Worker

- Chrome DevTools → Application → Service Workers
- Check "Update on reload": re-downloads SW on every refresh.
- Check "Bypass for network": temporarily bypass SW (for troubleshooting).
- "Unregister": unregisters SW (for a complete reset).

---

## Internationalization (i18n)

`js/i18n.js` implements a complete Chinese/English bilingual system. All user-visible text across the site (buttons, labels, prompts, error messages, tutorials) is connected to the i18n system:

- **Three Modes**: `auto` (follow system) / `zh` (Chinese) / `en` (English), saved to `localStorage`.
- **Translation Function**: `i18n.t(key, params)`, supports parameter interpolation (e.g., `t('toast_welcome', { name: 'Guest' })` → `Welcome, Guest!`).
- **Auto Application**: Supports `data-i18n`/`data-i18n-title`/`data-i18n-aria-label` attributes for auto-updating. All elements with `data-i18n` attribute auto-update `innerHTML`; elements with `data-i18n-placeholder` update `placeholder`.
- **Real-time Switching**: Calling `i18n.setMode('en')` immediately updates all DOM without refreshing (some pages cached by Service Worker may require a manual refresh).
- **Custom Events**: Switching language triggers a `languagechange` event; components can listen for this event for additional processing.
- **Fallback Mechanism**: Returns the key itself when not found, with a Console warning.

### Adding New Translations

1. Add the key simultaneously to both `translations.zh` and `translations.en` in `js/i18n.js`.
2. Add `data-i18n="key"` (replaces innerHTML) or `data-i18n-placeholder="key"` (replaces placeholder) to elements in HTML.
3. Get translations via `i18n.t('key')` in JS.

> **Note**: Keys containing hyphens (e.g., `tutorial_app-landing`) must be enclosed in quotes: `'tutorial_app-landing': '...'`, otherwise JS parses `-` as a minus sign causing a syntax error.

---

## Tutorial System

Each page has a dedicated tutorial modal. Click the "Tutorial" button to open the page-specific usage guide (basic operations, parameter descriptions, tips, etc.).

### Button Position (by Page Type)

- **Homepage (`app-landing-page`)**: The tutorial button is at the **top-right** of the viewport, small size, containing only the word "Tutorial", to avoid blocking the homepage top banner.
- **Other Sub-pages**: The tutorial button is at the **bottom center** of the viewport (`position: fixed; bottom: 20px`), 400px wide, convenient for users to click at any time.
- **Auto-hide**: The homepage tutorial button auto-hides when entering a sub-page (controlled by `hideAllPages()`), and reappears when returning to the homepage.

### Implementation Details

- **Button Position (CSS)**: `position: fixed` ensures the button is always within the viewport, unaffected by page scrolling. The homepage and sub-pages use different classes to distinguish position and size.
- **Button Position (DOM)**: The button is placed inside the corresponding page `<div>` (before `</div>`), ensuring the button is also hidden when `hideAllPages()` hides the page.
- **Dedicated Content**: Each page's tutorial content is page-specific, looking up i18n keys based on the `data-page` attribute (e.g., `app-landing-page` → `tutorial_app-landing`).
- **Fallback**: Displays generic `tutorial_fallback` content when a dedicated tutorial is not found.
- **Modal**: Click the overlay, press ESC, or click the × button to close; closing restores `body` scrolling.
- **Z-index**: Tutorial button `z-index: 9000`, tutorial modal `z-index: 10001`, mouse drag particles `z-index: 99999`.

### Tutorial Key Naming Rules

Remove the `-page` suffix from the page ID and add the `tutorial_` prefix:

| Page ID | i18n key |
|---------|----------|
| `app-landing-page` | `tutorial_app-landing` |
| `landing-page` | `tutorial_landing` |
| `learning-landing-page` | `tutorial_learning-landing` |
| `pixel-programming-landing-page` | `tutorial_pixel-programming-landing` |
| `predictor-page` | `tutorial_predictor` |
| `function-page` | `tutorial_function` |
| `calculator-page` | `tutorial_calculator` |
| `pixel-art-page` | `tutorial_pixel_art` |
| `pixel-drawing-page` | `tutorial_pixel_draw` |
| `pixel-music-page` | `tutorial_pixel_music` |
| `arithmetic-page` | `tutorial_arithmetic` |
| `mixed-arithmetic-page` | `tutorial_mixed-arithmetic` |
| `fraction-page` | `tutorial_fraction` |
| `decimal-page` | `tutorial_decimal` |
| `equation-page` | `tutorial_equation` |
| `geometry-page` | `tutorial_geometry` |
| `speed-page` | `tutorial_speed` |
| `maze-page` | `tutorial_maze` |
| `nn-visualizer-page` | `tutorial_nn-visualizer` |
| `physics-page` | `tutorial_physics` |
| `pixelizer-page` | `tutorial_pixelizer` |
| `clock-page` | `tutorial_clock` |
| `rpg-page` | `tutorial_rpg` |
| `settings-page` | `tutorial_settings` |

---

## Function System Parameter Dialog

The function system uses custom pixel-style modal dialogs when adding functions and validating parameters, replacing the browser's native `prompt()` / `alert()`, maintaining visual consistency with the entire site.

### Dialog Style `.pixel-dialog`

- **Colors**: Deep space blue `#1a1a2e` background + gold `#ffd700` border + Courier New monospace font.
- **Hard Shadow**: `4px 4px 0` offset black shadow, presenting an 8-bit three-dimensional feel.
- **Structure**: Title bar (with × close button) + content area (prompt text + input field) + bottom button bar (confirm / cancel).
- **Interaction**: Click overlay, press ESC, or click × button to close; confirm button triggers callback.

### Parameter Name Restrictions

- **Single Letter**: Parameter names only allow a single letter (`a-z` / `A-Z`).
- **Reserved Words Prohibited**: The following reserved words cannot be used as parameter names (filtered by `extractVariables` in `js/expression-parser.js`):
  - Variables: `x` (independent variable)
  - Constants: `pi` / `e`
  - Functions: `sin` / `cos` / `tan` / `log` / `sqrt` / `abs` / `exp` / `ln`
- On validation failure, a red error message is displayed within the dialog; the user can re-enter without closing the dialog.

### Multi-parameter Auto-creation

- When adding a function with ≥2 parameters (e.g., `y=a*x^2+b*x+c`), the system pops up a confirmation dialog listing all identified parameters.
- Click the "Create All" button to batch-create sliders for all parameters, without adding them one by one.
- Each parameter slider can independently set min value, max value, and step.

### Implicit Multiplication Support

Expressions entered in the dialog support both:

- **Explicit multiplication**: `y=a*x^2+b*x+c` (recommended, parsing is more explicit).
- **Implicit multiplication**: `y=ax^2+bx+c` (`js/expression-parser.js` automatically inserts `*` between numbers and letters, and between letters and letters).

### Validation and Error Messages

- Expression syntax errors, illegal parameter names, division by zero, etc. all trigger red error messages within the dialog.
- After modifying the input, click confirm again to retry, without refreshing the page.

---

## Homepage Interaction

### Category Collapsing

The 5 top-level categories on the homepage (Learning / Art / Tools / Entertainment) can be independently collapsed/expanded:

- Click the category title to toggle collapse state.
- Collapse state is saved to `localStorage` and auto-restored on next visit.
- Collapse icons `▼` / `▶` update in real time.

### Recent Tools

The "Recent" area at the top of the homepage:

- Automatically records the 3 most recently visited tools (FIFO; repeated visits move to the front).
- Click a card to quickly enter the corresponding tool.
- Click the "Clear" button to remove all records.
- When there are no records, this area auto-hides (`display: none`).

### ESC Key Navigation

- Press ESC on any sub-page to return to the previous level page.
- Press repeatedly to return to the homepage step by step.
- Pressing ESC on the homepage does nothing.
- When an input is focused, ESC prioritizes blurring the input (does not trigger page return).

---

## Keyboard Shortcuts

| Shortcut | Action | Applicable Pages |
|----------|--------|------------------|
| `ESC` | Return to previous page / blur input | All pages |
| `Enter` | Submit input (predict, calculate, add function, etc.) | Predictor, Calculator, Function System |
| `←` `→` `↑` `↓` / `WASD` | Character movement | Pixel RPG |
| `+` / `-` | Zoom coordinate system | Predictor, Function System |
| Mouse drag | Pan coordinate system / rotate 3D view / draw | Predictor, Function System, Physics Sandbox, Drawing Editor |
| Scroll wheel | Zoom | Predictor, Function System, Pixel Art |

---

## Mouse Drag Particle Effects

The mouse drag particle effect implemented by `js/mouse-trails.js`:

- **Trigger**: When the mouse moves on the page (speed exceeds threshold).
- **Effect**: Generates pixel-style particles along the mouse trajectory, with gravity, decay, and fade-out effects.
- **Layer**: `z-index: 99999` (topmost), but `pointer-events: none`, not blocking any interaction.
- **Canvas Reset**: Through dedicated CSS rules for `#mouse-trails-canvas` + inline styles, resets the influence of the global `canvas {}` rule (transparent background, no border, no shadow, unlimited width).
- **Performance**: Uses `requestAnimationFrame`, with automatic particle count limits to avoid performance issues.
- **Mobile**: Touch events also trigger particle effects.

---

## MCP Server

The `mcp-server/` directory contains an MCP (Model Context Protocol) server that wraps the site's calculator and predictor as MCP tools, available for direct invocation by MCP clients like TRAE, Claude Desktop, Cursor, etc.

### Exposed Tools

- **`calculate(expression, angle_mode?)`**: Evaluates a math expression (whitelist + restricted `eval`, only exposing the `math` module and trigonometric function wrappers).
- **`predict_sequence(series, count?, weight_mode?)`**: Predicts subsequent values of a number sequence (4 basic methods: mean, linear regression, differencing, moving average, fused by weight).
- **`list_predictors()`**: Lists all available prediction methods.

### Installation and Configuration

See [`mcp-server/README.md`](mcp-server/README.md).

### Security Notes

- Expression evaluation uses restricted `eval`; the global namespace `__builtins__` is empty, only exposing the `math` module and trigonometric function wrappers.
- Input character whitelist: digits, `+ - * / ( ) .` whitespace, function names `sqrt` / `sin` / `cos` / `tan`; all other characters are directly rejected.
- Trigonometric DEG mode is converted to radians via `x * π / 180`, with a built-in exact value lookup table for special angles (0/30/45/60/90/120/135/150/180/270/360 degrees).

---

## WebAssembly Acceleration

The `wasm/` directory contains the Wasm-accelerated version of the reaction-diffusion mode. **Currently fixed**: Uses an inline JS optimized kernel approach with no external wasm file dependency, avoiding the Emscripten compilation output loading failure issue, while retaining the C source code as an algorithm reference.

### Loading Flow

1. The user enables the "WebAssembly Acceleration" toggle in the settings page.
2. When entering the pixel art generator and selecting the "Reaction-Diffusion RD" mode, `loadWasmModule()` is called to initialize the inline optimized kernel.
3. After successful kernel initialization, `wasmLoaded = true`, and the reaction-diffusion mode automatically switches to the accelerated path.
4. The Toast message is explicit: **"WebAssembly acceleration enabled (JS optimized kernel)"**, to avoid users mistaking it for a real wasm binary.
5. If initialization fails (rare), it automatically falls back to the normal JS path and notifies the user.

### Performance Optimization Techniques

- **`Float32Array`**: All diffusion fields (u / v / du / dv) use `Float32Array` instead of regular arrays, reducing memory usage and accelerating access.
- **Inline laplacian**: The 3×3 neighborhood sum is directly inlined into the main loop, avoiding function call overhead.
- **Cached array length**: `width` / `height` are read outside the loop in advance, avoiding repeated property access per frame.
- **Boundary clipping**: Boundary grid points skip laplacian computation, reducing branch checks.
- Overall performance is 3-5x faster than the naive JS version, capable of handling higher resolutions and more iterations.

### File Description

- **Source**: `wasm/reaction-diffusion.c` (Gray-Scott reaction-diffusion model C source, as algorithm reference).
- **Build Script**: `wasm/build.sh` (Emscripten compilation, optional path; runtime no longer depends on compilation output).

### Compiling Wasm (Optional)

```bash
cd wasm
# 需要先安装 Emscripten SDK（emsdk）
./build.sh
# 生成的 reaction_diffusion.wasm 会自动放到 ../js/ 目录
```

> **Note**: The compilation output is not directly used by the runtime; it is retained only as an optional experimental path. To enable real wasm binary loading, you need to re-integrate the `WebAssembly.instantiate` path in `js/pixel-art.js`.

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Recommended |
| Edge | 90+ | Recommended |
| Firefox | 88+ | Recommended |
| Safari | 14+ | iOS Safari 14+ |
| Samsung Internet | 14+ | |
| IE | Not supported | Uses ES6+ features |

### Required Web APIs

- **Service Worker**: PWA offline functionality.
- **Cache API**: SW caching.
- **localStorage**: User settings storage.
- **IndexedDB**: Avatar and background image storage.
- **Canvas 2D**: All drawing.
- **Web Audio API**: Pixel music synthesizer.
- **Blob URL**: Image processing.
- **WebAssembly** (optional): Reaction-diffusion acceleration.

---

## Performance & Accessibility

### Performance Optimization

- **Zero Dependencies**: No third-party libraries apart from p5.js (used only by the pixel art generator).
- **On-demand Loading**: Each tool's JS is only initialized when that tool is opened.
- **Canvas Redraw Optimization**: Only redraws when data changes, avoiding meaningless `requestAnimationFrame`.
- **Particle Count Limit**: Mouse drag particle effects automatically limit particle count.
- **Service Worker Cache**: All static assets cached; second visit has zero network requests.
- **CSS Variables**: Unified design tokens, avoiding repeated style calculations.

### Accessibility

- **Keyboard Navigation**: All buttons and inputs support Tab key focus and Enter key submission.
- **focus-visible**: Shows a prominent gold border on focus (`border-color: var(--accent)`).
- **ARIA Labels**: Decorative SVGs have `aria-hidden="true"`.
- **prefers-reduced-motion**: Respects the system "reduce motion" setting, disabling button transition animations.
- **Semantic HTML**: Uses semantic tags like `<header>` `<footer>` `<button>`.
- **Color Contrast**: All text-to-background contrast ratios meet WCAG AA standards.

---

## Changelog

### 2026-07 · Pixel AI chat tool

- **Pixel AI chat tool** — New AI chat tool with 9 LLM providers, token usage tracking, local API key storage, bilingual UI

---

### 2026-07 · RPG Wiki Encyclopedia + Floor System Refactor + Site-wide i18n Improvement

- **RPG Wiki Encyclopedia Button**: Added a "Wiki Encyclopedia" button to the console (English Wikipedia), clicking opens a documentation page.
- **Wiki Documentation Page**: Document-style layout with table of contents navigation, 4 major sections:
  - Basic Attributes: HP/EXP/ATK/DEF meaning explanations
  - Operation Guide: Movement/attack/reset instructions
  - Item Catalog: 8 item introductions (Wooden Sword/Recovery Potion I/Leather Helmet/Leather Armor/Leather Leggings/Leather Boots/Experience Gem I/Attack Ring)
  - Monster Mechanics: Monster types/spawning/combat/rewards
- **Levels Changed to Floors**: All "Level N"/"level" text changed to "Floor N"/"floor" (drawUI/game over/reset/enter next floor prompts), better fitting the dungeon exploration theme.
- **Site-wide i18n Improvement**: Scanned 18 files with ~410 hardcoded Chinese strings, all connected to the i18n system:
  - `js/pixel-rpg.js`: Monster names/item names/showMessage/fillText all i18n-ized
  - `js/math-cards-ext.js`: 5 learning cards (fraction/decimal/equation/geometry/speed challenge) 200+ texts i18n-ized
  - `js/predictors.js`: 40 prediction method names i18n-ized
  - `js/math-cards.js`/`js/app.js`/`js/expression-parser.js`/`js/function-3d.js`/`js/pixel-clock.js`/`js/chart.js`/`js/nn-visualizer.js`/`js/nn.js`/`js/offsetfit.js`/`js/overfit.js`/`js/physics-sandbox.js`/`js/image-pixelizer.js` all i18n-ized
  - `index.html`: title/aria-label attributes connected via `data-i18n-title`/`data-i18n-aria-label`
  - i18n.js apply() function extended to support `data-i18n-title`/`data-i18n-aria-label` attributes
- **Service Worker** cache version upgraded to v24.

---

### 2026-07 · RPG Inventory/Equipment System Rework

- **Inventory Cell Enlargement**: Each cell ≥56px, item count displayed in the bottom-right corner (white font, transparent background); single items don't show a count.
- **Equipment Expanded to 7 Slots**: Left hand, right hand, head, body, legs, feet, accessory, replacing the original weapon/armor 2 slots.
- **8 New Items**: Removed old 6 items, added Wooden Sword (weapon atk+2), Recovery Potion I (restores 20 HP), Leather Helmet (def+1), Leather Armor (def+3), Leather Leggings (def+2), Leather Boots (def+1), Experience Gem I (+1 EXP), Attack Ring (accessory atk+1).
- **Pixel Art Item Icons**: Item icons changed to canvas-drawn pixel art (48x48), each item has a unique visual (wooden sword/potion bottle/leather set/gem/ring), no longer using emoji.
- **Click Interaction System**:
  - Click an item cell → selected highlight + detail panel below shows item attributes (name/type/description/stat bonuses).
  - Consumables show a "Use" button, equippable items show an "Equip" button, equipped items show an "Unequip" button.
  - First click a cell with an item, then click another cell → swap/move items (inventory↔inventory swap, inventory→equipment slot equip, equipment slot→inventory unequip).
  - Click outside the inventory and equipment area → deselect.
  - Click the same cell again → deselect.
- **Equipment Bonus Calculation**: ATK/DEF bonuses iterate through all 7 equipment slots and accumulate; drawUI displays in `ATK base+bonus` format.
- **Service Worker** cache version upgraded to v23.

---

### 2026-07 · RPG Inventory/Equipment/Map Layout/Navigation Improvements

| # | Module | Update Content |
|---|--------|----------------|
| 1 | Pixel RPG · Inventory | Added backpack system (16-slot capacity). Chests no longer immediately consume rewards; instead, dropped items are stored in the backpack: HP Potion (consumable, stackable), Experience Gem (instantly consumed for EXP), Iron Sword/Attack Ring (weapons), Steel Armor/Defense Charm (armor). When backpack is full, a prompt is shown and the item is not picked up. |
| 2 | Pixel RPG · Equipment | Added weapon/armor equipment slots. Click equipment in backpack to equip (old equipment returns to backpack); click equipment slot to unequip. Equipment bonuses take effect in real time; `getEffectiveAtk()`/`getEffectiveDef()` calculate total stats including equipment; `combatRound` uses effective stats for damage calculation. Top UI displays `ATK 5+3` format (base + equipment bonus). |
| 3 | Pixel RPG · Map Layout | RPG page changed from left-right split to top-bottom layout: control buttons (start/stop/reset) in a horizontal row on top, map canvas below occupying a large area (`width:100%` filling the panel), inventory/equipment side panel on the right (240px). Mobile automatically stacks in a single column. Map visually significantly enlarged. |
| 4 | Pixel RPG · Click Monster Auto-Attack | When clicking a monster, the player auto-BFS-pathfinds to the adjacent cell of the monster, and upon arrival **automatically initiates attack** (no manual key press needed). Added `attackTarget` field to record attack intent; `navigateTo` detects the target cell monster and sets it as attack target; `update` auto-calls `combatRound` upon arrival. |
| 5 | Pixel RPG · Path Blocked Stop | When auto-navigation encounters a monster blocking the path mid-way, the player walks to the front of the monster and **stops moving**, **does not clear the remaining path**, displaying "Ahead: [Monster Name]! Attack (Space) or go around" for the player to decide. After defeating the monster, re-clicking the target can continue navigation. Fixed the issue where the original `tryMove` failure directly cleared the entire pathQueue. |
| 6 | Pixel RPG · UI Overview | Top UI panel added backpack count display (`Backpack N/16`) and equipment bonus display (`ATK 5+3`/`DEF 1+2` format). |

> Files affected by this update: `js/pixel-rpg.js` (inventory/equipment data structures, `ITEM_TEMPLATES`, `openChest` rewrite, `equipItem`/`unequipItem`/`useItem`/`getEffectiveAtk`/`getEffectiveDef`/`faceTowards`/`renderInventory`/`renderEquipment` added, `navigateTo`/`update`/`drawUI`/`combatRound`/`reset` modified), `index.html` (RPG page layout refactor + inventory/equipment DOM), `styles/pixel.css` (layout styles + inventory/equipment pixel-style styles), `js/i18n.js` (`rpg_equipment_title`/`rpg_inventory_title` Chinese/English keys).

---

### 2026-07 · 7 Fixes and New Features

| # | Module | Update Content |
|---|--------|----------------|
| 1 | Settings Page · Back Button | Settings page "Back to Home" button moved from bottom footer to top-right floating (`floating-back-btn` style), consistent with other tool pages. |
| 2 | Startup Flow · Nickname | App startup no longer forces a nickname registration popup; when there's no profile, it silently uses the default nickname "Guest" and goes directly to the homepage; can be modified at any time in the settings page. |
| 3 | User Info · Persistence | User information (nickname, avatar, background) changed from sessionStorage to localStorage for persistence, remaining after closing the browser; a cookie `pixel_user_session` (max-age one year) is also set as a registered marker, no more re-registration. Logging out clears localStorage and the cookie. |
| 4 | Pixel Drawing Editor · Canvas | Canvas CSS display size increased from max-width 512px to 768px, logical pixel options (16 / 32 / 64 / 128) unchanged. |
| 5 | Pixel RPG · Auto Navigation | Pixel RPG added click/touch any movable cell on the map, with the player automatically moving cell by cell along the BFS shortest path. Supports mobile touch and desktop mouse (pointerdown events). Keyboard operation (arrow keys / WASD) retained; pressing arrow keys can interrupt auto-navigation. Click a monster to pathfind to an adjacent cell; click an exit/chest to pathfind to the target cell and trigger the corresponding event; clicking a wall does nothing. |
| 6 | Physics Sandbox · Simplified + Hydrogen + Gas Button | Removed 7 substances (sand/stone/fire/plant/metal/oil/acid), keeping only water (EMPTY eraser retained as erasing tool). Water's falling + lateral flow physics fully preserved. Added hydrogen substance: floats upward (opposite to gravity), can rise through water, invisible by default. Added "Gas" button: click to toggle hydrogen visibility (semi-transparent light blue when visible). |
| 7 | Page Navigation · Scroll Position | Page scroll position is saved when switching pages, and restored to the last position when returning to that page (no longer jumps to the top). ESC return also restores. |

> Files affected by this update: `js/app.js` (settings page back button, startup nickname, localStorage + cookie persistence, page switching scroll position), `js/pixel-drawing-editor.js` (canvas 768px), `js/pixel-rpg.js` (BFS auto-navigation), `js/physics-sandbox.js` (simplified + hydrogen + gas button), `styles/pixel.css` (`floating-back-btn` style, canvas size).

---

## Contributing

Contributions via Issues and Pull Requests are welcome!

### Contribution Process

1. Fork this repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m 'feat: add your feature'` (recommend using [Conventional Commits](https://www.conventionalcommits.org/) specification).
4. Push the branch: `git push origin feature/your-feature`.
5. Submit a Pull Request.

### Contribution Directions

- New Tools: Add new pixel-style tools (e.g., pixel tower defense, pixel drawing board import/export, etc.).
- New Art Modes: Add new generation algorithms for the pixel art generator.
- New Prediction Methods: Add new mathematical methods for the prediction system.
- New Learning Cards: Add new math concept cards for the learning system.
- Internationalization: Add new language support (e.g., Japanese, Korean).
- Performance Optimization: Wasm acceleration for more modes.
- Bug Fixes: Fix issues reported in Issues.

### Code Standards

- JavaScript: ES5-compatible syntax (`var` / `function`), IIFE pattern, mounted on the `window` global.
- CSS: Use CSS Variables, follow BEM naming (some legacy code may not fully comply).
- HTML: Semantic tags, `data-i18n` annotations for all user-visible text.

---

## FAQ

### 1. Why must I use `http://localhost`? Can't I just open it with `file://`?

Service Worker can only be registered under `http://` or `https://` protocols. Under `file://`, `localStorage` is also restricted, and CDN resources like p5.js will fail to load. Please use `python3 -m http.server 8000` or `serve -p 8000` to start a local static server and then access `http://localhost:8000`.

### 2. Can the website be used offline?

Yes. After the first load completes, the Service Worker caches all static assets. You can add the site as a PWA to your desktop via the "Install" button in the browser address bar, after which it can be used fully offline.

### 3. I modified a JS file but refreshing the page didn't take effect?

The Service Worker may have cached the old version. Open Chrome DevTools → Application → Service Workers, check "Update on reload" and then refresh; or close all tabs and reopen. Each deployment automatically upgrades `CACHE_VERSION` and clears old caches.

### 4. Some text didn't update after switching language?

The vast majority of text switches in real time, but a few pages cached by the Service Worker may require a manual refresh. If you encounter missing keys, a warning will appear in the Console; feel free to submit an Issue.

### 5. Is the WebAssembly acceleration actually real wasm?

Currently fixed to an inline JS optimized kernel approach with no external wasm file dependency. The Toast message explicitly reads "WebAssembly acceleration enabled (JS optimized kernel)". `wasm/reaction-diffusion.c` is still retained as an algorithm reference; you can recompile via `wasm/build.sh` to experiment with the real wasm binary path.

### 6. Will data be uploaded to a server?

No. This project has zero backend dependencies; all computation, storage, and rendering happen in the browser. Image pixelization and drawing export are all processed on the client side; images are never uploaded to any server. User information (nickname, avatar, background) is persisted in `localStorage` + cookie `pixel_user_session` (max-age one year), remaining after closing the browser, so no re-registration on the next visit; other data is saved in `localStorage` / `IndexedDB` and destroyed when the browser is closed (unless the user actively keeps it). Logging out clears both the user info in `localStorage` and the `pixel_user_session` cookie.

### 7. Why doesn't the function system let me use `x` as a parameter name?

`x` is the independent variable of the function and is already occupied by the system. Similarly, `pi`, `e`, `sin`, `cos`, `tan`, `log`, `sqrt`, `abs`, `exp`, `ln` are all reserved words and cannot be used as parameter names. Please use other single letters like `a`, `b`, `c` as parameters.

### 8. How do I connect the MCP Server to TRAE / Claude?

See [`mcp-server/README.md`](mcp-server/README.md). Simply put, after `pip install -r requirements.txt`, start `server.py`, and then add the corresponding server configuration in the MCP client configuration file.

### 9. Can I use it on mobile?

Yes. All tools have responsive adaptation: desktop dual-column layout, mobile single-column adaptive, with touch-friendly button sizes and spacing. Recommended: iOS Safari 14+ or Android Chrome 90+.

### 10. How do I contribute new prediction methods / art modes / learning cards?

Refer to the "Contribution Process" section to Fork and create a feature branch. Add new prediction methods to the `predictors` array in `js/predictors.js`; implement `generateXxx()` functions for new art modes in `js/pixel-art.js`; add new learning cards in `js/math-cards.js` or `js/math-cards-ext.js`, create the corresponding page div in `index.html`, and add tutorial translations in `js/i18n.js`.

---

## License

[MIT](LICENSE)

© 2026 Pixel Tools. Retro Deep-Space Pixel Theme.

---

## Acknowledgements

- [p5.js](https://p5js.org/): Drawing helper library for the pixel art generator.
- [Emscripten](https://emscripten.org/): WebAssembly compilation toolchain.
- [FastMCP](https://github.com/modelcontextprotocol/python-sdk): MCP Server framework.
- [GitHub Pages](https://pages.github.com/): Free hosting.
- [GitHub Actions](https://github.com/features/actions): Automatic deployment.

---

> If this project helps you, please give it a ⭐ Star on GitHub!

---

## 在线访问

- 在线 Demo：<https://xiaozhenweiyan.github.io/pixel-tools/>
- GitHub 仓库：<https://github.com/xiaozhenweiyan/pixel-tools>

> 推荐使用最新版 Chrome / Edge / Firefox / Safari 访问。首次加载后可点击浏览器地址栏的"安装"按钮把网站作为 PWA 应用添加到桌面，之后即可离线使用。

---

## 项目简介

Pixel Tools 是一个纯前端的工具集合网站，采用复古深空像素风（Retro Deep-Space Pixel Theme）视觉设计。所有工具均使用原生 JavaScript + Canvas API 实现，不依赖任何前端框架（React / Vue / Angular 等），仅在像素艺术生成器中借用了 [p5.js](https://p5js.org/) 作为绘图辅助库。

网站包含 20+ 个独立工具，分布在 5 个一级类别下：

- **学习类**：数学预测器、函数绘图、计算器、像素编程（迷宫 + 神经网络可视化）、7 种数学学习卡片
- **艺术类**：像素艺术生成器（8 种艺术模式）、像素绘图编辑器（多图层 + 调色板）、像素音乐合成器（8-bit 芯片音乐）
- **沙盒类**：物理模拟器（Falling Sand 风格）、AI 图像像素化工具
- **工具类**：像素时钟（时钟 + 日历 + 番茄钟）
- **娱乐类**：像素 RPG 小游戏（回合制战斗）

整个项目零后端依赖，所有数据存储在浏览器 `localStorage` / `IndexedDB` 中。用户信息（昵称、头像、背景）使用 `localStorage` 持久化保存，并设置 `pixel_user_session` cookie（max-age 一年）作为已注册标记，关闭浏览器后仍保留，下次访问无需重复注册；退出登录会同时清除 `localStorage` 和 cookie。其余数据关闭浏览器即销毁（除非用户主动保留）。所有图像处理（像素化、绘图导出）全部在客户端完成，图片不会上传到任何服务器。

---

## 核心特性

- **复古深空像素风 UI**：统一的色板（深空蓝 `#1a1a2e`、面板紫 `#2d2d44`、金黄强调 `#ffd700`）、像素边框（`3px solid`）、硬阴影（`4px 4px 0`）、等宽字体（Courier New）。所有按钮、输入框、面板、弹窗都遵循同一套设计 token（CSS Variables），视觉上呈现 8-bit / 16-bit 时代计算机界面的复古质感。
- **中英文双语支持（i18n）**：完整的 i18n 系统，支持 `auto` / `zh` / `en` 三种模式，`auto` 跟随系统语言，切换实时生效无需刷新（部分页面会提示刷新）。所有可见文本（按钮、提示、教程、错误信息）均有双语对照，添加新语言只需扩展 `js/i18n.js` 翻译表。
- **PWA 离线可用 + 可安装**：通过 Service Worker 缓存所有静态资源，安装到桌面后可完全离线使用。`manifest.json` 提供应用图标、名称、主题色，安装后无浏览器地址栏，体验接近原生 App。
- **响应式设计**：桌面端双栏布局，移动端单栏自适应，触摸友好的按钮尺寸和间距。所有工具在手机、平板、桌面三种尺寸下都能正常使用。
- **首页分类折叠**：5 个一级类别可独立折叠/展开，状态保存到 `localStorage`，下次访问自动恢复。
- **首页"最近使用"快捷区**：自动记录最近访问的 3 个工具，无记录时自动隐藏，支持一键清空。
- **ESC 键返回上一级**：在任何子页面按 ESC 返回上一级，连按可逐级回到首页；输入框聚焦时按 ESC 优先失焦。页面切换时会保存当前页面滚动位置，返回该页面时自动恢复到上次离开的位置（ESC 返回同样恢复），不再回到顶层。
- **鼠标拖拽粒子特效**：鼠标在页面上拖动时会留下像素风粒子拖尾，位于最顶层（`z-index: 99999`）但不遮挡交互（`pointer-events: none`）。粒子有重力、衰减、淡出效果，移动端触摸事件同样触发。
- **每页专属教程**：每个工具页面都有"教程"按钮，点击弹出该页面的专属使用说明，内容包括基本操作、参数说明、技巧等。首页教程按钮位于视口右上角，其他页面教程按钮位于视口底部居中。
- **函数系统参数动画**：函数系统支持参数 `a, b, c, d...`，添加函数后自动出现参数滑动条，可设置最小值、最大值、步长，点击"播放动画"参数按正弦波形自动周期变化，方便观察函数族的整体行为。
- **坐标系自适应单位长度**：预测器和函数系统的坐标系采用 1-2-5 nice unit 刻度策略，根据缩放级别自动选择最接近的标准单位长度（1, 0.5, 0.2, 0.1, 2, 5, 10...），在坐标轴左下角显示，缩放时自动调整，刻度始终保持在 5-10 个主刻度。
- **纯前端实现（零后端 / 零登录 / 零数据收集）**：所有计算、存储、渲染都在浏览器中完成，数据不会离开设备。无用户系统、无登录注册、无服务器日志、无埋点上报，关闭浏览器即销毁（除非用户主动保留）。
- **WebAssembly 加速**（实验性，已修复）：反应扩散模式可选启用 Wasm 加速，采用内联 JS 优化内核方案，无外部 wasm 文件依赖，性能比纯 JS 版本提升 3-5 倍。
- **MCP Server 集成**：附带一个 MCP（Model Context Protocol）服务器（`mcp-server/server.py`），把计算器和预测器封装为 MCP tools，可供 TRAE、Claude Desktop、Cursor 等 MCP 客户端直接调用，让 AI 助手直接使用本站能力。
- **像素风自制弹窗（像素弹窗）**：所有提示、确认、参数输入均使用自制 `.pixel-dialog` 像素弹窗，深空蓝 + 金色边框 + Courier New + 硬阴影，替代浏览器原生 `prompt()` / `alert()`，视觉风格统一。
- **零框架纯原生 JS**：除 p5.js（仅像素艺术生成器使用）外无任何第三方前端框架，所有 JS 采用 ES5 兼容写法 + IIFE 模式，加载快、易调试、可直接在 DevTools Console 中调用全局函数。
- **丰富内容**：内置 8 种像素艺术模式、7 种数学学习卡片、40 种序列预测方法、5 种函数拟合演示（funcfit / overfit / offsetfit + 神经网络 + 回归）、地牢风像素 RPG、4 种迷宫算法、8-bit 音乐合成器，工具数量 20+。

---

## 工具目录

### 学习类 LEARNING

#### 像素数学 PIXEL MATH

数学工具的集合入口，包含三大核心工具：

- **预测系统 PIXEL PREDICTOR**：输入数字序列，使用 40 种数学方法 + 神经网络预测下一个值，支持权重融合、长期训练、回测验证、JSON/CSV 导出。
- **函数系统 PIXEL FUNCTION**：绘制 2D/3D 函数图像，支持参数滑动条、动画播放、鼠标拖拽平移、滚轮缩放、单位长度自动调整。
- **计算器系统 PIXEL CALCULATOR**：像素风计算器，支持四则运算、表达式求值、三角函数、对数、幂运算、括号、常数（pi, e），DEG/RAD 切换，运算步骤展示，历史记录。

#### 像素编程 PIXEL PROGRAMMING

算法可视化工具集合：

- **像素迷宫 PIXEL MAZE**：使用 4 种算法生成迷宫（递归回溯 Recursive Backtracker、Prim、Kruskal、Eller），支持 BFS 最短路径求解动画，可调整行列数和墙壁厚度，可导出为像素图。
- **神经网络可视化 NN VISUALIZER**：可视化神经网络训练过程，实时显示前向/反向传播、权重变化、损失曲线、决策边界，支持 XOR、正弦拟合、分类问题等数据集。

#### 学习系统 LEARNING SYSTEM

数学学习卡片集合，通过动画和互动帮助理解数学概念：

- **四则运算 ARITHMETIC**：加减乘除基础运算，方块阵列动画演示运算过程。
- **混合运算 MIXED ARITHMETIC**：带括号的四则混合运算，演示运算优先级。
- **分数 FRACTION**：分数加减乘除、约分、通分动画。
- **小数 DECIMAL**：小数运算、与分数互转动画。
- **方程 EQUATION**：一元一次/二次方程，天平动画求解。
- **几何 GEOMETRY**：面积/周长/体积公式，互动图形。
- **速算挑战 SPEED CHALLENGE**：60 秒限时答题，本地排行榜。

#### 像素 AI PIXEL AI

AI 聊天工具，支持多种主流大模型。

- **多提供商支持**：9 家提供商 + 自定义 OpenAI 兼容接口
  - OpenAI（GPT-4o、GPT-4o Mini、GPT-4 Turbo、GPT-3.5 Turbo）
  - Anthropic（Claude 3.5 Sonnet、Claude 3 Opus、Claude 3 Haiku）
  - Google Gemini（Gemini 1.5 Pro、Gemini 1.5 Flash、Gemini 1.0 Pro）
  - 通义千问（Qwen Max、Qwen Plus、Qwen Turbo、Qwen Long）
  - 文心一言（ERNIE 4.0、ERNIE 3.5、ERNIE Lite）
  - DeepSeek（DeepSeek Chat、DeepSeek Coder）
  - Mistral（Mistral Large、Mistral Medium、Mistral Small）
  - Groq（Llama 3.3 70B、Mixtral 8x7B、Gemma 7B）
  - 自定义：OpenAI 兼容 API 接口
- **本地存储 API Key**：密钥仅保存在浏览器 localStorage 中，不上传任何服务器
- **Token 消耗统计**：每条消息显示输入/输出/总计 Token，以及会话累计
- **消息历史**：单次会话内保留对话记录
- **双语界面**：完整中英文界面
- **清空对话**：一键清空所有消息

### 艺术类 ART

#### 像素图画 PIXEL DRAWING

- **像素艺术生成器 PIXEL ART**：基于种子化随机算法生成像素艺术，8 种艺术模式（流场 Flow Field、粒子系统 Particles、几何马赛克 Mosaic、螺旋 Spiral、分形树 Fractal Tree、Voronoi 镶嵌、波干涉 Wave、反应扩散 Reaction-Diffusion），可调整分辨率、密度、色相、递归深度等参数，支持动画播放和 PNG 导出。相同种子 + 相同参数 = 相同图像，方便复现。
- **像素绘图编辑器 PIXEL DRAWING EDITOR**：逐像素手绘创作，支持画笔、橡皮、填充、吸管、直线、矩形、圆形等工具，多图层操作，NES / GameBoy / CGA 复古调色板 + 自定义颜色，可调整画布尺寸，导出 PNG。画布 CSS 显示尺寸从 max-width 512px 增大到 768px，逻辑像素档位（16 / 32 / 64 / 128）不变，创作体验更清晰。

#### 像素音乐 PIXEL MUSIC

- **像素音乐合成器 PIXEL MUSIC SYNTH**：8-bit 芯片音乐创作工具，多音轨序列编辑器（旋律、贝斯、鼓点），方波 / 三角波 / 锯齿波 / 噪声等音色，可调 BPM，钢琴键盘输入，示波器可视化，导出 WAV。

### 沙盒类 SANDBOX

- **物理模拟器 PHYSICS SANDBOX**：像素风 2D 物理沙盒，类似 Falling Sand Game。精简为 3 种物质（橡皮 EMPTY / 水 WATER / 氢气 HYDROGEN），水的下落 + 横向流动物理性质完整保留。新增氢气：向上飘（与重力相反），可穿过水上升，默认不可见。新增"气体"按钮：点击切换氢气可见/不可见（可见时呈半透明淡蓝色），可调整笔刷大小，播放/暂停控制。
- **AI 图像像素化 IMAGE PIXELIZER**：上传任意图片，自动转换为像素风格。可调整像素块大小、调色板（NES / GameBoy / CGA / 自定义）、颜色数量，实时预览，下载像素化图片。所有处理纯前端完成，图片不上传服务器。

### 工具类 TOOLS

- **像素时钟 PIXEL CLOCK**：复古像素风时钟、日历和番茄钟工具。
  - 数字时钟：实时显示当前时间，多种像素字体风格。
  - 日历：月历视图，可点击日期添加事件标记。
  - 番茄钟：25 分钟工作 + 5 分钟休息循环，提高专注力。

### 娱乐类 ENTERTAINMENT

- **像素 RPG PIXEL RPG**：像素 RPG 地牢迷宫探险——戴面具黑衣人闯关，回合制战斗，墙上火把照亮前路，史莱姆为主要怪物，向下走廊通往下一层。
  - 方向键 / WASD 控制角色在地牢中移动，也可点击/触摸地图任意可移动格子自动导航。
  - 点击地图自动导航（BFS 寻路）：点击/触摸地图任意可移动格子，玩家沿 BFS 最短路径自动逐格移动。支持手机触屏和电脑鼠标，点击怪物寻路到相邻格自动攻击，路径遇怪物挡路时停下让玩家抉择。
  - **Wiki 百科**：点击查看游戏文档（HP/EXP/ATK/DEF 含义、操作指南、物品图鉴、怪物机制）。
  - **层数系统**：地牢以层数计算，进入出口进入下一层。
  - **7 槽位装备系统**：左手、右手、头部、身体、腿、脚、饰品，共 7 个装备槽位。
  - **8 种物品**：木剑、恢复药水I、皮盔、皮甲、皮护腿、皮靴、经验宝石I、攻击戒指，每种物品有独特的像素画图标（canvas 绘制）。
  - **物品栏交互**：点击物品格选中并查看详情（属性/描述），消耗品可使用，装备可穿戴/卸下；点击两个格子可交换物品；点击外部取消选中。
  - 走廊墙上的火把照亮视野，营造昏暗地牢氛围。
  - 遇到史莱姆等敌人进入回合制战斗，可选择攻击、技能、道具等指令。
  - 击败敌人获得经验值，升级提升属性。宝箱掉落随机物品。
  - 8-bit 音效。

---

## 预测系统 40 种方法

预测系统（PIXEL PREDICTOR）内置 40 种数学预测方法，按权重融合给出最终预测结果。所有方法均在客户端计算，无任何后端调用。

| # | ID | 方法名 | 说明 |
|---|----|--------|------|
| 1 | `naive` | 朴素法 Naive | 用最后一个值作为预测 |
| 2 | `seasonal_naive` | 季节朴素法 Seasonal Naive | 用上一个周期的值 |
| 3 | `drift` | 漂移法 Drift | 在朴素法基础上加平均变化趋势 |
| 4 | `mean` | 简单平均 Mean | 所有序列值的平均 |
| 5 | `median` | 中位数 Median | 所有序列值的中位数 |
| 6 | `sma` | 简单移动平均 SMA | 简单移动平均 |
| 7 | `wma` | 加权移动平均 WMA | 加权移动平均（近期权重更高） |
| 8 | `ses` | 简单指数平滑 SES | 简单指数平滑 |
| 9 | `holt` | 二次指数平滑 Holt Linear | Holt 线性趋势法 |
| 10 | `holt_winters` | 三次指数平滑 Holt-Winters | Holt-Winters 季节趋势法 |
| 11 | `linear` | 线性回归 Linear | 最小二乘线性回归 |
| 12 | `poly2` | 二次多项式回归 Poly2 | 二次多项式拟合 |
| 13 | `poly3` | 三次多项式回归 Poly3 | 三次多项式拟合 |
| 14 | `ar1` | 自回归 AR(1) | 一阶自回归 |
| 15 | `ar2` | 自回归 AR(2) | 二阶自回归 |
| 16 | `geometric` | 几何增长 Geometric | 几何级数增长 |
| 17 | `diff1` | 一阶差分外推 Diff1 | 一阶差分外推 |
| 18 | `diff2` | 二阶差分外推 Diff2 | 二阶差分外推 |
| 19 | `fibonacci` | Fibonacci 黄金比率 | Fibonacci 黄金比率 |
| 20 | `fourier` | 傅里叶外推 Fourier | 傅里叶级数外推 |
| 21 | `seasonal_naive3` | 季节朴素3 Seasonal Naive(3) | 周期为 3 的季节朴素 |
| 22 | `exp_smooth_03` | 指数平滑(α=0.3) SES-0.3 | α=0.3 的指数平滑 |
| 23 | `exp_smooth_07` | 指数平滑(α=0.7) SES-0.7 | α=0.7 的指数平滑 |
| 24 | `sma5` | 5点移动平均 SMA-5 | 5 点简单移动平均 |
| 25 | `poly4` | 四次多项式回归 Poly4 | 四次多项式拟合 |
| 26 | `ar3` | 自回归 AR(3) | 三阶自回归 |
| 27 | `harmonic_mean` | 调和平均 Harmonic Mean | 调和平均数 |
| 28 | `cagr` | 复合增长率 CAGR | 复合年均增长率 |
| 29 | `log_linear` | 对数线性回归 Log-Linear | 对数变换后线性回归 |
| 30 | `weighted_last` | 末尾加权平均 Weighted-Last | 末尾加权平均 |
| 31 | `diff_extrap` | 差分外推 Diff Extrap | 差分外推 |
| 32 | `weighted_median` | 加权中位数 Weighted Median | 加权中位数 |
| 33 | `recursive_avg` | 递推平均 Recursive Avg | 递推平均 |
| 34 | `sign_preserving` | 符号守恒 Sign-Preserving | 符号守恒预测 |
| 35 | `second_order` | 二阶趋势 Second Order | 二阶趋势外推 |
| 36 | `moving_median` | 移动中位数 Moving Median | 移动中位数 |
| 37 | `triple_smooth` | 三次平滑 Triple Smooth | 三次平滑 |
| 38 | `symmetric_proj` | 对称投影 Symmetric Proj | 对称投影 |
| 39 | `ratio_diff` | 比值差分 Ratio Diff | 比值差分 |
| 40 | `abs_log_linear` | 绝对值对数线性 Abs Log-Lin | 绝对值对数线性 |

此外还有 **神经网络预测**（独立，不参与融合）、**过拟合算法**（独立，不参与融合）、**偏移算法**（独立，不参与融合）、**函数拟合**（带 R² 评估）。

权重模式支持：
- **回测权重**：留一回测 MAPE 反归一化权重，误差越低权重越高。
- **均匀权重**：所有方法权重相等。

---

## 技术栈

- **原生 JavaScript**：无任何前端框架（React / Vue / Angular），仅使用 ES5 兼容写法以保证最大兼容性。
- **Canvas 2D API**：所有绘图（图表、函数、像素艺术、物理模拟）均使用 Canvas 2D API。
- **Web Audio API**：像素音乐合成器使用 Web Audio API 实时合成 8-bit 音色。
- **Service Worker + Cache API**：PWA 离线缓存，使用 Network-First 策略确保用户拿到最新版本。
- **CSS Variables**：统一的色板和设计 token 管理。
- **p5.js**（仅像素艺术生成器使用）：作为绘图辅助库。
- **WebAssembly**（实验性）：反应扩散模式的 Wasm 加速版本，由 Emscripten 编译 C 源码生成。
- **localStorage**：保存用户设置（昵称、头像、背景、语言、分类折叠状态、最近使用、速算排行榜等）。用户信息（昵称、头像、背景）从 sessionStorage 改为 localStorage 持久化保存，关闭浏览器后仍保留；同时设置 cookie `pixel_user_session`（max-age 一年）作为已注册标记。
- **IndexedDB / Blob URL**：保存头像和背景图片（base64 直接存 localStorage 会超限）。
- **GitHub Actions**：自动部署到 GitHub Pages。

---

## 项目结构

```
pixel-tools/
├── index.html                  # 主页面（包含所有页面 div，通过 hidden 类切换）
├── styles/
│   └── pixel.css               # 全局样式（CSS Variables + 像素风组件）
├── js/
│   ├── app.js                  # 主应用逻辑（页面切换、历史栈、首页增强、教程系统）
│   ├── i18n.js                 # 国际化（中英文双语，含每页专属教程内容）
│   ├── mouse-trails.js         # 鼠标拖拽粒子特效（最顶层 canvas，pointer-events: none）
│   ├── expression-parser.js    # 表达式解析（AST，用于计算器和函数系统）
│   ├── predictors.js           # 40 种序列预测方法
│   ├── weights.js              # 权重计算 + 回测（backtest / computeWeights / ensemblePredict）
│   ├── nn.js                   # 神经网络（含增量训练、长期训练模式）
│   ├── funcfit.js              # 函数拟合（带 R² 评估）
│   ├── overfit.js              # 过拟合算法（独立，不参与融合）
│   ├── offsetfit.js            # 偏移算法（独立，不参与融合）
│   ├── chart.js                # 折线图 + 权重条形图（自制像素风滚动条 + 缩放按钮）
│   ├── function-plotter.js     # 2D 函数绘制（坐标系、单位长度、参数滑动条、动画）
│   ├── function-3d.js          # 3D 函数渲染（z=f(x,y)，鼠标旋转视角）
│   ├── math-cards.js           # 数学学习卡片（四则运算 + 混合运算）
│   ├── math-cards-ext.js       # 数学卡片扩展（分数 / 小数 / 方程 / 几何 / 速算）
│   ├── maze-generator.js       # 迷宫生成器（4 种算法 + BFS 求解动画）
│   ├── nn-visualizer.js        # 神经网络可视化（前向/反向传播、损失曲线、决策边界）
│   ├── pixel-art.js            # 像素艺术生成器（8 种艺术模式，依赖 p5.js）
│   ├── pixel-drawing-editor.js # 像素绘图编辑器（多图层 + 调色板 + 工具栏）
│   ├── pixel-music.js          # 像素音乐合成器（Web Audio API + 音序器 + 示波器）
│   ├── physics-sandbox.js      # 物理模拟器（Falling Sand 风格，元素互动）
│   ├── image-pixelizer.js      # 图像像素化（调色板量化 + 颜色限制）
│   ├── pixel-clock.js          # 像素时钟（时钟 + 日历 + 番茄钟）
│   ├── pixel-rpg.js            # 像素 RPG（回合制战斗 + 升级）
│   └── pixel-ai.js             # 像素 AI 聊天（9 家大模型、Token 统计、双语）
├── wasm/
│   ├── reaction-diffusion.c    # 反应扩散 C 源码（Gray-Scott 模型）
│   └── build.sh                # Emscripten 编译脚本
├── mcp-server/                 # MCP Server（FastMCP + Python）
│   ├── server.py               # 主服务（calculate / predict_sequence / list_predictors）
│   ├── requirements.txt        # 依赖（mcp）
│   └── README.md               # MCP Server 文档
├── icons/
│   ├── icon-192.png            # PWA 图标 192px
│   └── icon-512.png            # PWA 图标 512px
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署到 Pages
├── service-worker.js           # PWA Service Worker（Network-First 策略）
├── manifest.json               # PWA Manifest
├── .gitignore
└── README.md                   # 本文档
```

---

## 文件清单

逐一说明每个源码文件的用途、关键函数与依赖关系，方便贡献者快速定位代码。

### 根目录文件

#### `index.html`
- **用途**：主入口 HTML，包含网站所有页面的 DOM 结构。通过 `<div class="page" id="xxx-page">` 定义每个工具页面，使用 `hidden` 类切换显示。同步加载 `js/i18n.js`、`js/mouse-trails.js` 等全局脚本，以及各工具专属脚本。
- **关键内容**：首页 landing-page、5 个分类入口、20+ 工具页面 div、设置页、教程模态框、Toast 容器、鼠标粒子 canvas。
- **依赖**：所有 `js/*.js`、`styles/pixel.css`、`manifest.json`、`service-worker.js`。

#### `service-worker.js`
- **用途**：PWA Service Worker，负责离线缓存与版本管理。采用 Network-First 策略，确保用户每次刷新都能拿到最新版本，离线时回退缓存。
- **关键函数 / 事件**：`install`（预缓存关键资源 + `skipWaiting`）、`activate`（删除旧缓存 + `clients.claim` + 通知 `SW_UPDATED`）、`fetch`（按资源类型路由策略）。
- **依赖**：`CACHE_VERSION` 常量、`CACHE_NAME`、`PRECACHE_URLS` 列表。

#### `manifest.json`
- **用途**：PWA 清单，声明应用名称、图标、主题色、显示模式等，使网站可被浏览器识别为可安装 PWA 应用。
- **关键字段**：`name`、`short_name`、`icons`（192/512px）、`theme_color`（深空蓝）、`background_color`、`display: standalone`、`start_url`。
- **依赖**：`icons/icon-192.png`、`icons/icon-512.png`。

### `js/` 目录

#### `js/app.js`
- **用途**：主应用入口，统筹页面切换、历史栈、首页增强、设置页、参数面板、计算器、教程系统、Toast 提示等。是整个项目的"控制中心"。
- **关键函数**：`navigateTo(pageId)`（页面切换 + 历史栈）、`goBack()`（ESC 返回上一级）、`showToast(msg)`（自制像素风 Toast）、`showTutorial(pageId)`（弹出该页教程）、`initSettings()`（设置面板初始化）、`initApp()`（应用入口）。
- **依赖**：`js/i18n.js`（翻译）、`js/mouse-trails.js`（粒子）、`js/predictors.js` + `js/weights.js` + `js/chart.js`（预测系统组合）、`js/expression-parser.js`（计算器）、`js/function-plotter.js`（函数系统）。

#### `js/i18n.js`
- **用途**：国际化模块，包含中英文翻译表 + 翻译函数。所有 `data-i18n` 标注的元素会自动更新；翻译表还包含每个页面的专属教程内容。
- **关键函数**：`i18n.t(key, params)`（带参数插值）、`i18n.setMode(mode)`（切换 `auto`/`zh`/`en`）、`i18n.apply()`（批量更新 DOM）、`i18n.getMode()`。
- **依赖**：无外部依赖，监听 `languagechange` 事件供其他组件响应。

#### `js/mouse-trails.js`
- **用途**：鼠标拖拽粒子特效，在鼠标轨迹上生成像素风粒子拖尾，带重力、衰减、淡出效果。位于最顶层 `z-index: 99999` 但 `pointer-events: none`，不遮挡交互。
- **关键函数**：`initMouseTrails()`、`spawnParticle(x, y)`、`updateParticles()`（`requestAnimationFrame` 循环）、`resizeCanvas()`。
- **依赖**：`#mouse-trails-canvas` DOM 元素（由 `index.html` 提供）。

#### `js/pixel-art.js`
- **用途**：像素艺术生成器，8 种艺术模式（流场、粒子、马赛克、螺旋、分形树、Voronoi、波干涉、反应扩散），种子化随机确保可复现，可选启用 Wasm 加速内核。
- **关键函数**：`setup()` / `draw()`（p5.js 生命周期）、`generateFlowField()`、`generateReactionDiffusion()`、`loadWasmModule()`（初始化内联 JS 优化内核）、`exportPNG()`。
- **依赖**：p5.js（CDN 加载）、`js/i18n.js`。

#### `js/pixel-drawing-editor.js`
- **用途**：像素绘图编辑器，逐像素手绘创作。支持画笔、橡皮、填充、吸管、直线、矩形、圆形等工具，多图层操作，NES / GameBoy / CGA 复古调色板 + 自定义颜色。
- **关键函数**：`initDrawingEditor()`、`setTool(tool)`、`drawPixel(x, y, color)`、`floodFill()`、`mergeLayers()`、`exportPNG()`。
- **依赖**：Canvas 2D API、`js/i18n.js`。

#### `js/pixel-music.js`
- **用途**：像素音乐合成器，8-bit 芯片音乐创作工具。多音轨序列编辑器（旋律、贝斯、鼓点），方波 / 三角波 / 锯齿波 / 噪声等音色，可调 BPM，钢琴键盘输入，示波器可视化，导出 WAV。
- **关键函数**：`initMusicSynth()`、`playNote(freq, duration)`、`playSequence()`、`renderOscilloscope()`、`exportWAV()`。
- **依赖**：Web Audio API、`js/i18n.js`。

#### `js/expression-parser.js`
- **用途**：表达式解析器，把字符串表达式解析为 AST 并求值。同时支持提取函数中的参数符号，是计算器和函数系统的公共基础设施。
- **关键函数**：`parseExpression(str)`（返回 AST 根节点）、`evaluateAST(node, scope)`（按作用域求值）、`extractVariables(node)`（提取参数符号，过滤保留字 `x`/`pi`/`e`/`sin`/`cos`/`tan`/`log`/`sqrt`/`abs`/`exp`/`ln`）、`tokenize(str)`。
- **依赖**：无外部依赖，纯算法实现。

#### `js/function-plotter.js`
- **用途**：函数系统 2D 绘图引擎，绘制 `y=f(x, a, b, c...)`。包含坐标系渲染、1-2-5 nice unit 刻度、滚轮缩放、拖拽平移、参数滑动条、动画播放。
- **关键函数**：`drawAxes()`、`plotFunction(fn, params)`、`zoomCanvas(factor)`、`panCanvas(dx, dy)`、`startAnimation()`（参数按正弦波周期变化）、`addFunction(expr)`。
- **依赖**：`js/expression-parser.js`、Canvas 2D API、`js/i18n.js`。

#### `js/function-3d.js`
- **用途**：函数系统 3D 绘图，绘制 `z=f(x, y)` 曲面。鼠标拖拽旋转视角，滚轮缩放，支持参数化。
- **关键函数**：`init3D()`、`drawSurface()`、`rotateView(dx, dy)`、`project3D(x, y, z)`。
- **依赖**：`js/expression-parser.js`、Canvas 2D API。

#### `js/chart.js`
- **用途**：预测系统折线图 + 权重条形图渲染引擎。自适应刻度、滚轮缩放、拖拽平移、自制像素风滚动条与缩放按钮。
- **关键函数**：`setupCanvas()`、`drawLineChart(series, predictions)`、`drawWeightBars(weights, labels)`、`computeNiceUnit(range)`（1-2-5 刻度算法）、`zoomChart(factor)`。
- **依赖**：Canvas 2D API、`js/i18n.js`。

#### `js/predictors.js`
- **用途**：40 种序列预测方法的实现集合，是预测系统的算法核心。覆盖朴素法、移动平均、指数平滑、回归、自回归、傅里叶、差分外推等。
- **关键函数**：`predict_naive(series)`、`predict_sma(series, window)`、`predict_ses(series, alpha)`、`predict_holt_winters(series, ...)`、`predict_poly2()` / `predict_poly3()` / `predict_poly4()`、`predict_fourier()`、`predict_ar1()` / `predict_ar2()` / `predict_ar3()`，以及统一的 `predictors` 数组（每项含 `id` / `name` / `fn`）。
- **依赖**：纯算法，无外部依赖。

#### `js/weights.js`
- **用途**：预测权重计算与回测。基于留一回测 MAPE 反归一化得到每种方法的权重，再做多方法融合预测。
- **关键函数**：`backtest(series, predictorFn)`（留一回测 → MAPE）、`computeWeights(series, predictors)`（反归一化权重）、`uniformWeights(n)`、`ensemblePredict(series, predictors, weights, steps)`（融合预测）、`computeMethodStats()`。
- **依赖**：`js/predictors.js`。

#### `js/nn.js`
- **用途**：神经网络预测实现，含增量训练与长期训练模式。独立于 40 种方法之外，不参与融合，作为对照展示。
- **关键函数**：`trainNN(series, options)`、`predictNN(model, steps)`、`forwardPass()`、`backwardPass()`、`saveModel()` / `loadModel()`。
- **依赖**：纯 JS 矩阵运算，无第三方库。

#### `js/nn-visualizer.js`
- **用途**：神经网络可视化工具，实时显示前向 / 反向传播、权重变化、损失曲线、决策边界，支持 XOR、正弦拟合、分类等数据集。
- **关键函数**：`initVisualizer()`、`drawNetwork()`、`drawDecisionBoundary()`、`trainStep()`、`drawLossCurve()`。
- **依赖**：Canvas 2D API、`js/nn.js`（共用训练逻辑）。

#### `js/funcfit.js`
- **用途**：函数拟合演示模块，对输入序列做多项式 / 指数 / 对数等拟合，并计算 R² 评估拟合优度。
- **关键函数**：`fitPolynomial(series, degree)`、`computeR2(series, fitFn)`、`drawFitCurve()`、`evaluateFit(x)`。
- **依赖**：Canvas 2D API、`js/chart.js`（共用绘图）。

#### `js/overfit.js`
- **用途**：过拟合演示模块，独立运行不参与融合。展示高阶多项式在训练点上完美拟合但泛化能力差的现象。
- **关键函数**：`fitHighOrder(series, degree)`、`drawOverfitCurve()`、`computeGeneralizationError()`。
- **依赖**：Canvas 2D API、`js/chart.js`。

#### `js/offsetfit.js`
- **用途**：偏移拟合演示模块，独立运行不参与融合。尝试在每种基础方法上叠加常数偏移，寻找最佳修正项。
- **关键函数**：`fitWithOffset(series, predictorFn)`、`findBestOffset()`、`drawOffsetCurve()`。
- **依赖**：`js/predictors.js`、Canvas 2D API。

#### `js/math-cards.js`
- **用途**：数学学习卡片主模块，覆盖四则运算 + 混合运算。通过方块阵列动画、运算步骤展示帮助理解基础概念。
- **关键函数**：`initArithmeticCard()`、`initMixedArithmeticCard()`、`renderBlockAnimation()`、`checkAnswer()`。
- **依赖**：Canvas 2D API、`js/i18n.js`。

#### `js/math-cards-ext.js`
- **用途**：数学学习卡片扩展模块，覆盖分数、小数、方程、几何、速算挑战 5 种卡片。
- **关键函数**：`initFractionCard()`、`initDecimalCard()`、`initEquationCard()`、`initGeometryCard()`、`initSpeedChallenge()`（含 60 秒计时 + 本地排行榜）。
- **依赖**：Canvas 2D API、`js/i18n.js`、`localStorage`（速算排行榜）。

#### `js/maze-generator.js`
- **用途**：迷宫生成器，支持 4 种算法（递归回溯、Prim、Kruskal、Eller），可调行列数和墙壁厚度，BFS 最短路径求解动画，导出像素图。
- **关键函数**：`generateMaze(rows, cols, algorithm)`、`solveBFS(maze, start, end)`、`drawMaze()`、`animateSolution(path)`、`exportMazePNG()`。
- **依赖**：Canvas 2D API、`js/i18n.js`。

#### `js/physics-sandbox.js`
- **用途**：物理沙盒模拟器，类似 Falling Sand Game。精简为 3 种物质（橡皮 EMPTY / 水 WATER / 氢气 HYDROGEN），水的下落 + 横向流动物理性质完整保留；新增氢气向上飘（与重力相反）、可穿过水上升、默认不可见；新增"气体"按钮切换氢气可见/不可见（可见时呈半透明淡蓝色）。
- **关键函数**：`initPhysicsSandbox()`、`step()`（每帧更新网格）、`paintCell(x, y, element)`、`interactCells()`、`setBrushSize(n)`、`toggleGasVisibility()`（切换氢气可见性）。
- **依赖**：Canvas 2D API、`js/i18n.js`。

#### `js/image-pixelizer.js`
- **用途**：AI 图像像素化工具，上传图片自动转换为像素风。可调像素块大小、调色板（NES / GameBoy / CGA / 自定义）、颜色数量，实时预览，下载像素化图片。所有处理纯前端完成。
- **关键函数**：`handleImageUpload(file)`、`pixelizeImage(img, blockSize, palette)`、`applyPalette(colors, palette)`、`exportPixelizedPNG()`。
- **依赖**：Canvas 2D API、`URL.createObjectURL`、`js/i18n.js`。

#### `js/pixel-clock.js`
- **用途**：像素时钟工具，包含数字时钟、月历视图、番茄钟三种模式。
- **关键函数**：`initClock()`、`renderDigitalClock()`、`renderCalendar()`、`startPomodoro()`（25 分钟工作 + 5 分钟休息循环）、`addCalendarEvent(date, label)`。
- **依赖**：Canvas 2D API、`js/i18n.js`、`localStorage`（事件标记）。

#### `js/pixel-rpg.js`
- **用途**：像素 RPG 地牢迷宫探险小游戏。戴面具黑衣人闯关，回合制战斗，墙上火把照亮前路，史莱姆为主要怪物，向下走廊通往下一层。支持点击/触摸地图任意可移动格子，玩家沿 BFS 最短路径自动逐格移动（兼容触屏与鼠标 pointerdown 事件），键盘操作可中断自动导航。
- **关键函数**：`initRPG()`、`generateDungeon(level)`、`handlePlayerMove(dx, dy)`、`findPathBFS(start, end)`（BFS 寻路）、`autoNavigate(path)`（自动逐格移动）、`startBattle(enemy)`、`takeTurn(action)`、`nextFloor()`。
- **依赖**：Canvas 2D API、Web Audio API（8-bit 音效）、`js/i18n.js`。

### `styles/` 目录

#### `styles/pixel.css`
- **用途**：全局样式表，定义所有像素风视觉规范。包含 CSS Variables 设计 token（色板、间距、字体）、按钮 / 输入框 / 面板 / 弹窗 / Toast / 教程模态框 / 滚动条等组件样式、响应式断点、`prefers-reduced-motion` 适配、`focus-visible` 焦点样式。
- **关键选择器**：`:root`（CSS Variables）、`.pixel-btn`、`.pixel-input`、`.pixel-dialog`、`.tutorial-btn`、`.toast`、`canvas`（全局 canvas 重置规则）、`#mouse-trails-canvas`（粒子 canvas 例外）。
- **依赖**：被 `index.html` 直接 `<link>` 引入。

### `wasm/` 目录

#### `wasm/reaction-diffusion.c`
- **用途**：Gray-Scott 反应扩散模型的 C 源码，原本用于通过 Emscripten 编译为 WebAssembly 加速反应扩散模式。当前已切换为内联 JS 优化内核方案，此源码作为算法参考保留。
- **关键函数**：`simulate_step(u, v, du, dv, width, height, params)`（单步迭代）、`init_grid()`。
- **依赖**：标准 C 库；编译产物曾输出到 `js/reaction_diffusion.wasm`。

#### `wasm/build.sh`
- **用途**：Emscripten 编译脚本，调用 `emcc` 把 `reaction-diffusion.c` 编译为 WebAssembly 模块。当前作为可选编译路径保留，运行时不再依赖编译产物。
- **关键命令**：`emcc reaction-diffusion.c -O3 -s WASM=1 -o ../js/reaction_diffusion.wasm ...`。
- **依赖**：Emscripten SDK（emsdk）。

### `mcp-server/` 目录

#### `mcp-server/server.py`
- **用途**：MCP（Model Context Protocol）服务器，把网站的计算器和预测器封装为 MCP tools，可供 TRAE、Claude Desktop、Cursor 等 MCP 客户端直接调用，让 AI 助手远程使用本站能力。
- **关键函数 / Tools**：`calculate(expression, angle_mode?)`（受限 `eval` + 字符白名单）、`predict_sequence(series, count?, weight_mode?)`（4 种基础方法融合）、`list_predictors()`（列出可用预测方法）。
- **依赖**：FastMCP（`mcp` 包，见 `requirements.txt`）、Python 标准库 `math`。

#### `mcp-server/requirements.txt`
- **用途**：Python 依赖清单，记录 MCP Server 运行所需 pip 包。
- **关键内容**：`mcp>=1.x`（FastMCP SDK）。
- **依赖**：通过 `pip install -r requirements.txt` 安装。

#### `mcp-server/README.md`
- **用途**：MCP Server 专属文档，说明安装、配置、与各 MCP 客户端（TRAE / Claude Desktop / Cursor）的接入方式。
- **关键内容**：安装命令、客户端配置 JSON 示例、安全说明。
- **依赖**：引用 `server.py` 暴露的 tools。

---

## 本地开发

本项目是纯静态网站，无需构建步骤，用任意静态服务器打开即可。

```bash
# 1. 克隆仓库
git clone https://github.com/xiaozhenweiyan/pixel-tools.git
cd pixel-tools

# 2. 启动静态服务器（任选其一）

# 方式 A：Python 3
python3 -m http.server 8000

# 方式 B：Node.js（需先 npm i -g serve）
serve -p 8000

# 方式 C：VS Code Live Server 扩展（右键 index.html → Open with Live Server）

# 3. 在浏览器访问
# http://localhost:8000
```

> **重要**：必须通过 `http://localhost` 访问，不能直接用 `file://` 协议打开。原因：
> 1. Service Worker 只能在 `http://` 或 `https://` 协议下注册。
> 2. 部分浏览器限制 `file://` 协议下的 `localStorage` 和 ES Module。
> 3. p5.js 等 CDN 资源在 `file://` 下可能加载失败。

### 修改与调试

- 所有 JS 都是 IIFE 模式，挂载到 `window` 全局，可直接在浏览器 DevTools Console 中调用。
- 修改 CSS 后无需刷新（部分浏览器支持热重载），修改 JS 需要刷新页面。
- Service Worker 修改后需要关闭所有标签页再重新打开，或在新 SW 激活后刷新一次（已在 `service-worker.js` 中通过 `skipWaiting` + `clients.claim` 自动处理）。
- 调试 Service Worker：Chrome DevTools → Application → Service Workers → 勾选 "Update on reload"。

---

## 部署到 GitHub Pages

本项目通过 GitHub Actions 自动部署，每次推送到 `main` 分支会触发部署。

### 自动部署配置

`.github/workflows/deploy.yml` 配置如下：

- **触发条件**：push 到 `main` 分支，或手动 workflow_dispatch。
- **权限**：`pages: write` + `id-token: write`（GitHub Pages 部署所需）。
- **并发控制**：`group: pages`，新部署会取消正在进行的旧部署。
- **步骤**：checkout → configure-pages → upload-artifact（path: `.`）→ deploy-pages。

### 手动部署

如果想手动部署到自己的 GitHub Pages：

1. Fork 本仓库。
2. 进入仓库 Settings → Pages → Source：选 "GitHub Actions"。
3. 推送代码到 `main` 分支，等待 Actions 完成即可访问 `https://<你的用户名>.github.io/pixel-tools/`。

### 自定义域名

如需使用自定义域名，在仓库根目录添加 `CNAME` 文件（内容为域名），并在 DNS 服务商配置 CNAME 记录指向 `<用户名>.github.io`。

---

## PWA 与 Service Worker 策略

`service-worker.js` 使用 **Network-First** 策略，确保用户每次刷新都能拿到最新版本：

| 资源类型 | 策略 | 说明 |
|---------|------|------|
| HTML 文档 | Network-First | 优先网络，离线时回退缓存 |
| JS / CSS / 图片 | Network-First | 优先网络，避免 SWR 导致刷新两次才生效 |
| 第三方 CDN（p5.js） | Cache-First | 跨域资源缓存优先，离线兜底 |

### 缓存版本管理

每次部署后必须升级 `CACHE_VERSION`（当前 `v13`），新 SW 激活时会自动删除所有旧版本缓存：

```javascript
const CACHE_VERSION = 'v13';
const CACHE_NAME = 'pixel-tools-' + CACHE_VERSION;
```

### SW 更新流程

1. 浏览器检测到 `service-worker.js` 字节变化，后台下载新版本。
2. 新 SW 安装（`install` 事件）→ 预缓存关键资源 → `self.skipWaiting()` 立即接管。
3. 新 SW 激活（`activate` 事件）→ 删除所有旧缓存 → `self.clients.claim()` 立即控制所有客户端 → 通知所有客户端 `SW_UPDATED`。
4. 客户端收到 `SW_UPDATED` 消息后可提示用户刷新（部分页面会自动刷新）。

### 调试 Service Worker

- Chrome DevTools → Application → Service Workers
- 勾选 "Update on reload"：每次刷新都重新下载 SW。
- 勾选 "Bypass for network"：临时绕过 SW（用于排查问题）。
- "Unregister"：注销 SW（用于彻底重置）。

---

## 国际化（i18n）

`js/i18n.js` 实现完整的中英文双语系统，全站所有用户可见文本（按钮、标签、提示、错误信息、教程）均已接入 i18n 系统：

- **三种模式**：`auto`（跟随系统）/ `zh`（中文）/ `en`（英文），保存到 `localStorage`。
- **翻译函数**：`i18n.t(key, params)`，支持参数插值（如 `t('toast_welcome', { name: '访客' })` → `欢迎你，访客！`）。
- **自动应用**：支持 `data-i18n`/`data-i18n-title`/`data-i18n-aria-label` 属性自动更新。所有带 `data-i18n` 属性的元素会自动更新 `innerHTML`，带 `data-i18n-placeholder` 的元素更新 `placeholder`。
- **实时切换**：调用 `i18n.setMode('en')` 立即更新所有 DOM，无需刷新（部分页面如 Service Worker 缓存的页面可能需要手动刷新）。
- **自定义事件**：切换语言时触发 `languagechange` 事件，组件可监听此事件做额外处理。
- **回退机制**：找不到 key 时返回 key 本身，并在 Console 警告。

### 添加新翻译

1. 在 `js/i18n.js` 的 `translations.zh` 和 `translations.en` 中同时添加 key。
2. 在 HTML 中给元素加 `data-i18n="key"`（替换 innerHTML）或 `data-i18n-placeholder="key"`（替换 placeholder）。
3. 在 JS 中通过 `i18n.t('key')` 获取翻译。

> **注意**：含连字符的 key（如 `tutorial_app-landing`）必须用引号括起来：`'tutorial_app-landing': '...'`，否则 JS 会把 `-` 解析为减号导致语法错误。

---

## 教程系统

每个页面都有专属教程模态框，点击"教程"按钮即可弹出该页面的使用说明（基本操作、参数说明、技巧等）。

### 按钮位置（按页面类型区分）

- **首页（`app-landing-page`）**：教程按钮位于视口 **右上角**，小尺寸，仅容纳"教程"二字，避免遮挡首页顶部 banner。
- **其他子页面**：教程按钮位于视口 **底部居中**（`position: fixed; bottom: 20px`），宽度 400px，方便用户随时点击。
- **自动隐藏**：进入子页面后首页教程按钮会自动隐藏（受 `hideAllPages()` 控制），返回首页时重新出现。

### 实现细节

- **按钮位置（CSS）**：`position: fixed` 确保按钮始终在视口内，不受页面滚动影响。首页与子页面通过不同的 class 区分位置和尺寸。
- **按钮位置（DOM）**：按钮放在对应页面 `<div>` 内部（`</div>` 之前），确保 `hideAllPages()` 隐藏页面时按钮也被隐藏。
- **专属内容**：每个页面的教程内容都是该页面专属的，根据 `data-page` 属性查找 i18n key（如 `app-landing-page` → `tutorial_app-landing`）。
- **回退兜底**：找不到专属教程时显示通用 `tutorial_fallback` 内容。
- **模态框**：点击遮罩、按 ESC、点击 × 按钮均可关闭，关闭时恢复 `body` 滚动。
- **层级**：教程按钮 `z-index: 9000`，教程模态框 `z-index: 10001`，鼠标拖拽粒子 `z-index: 99999`。

### 教程 key 命名规则

页面 ID 去掉 `-page` 后缀，加 `tutorial_` 前缀：

| 页面 ID | i18n key |
|---------|----------|
| `app-landing-page` | `tutorial_app-landing` |
| `landing-page` | `tutorial_landing` |
| `learning-landing-page` | `tutorial_learning-landing` |
| `pixel-programming-landing-page` | `tutorial_pixel-programming-landing` |
| `predictor-page` | `tutorial_predictor` |
| `function-page` | `tutorial_function` |
| `calculator-page` | `tutorial_calculator` |
| `pixel-art-page` | `tutorial_pixel_art` |
| `pixel-drawing-page` | `tutorial_pixel_draw` |
| `pixel-music-page` | `tutorial_pixel_music` |
| `arithmetic-page` | `tutorial_arithmetic` |
| `mixed-arithmetic-page` | `tutorial_mixed-arithmetic` |
| `fraction-page` | `tutorial_fraction` |
| `decimal-page` | `tutorial_decimal` |
| `equation-page` | `tutorial_equation` |
| `geometry-page` | `tutorial_geometry` |
| `speed-page` | `tutorial_speed` |
| `maze-page` | `tutorial_maze` |
| `nn-visualizer-page` | `tutorial_nn-visualizer` |
| `physics-page` | `tutorial_physics` |
| `pixelizer-page` | `tutorial_pixelizer` |
| `clock-page` | `tutorial_clock` |
| `rpg-page` | `tutorial_rpg` |
| `settings-page` | `tutorial_settings` |

---

## 函数系统参数弹窗

函数系统在添加函数、校验参数时使用自制的像素风模态弹窗，替代浏览器原生 `prompt()` / `alert()`，与全站视觉风格保持一致。

### 弹窗样式 `.pixel-dialog`

- **配色**：深空蓝 `#1a1a2e` 背景 + 金黄 `#ffd700` 边框 + Courier New 等宽字体。
- **硬阴影**：`4px 4px 0` 偏移黑色阴影，呈现 8-bit 立体感。
- **结构**：标题栏（含 × 关闭按钮）+ 内容区（提示文本 + 输入框）+ 底部按钮栏（确认 / 取消）。
- **交互**：点击遮罩、按 ESC、点击 × 按钮均可关闭；确认按钮触发回调。

### 参数名限制

- **单字母**：参数名仅允许单个字母（`a-z` / `A-Z`）。
- **保留字禁止**：以下保留字不可作为参数名（会被 `js/expression-parser.js` 的 `extractVariables` 过滤掉）：
  - 变量：`x`（自变量）
  - 常数：`pi` / `e`
  - 函数：`sin` / `cos` / `tan` / `log` / `sqrt` / `abs` / `exp` / `ln`
- 校验失败时弹窗内显示红色错误提示，用户可重新输入，无需关闭弹窗。

### 多参数自动创建

- 添加含 ≥2 个参数的函数时（如 `y=a*x^2+b*x+c`），系统会弹出确认弹窗，列出识别到的全部参数。
- 点击"一键创建"按钮，可批量创建所有参数的滑动条，无需逐个手动添加。
- 每个参数滑动条可独立设置最小值、最大值、步长。

### 隐式乘法支持

弹窗输入的表达式同时支持：

- **显式乘法**：`y=a*x^2+b*x+c`（推荐，解析更明确）。
- **隐式乘法**：`y=ax^2+bx+c`（`js/expression-parser.js` 会自动在数字与字母、字母与字母之间补 `*`）。

### 校验与错误提示

- 表达式语法错误、参数名非法、除零等都会触发弹窗内红色错误提示。
- 用户修改输入后再次点确认即可重试，无需刷新页面。

---

## 首页交互

### 分类折叠

首页的 5 个一级类别（学习类 / 艺术类 / 工具类 / 娱乐类）可独立折叠/展开：

- 点击类别标题切换折叠状态。
- 折叠状态保存到 `localStorage`，下次访问自动恢复。
- 折叠图标 `▼` / `▶` 实时更新。

### 最近使用

首页顶部"最近使用"区域：

- 自动记录最近访问的 3 个工具（FIFO，重复访问会移到最前）。
- 点击卡片即可快速进入对应工具。
- 点击"清空"按钮清除所有记录。
- 无记录时该区域自动隐藏（`display: none`）。

### ESC 键导航

- 在任何子页面按 ESC 返回上一级页面。
- 连按可逐级回到首页。
- 在首页按 ESC 不响应。
- 输入框聚焦时按 ESC 优先失焦（不触发页面返回）。

---

## 键盘快捷键

| 快捷键 | 作用 | 适用页面 |
|--------|------|---------|
| `ESC` | 返回上一级页面 / 输入框失焦 | 所有页面 |
| `Enter` | 提交输入（预测、计算、添加函数等） | 预测器、计算器、函数系统 |
| `←` `→` `↑` `↓` / `WASD` | 角色移动 | 像素 RPG |
| `+` / `-` | 缩放坐标系 | 预测器、函数系统 |
| 鼠标拖拽 | 平移坐标系 / 旋转 3D 视角 / 绘制 | 预测器、函数系统、物理沙盒、绘图编辑器 |
| 滚轮 | 缩放 | 预测器、函数系统、像素艺术 |

---

## 鼠标拖拽粒子特效

`js/mouse-trails.js` 实现的鼠标拖拽粒子特效：

- **触发**：鼠标在页面上移动时（速度超过阈值）。
- **效果**：在鼠标轨迹上生成像素风粒子，粒子有重力、衰减、淡出效果。
- **层级**：`z-index: 99999`（最顶层），但 `pointer-events: none`，不遮挡任何交互。
- **canvas 重置**：通过 `#mouse-trails-canvas` 专用 CSS 规则 + inline 样式，重置全局 `canvas {}` 规则的影响（背景透明、无边框、无阴影、宽度不限）。
- **性能**：使用 `requestAnimationFrame`，粒子数量上限自动控制，避免性能问题。
- **移动端**：触摸事件同样触发粒子特效。

---

## MCP Server

`mcp-server/` 目录包含一个 MCP（Model Context Protocol）服务器，把网站的计算器和预测器封装为 MCP tools，可供 TRAE、Claude Desktop、Cursor 等 MCP 客户端直接调用。

### 暴露的 Tools

- **`calculate(expression, angle_mode?)`**：计算数学表达式（白名单 + 受限 `eval`，仅暴露 `math` 模块与三角函数包装）。
- **`predict_sequence(series, count?, weight_mode?)`**：预测数字序列的后续值（4 种基础方法：平均值、线性回归、差分、移动平均，按权重融合）。
- **`list_predictors()`**：列出所有可用的预测方法。

### 安装与配置

详见 [`mcp-server/README.md`](mcp-server/README.md)。

### 安全说明

- 表达式求值使用受限 `eval`，全局命名空间 `__builtins__` 为空，仅暴露 `math` 模块与三角函数包装。
- 输入字符白名单：数字、`+ - * / ( ) .` 空白、函数名 `sqrt` / `sin` / `cos` / `tan`，其余字符直接拒绝。
- 三角函数 DEG 模式经 `x * π / 180` 转换为弧度，并内置特殊角度精确值查表（0/30/45/60/90/120/135/150/180/270/360 度）。

---

## WebAssembly 加速

`wasm/` 目录包含反应扩散模式的 Wasm 加速版本。**当前已修复**：采用内联 JS 优化内核方案，无外部 wasm 文件依赖，避免了 Emscripten 编译产物加载失败的问题，同时保留 C 源码作为算法参考。

### 加载流程

1. 用户在设置页启用 "WebAssembly 加速" 开关。
2. 进入像素艺术生成器并选择"反应扩散 RD"模式时，调用 `loadWasmModule()` 初始化内联优化内核。
3. 内核初始化成功后 `wasmLoaded = true`，反应扩散模式自动切换到加速路径。
4. Toast 提示明确：**"WebAssembly 加速已启用（JS 优化内核）"**，避免用户误以为是真正的 wasm 二进制。
5. 若初始化失败（极少见），自动回退到普通 JS 路径，并提示用户。

### 性能优化手段

- **`Float32Array`**：所有扩散场（u / v / du / dv）使用 `Float32Array` 而非普通数组，减少内存占用并加速访问。
- **内联 laplacian**：把 3×3 邻域求和直接内联到主循环，避免函数调用开销。
- **缓存数组长度**：循环外预先读取 `width` / `height`，避免每帧重复属性访问。
- **边界裁剪**：边界格点跳过 laplacian 计算，减少分支判断。
- 整体性能比朴素 JS 版本快 3-5 倍，可处理更高分辨率和更多迭代次数。

### 文件说明

- **源码**：`wasm/reaction-diffusion.c`（Gray-Scott 反应扩散模型 C 源码，作为算法参考）。
- **编译脚本**：`wasm/build.sh`（Emscripten 编译，可选路径，运行时不再依赖编译产物）。

### 编译 Wasm（可选）

```bash
cd wasm
# 需要先安装 Emscripten SDK（emsdk）
./build.sh
# 生成的 reaction_diffusion.wasm 会自动放到 ../js/ 目录
```

> **说明**：编译产物当前不被运行时直接使用，仅作为可选实验路径保留。如需启用真正的 wasm 二进制加载，需在 `js/pixel-art.js` 中重新接入 `WebAssembly.instantiate` 路径。

---

## 浏览器兼容性

| 浏览器 | 最低版本 | 备注 |
|--------|---------|------|
| Chrome | 90+ | 推荐 |
| Edge | 90+ | 推荐 |
| Firefox | 88+ | 推荐 |
| Safari | 14+ | iOS Safari 14+ |
| Samsung Internet | 14+ | |
| IE | 不支持 | 使用了 ES6+ 特性 |

### 必需的 Web API

- **Service Worker**：PWA 离线功能。
- **Cache API**：SW 缓存。
- **localStorage**：用户设置存储。
- **IndexedDB**：头像和背景图片存储。
- **Canvas 2D**：所有绘图。
- **Web Audio API**：像素音乐合成器。
- **Blob URL**：图片处理。
- **WebAssembly**（可选）：反应扩散加速。

---

## 性能与无障碍

### 性能优化

- **零依赖**：除 p5.js（仅像素艺术生成器使用）外无任何第三方库。
- **按需加载**：每个工具的 JS 只在该工具被打开时初始化。
- **Canvas 重绘优化**：仅在数据变化时重绘，避免无意义 `requestAnimationFrame`。
- **粒子数量上限**：鼠标拖拽粒子特效自动限制粒子数量。
- **Service Worker 缓存**：所有静态资源缓存，二次访问零网络请求。
- **CSS Variables**：统一的设计 token，避免重复样式计算。

### 无障碍（Accessibility）

- **键盘导航**：所有按钮和输入框支持 Tab 键聚焦，Enter 键提交。
- **focus-visible**：聚焦时显示明显的金色边框（`border-color: var(--accent)`）。
- **ARIA 标签**：装饰性 SVG 添加 `aria-hidden="true"`。
- **prefers-reduced-motion**：尊重系统"减少动画"设置，禁用按钮过渡动画。
- **语义化 HTML**：使用 `<header>` `<footer>` `<button>` 等语义化标签。
- **颜色对比度**：所有文本与背景的对比度符合 WCAG AA 标准。

---

## 更新日志

### 2026-07 · 像素 AI 聊天工具

- **像素 AI 聊天工具** — 新增 AI 聊天工具，支持 9 家大模型提供商、Token 消耗统计、本地存储 API Key、双语界面

---

### 2026-07 · RPG Wiki 百科 + 层数改造 + 全站 i18n 完善

- **RPG Wiki 百科按钮**：控制台新增"Wiki百科"按钮（英文 Wikipedia），点击弹出文档页面。
- **Wiki 文档页面**：类文档式布局，含目录导航，4 大章节：
  - 基础属性：HP/EXP/ATK/DEF 含义解释
  - 操作指南：移动/攻击/重置说明
  - 物品图鉴：8 种物品介绍（木剑/恢复药水I/皮盔/皮甲/皮护腿/皮靴/经验宝石I/攻击戒指）
  - 怪物机制：怪物类型/刷新/战斗/奖励
- **关卡改为层数**：所有"第 N 关"/"关卡"文本改为"第 N 层"/"层数"（drawUI/游戏结束/重置/进入下一层提示），更贴合地牢探险主题。
- **全站 i18n 完善**：扫描 18 个文件约 410 处硬编码中文，全部接入 i18n 系统：
  - `js/pixel-rpg.js`：怪物名/物品名/showMessage/fillText 全部 i18n 化
  - `js/math-cards-ext.js`：5 个学习卡片（分数/小数/方程/几何/速算）200+ 处文本 i18n 化
  - `js/predictors.js`：40 种预测方法名 i18n 化
  - `js/math-cards.js`/`js/app.js`/`js/expression-parser.js`/`js/function-3d.js`/`js/pixel-clock.js`/`js/chart.js`/`js/nn-visualizer.js`/`js/nn.js`/`js/offsetfit.js`/`js/overfit.js`/`js/physics-sandbox.js`/`js/image-pixelizer.js` 全部 i18n 化
  - `index.html`：title/aria-label 属性接入 `data-i18n-title`/`data-i18n-aria-label`
  - i18n.js apply() 函数扩展支持 `data-i18n-title`/`data-i18n-aria-label` 属性
- **Service Worker** 缓存版本升级到 v24。

---

### 2026-07 · RPG 物品栏/装备栏系统重做

- **物品栏格子放大**：每个格子 ≥56px，物品数量显示在右下角（白色字体、透明背景），单个物品不显示数量。
- **装备栏扩展为 7 槽位**：左手、右手、头部、身体、腿、脚、饰品，替代原来的武器/防具 2 槽位。
- **8 种新物品**：删除旧 6 种物品，新增木剑（武器 atk+2）、恢复药水I（恢复 20 HP）、皮盔（def+1）、皮甲（def+3）、皮护腿（def+2）、皮靴（def+1）、经验宝石I（+1 经验）、攻击戒指（饰品 atk+1）。
- **像素画物品图标**：物品图标改为 canvas 绘制的像素画（48x48），每种物品有独特视觉（木剑/药水瓶/皮革套装/宝石/戒指），不再使用 emoji。
- **点击交互系统**：
  - 点击物品格 → 选中高亮 + 下方详情面板显示物品属性（名称/类型/描述/属性加成）。
  - 消耗品显示"使用"按钮，可穿戴物品显示"穿戴"按钮，已装备物品显示"取消佩戴"按钮。
  - 先点击有物品的格子再点击另一个格子 → 交换/移动物品（背包↔背包交换、背包→装备槽穿戴、装备槽→背包卸下）。
  - 点击背包和装备栏以外的区域 → 取消选中。
  - 二次点击同一格子 → 取消选中。
- **装备加成计算**：ATK/DEF 加成遍历全部 7 个装备槽位累加，drawUI 显示 `ATK 基础+加成` 格式。
- **Service Worker** 缓存版本升级到 v23。

---

### 2026-07 · RPG 物品栏/装备栏/地图布局/导航改进

| # | 模块 | 更新内容 |
|---|------|---------|
| 1 | 像素 RPG · 物品栏 | 新增背包系统（16 格容量）。宝箱不再立即消耗奖励，改为掉落物品存入背包：HP 药水（消耗品，可堆叠）、经验宝石（即时消耗加 EXP）、铁剑/攻击戒指（武器）、钢甲/防御护符（防具）。背包满时提示且不拾取。 |
| 2 | 像素 RPG · 装备栏 | 新增武器/防具两个装备槽。点击背包中的装备可装备（旧装备退回背包），点击装备槽可卸下。装备加成实时生效，`getEffectiveAtk()`/`getEffectiveDef()` 计算含装备的总属性，`combatRound` 使用有效属性计算伤害。顶部 UI 显示 `ATK 5+3` 格式（基础+装备加成）。 |
| 3 | 像素 RPG · 地图布局 | RPG 页面从左右分栏改为上下布局：控制按钮（开始/停止/重置）横排在上，地图 canvas 在下独占大区域（`width:100%` 撑满面板），物品栏/装备栏侧边面板在右（240px）。移动端自动单列堆叠。地图视觉显著放大。 |
| 4 | 像素 RPG · 点击怪物自动攻击 | 点击怪物时玩家自动 BFS 寻路到怪物相邻格，到达后**自动发起攻击**（无需手动按键）。新增 `attackTarget` 字段记录攻击意图，`navigateTo` 检测目标格怪物并设为攻击目标，`update` 到达后自动调用 `combatRound`。 |
| 5 | 像素 RPG · 路径遇阻停下 | 自动导航中途遇怪物挡路时，玩家走到怪物面前**停下不动**，**不清空剩余路径**，显示"前方有 [怪物名]！攻击(空格)或绕路"让玩家抉择。击败怪物后重新点击目标可继续导航。修复原来 `tryMove` 失败直接清空整个 pathQueue 的问题。 |
| 6 | 像素 RPG · UI 概览 | 顶部 UI 面板增加背包数量显示（`背包 N/16`）和装备加成显示（`ATK 5+3`/`DEF 1+2` 格式）。 |

> 本次更新涉及文件：`js/pixel-rpg.js`（物品栏/装备栏数据结构、`ITEM_TEMPLATES`、`openChest` 重写、`equipItem`/`unequipItem`/`useItem`/`getEffectiveAtk`/`getEffectiveDef`/`faceTowards`/`renderInventory`/`renderEquipment` 新增、`navigateTo`/`update`/`drawUI`/`combatRound`/`reset` 修改）、`index.html`（RPG 页面布局重构 + 物品栏/装备栏 DOM）、`styles/pixel.css`（布局样式 + 物品栏/装备栏像素风样式）、`js/i18n.js`（`rpg_equipment_title`/`rpg_inventory_title` 中英文键）。

---

### 2026-07 · 7 项修复与新增功能

| # | 模块 | 更新内容 |
|---|------|---------|
| 1 | 设置页 · 返回按钮 | 设置页"返回首页"按钮从底部 footer 移到右上角浮动（`floating-back-btn` 样式），与其它工具页风格统一。 |
| 2 | 启动流程 · 昵称 | 应用启动不再强制弹出昵称注册弹窗，无 profile 时静默使用默认昵称"访客"直接进入首页；可在设置页随时修改。 |
| 3 | 用户信息 · 持久化 | 用户信息（昵称、头像、背景）从 sessionStorage 改为 localStorage 持久化，关闭浏览器后仍保留；同时设置 cookie `pixel_user_session`（max-age 一年）作为已注册标记，不再重复注册。退出登录会清除 localStorage 和 cookie。 |
| 4 | 像素绘画编辑器 · 画布 | 画布 CSS 显示尺寸从 max-width 512px 增大到 768px，逻辑像素档位（16 / 32 / 64 / 128）不变。 |
| 5 | 像素 RPG · 自动导航 | 像素 RPG 新增点击/触摸地图任意可移动格子，玩家沿 BFS 最短路径自动逐格移动。支持手机触屏和电脑鼠标（pointerdown 事件）。键盘操作（方向键 / WASD）保留，按方向键可中断自动导航。点击怪物寻路到相邻格，点击出口/宝箱寻路到目标格触发对应事件，点击墙壁无反应。 |
| 6 | 物理沙盒 · 精简 + 氢气 + 气体按钮 | 删除沙子/石头/火/植物/金属/油/酸共 7 种物质，只保留水（EMPTY 橡皮保留为擦除工具）。水的下落 + 横向流动物理性质完整保留。新增氢气物质：向上飘（与重力相反），可穿过水上升，默认不可见。新增"气体"按钮：点击切换氢气可见/不可见（可见时半透明淡蓝色）。 |
| 7 | 页面导航 · 滚动位置 | 页面切换时保存当前页面滚动位置，返回该页面时恢复到上次离开的位置（不再回到顶层）。ESC 返回同样恢复。 |

> 本次更新涉及文件：`js/app.js`（设置页返回按钮、启动昵称、localStorage + cookie 持久化、页面切换滚动位置）、`js/pixel-drawing-editor.js`（画布 768px）、`js/pixel-rpg.js`（BFS 自动导航）、`js/physics-sandbox.js`（精简 + 氢气 + 气体按钮）、`styles/pixel.css`（`floating-back-btn` 样式、画布尺寸）。

---

## 贡献

欢迎通过 Issue 和 Pull Request 贡献代码！

### 贡献流程

1. Fork 本仓库。
2. 创建特性分支：`git checkout -b feature/your-feature`。
3. 提交修改：`git commit -m 'feat: add your feature'`（推荐使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范）。
4. 推送分支：`git push origin feature/your-feature`。
5. 提交 Pull Request。

### 贡献方向

- 新工具：添加新的像素风工具（如像素塔防、像素画板导入导出等）。
- 新艺术模式：为像素艺术生成器添加新的生成算法。
- 新预测方法：为预测系统添加新的数学方法。
- 新学习卡片：为学习系统添加新的数学概念卡片。
- 国际化：添加新语言支持（如日语、韩语）。
- 性能优化：Wasm 加速更多模式。
- Bug 修复：修复 Issue 中的问题。

### 代码规范

- JavaScript：ES5 兼容写法（`var` / `function`），IIFE 模式，挂载到 `window` 全局。
- CSS：使用 CSS Variables，遵循 BEM 命名（部分老代码可能不完全符合）。
- HTML：语义化标签，`data-i18n` 标注所有用户可见文本。

---

## 常见问题 FAQ

### 1. 为什么必须用 `http://localhost` 访问，不能直接 `file://` 打开？

Service Worker 只能在 `http://` 或 `https://` 协议下注册，`file://` 下 `localStorage` 也受限，p5.js 等 CDN 资源加载会失败。请用 `python3 -m http.server 8000` 或 `serve -p 8000` 启动本地静态服务器后访问 `http://localhost:8000`。

### 2. 网站能离线使用吗？

可以。首次加载完成后，Service Worker 会缓存所有静态资源。可通过浏览器地址栏的"安装"按钮把网站作为 PWA 添加到桌面，之后即可完全离线使用。

### 3. 修改了 JS 文件后刷新页面没生效？

可能是 Service Worker 缓存了旧版本。打开 Chrome DevTools → Application → Service Workers，勾选 "Update on reload" 后再刷新；或关闭所有标签页后重新打开。每次部署会自动升级 `CACHE_VERSION` 并清空旧缓存。

### 4. 切换语言后部分文本没更新？

绝大多数文本会实时切换，但少数被 Service Worker 缓存的页面可能需要手动刷新一次。如遇到遗漏的 key 会在 Console 中警告，欢迎提 Issue 反馈。

### 5. WebAssembly 加速到底是真的 wasm 吗？

当前已修复为内联 JS 优化内核方案，无外部 wasm 文件依赖。Toast 提示明确写为 "WebAssembly 加速已启用（JS 优化内核）"。`wasm/reaction-diffusion.c` 仍保留作为算法参考，可通过 `wasm/build.sh` 重新编译实验真正的 wasm 二进制路径。

### 6. 数据会被上传到服务器吗？

不会。本项目零后端依赖，所有计算、存储、渲染都在浏览器中完成。图像像素化、绘图导出全部在客户端处理，图片不会上传到任何服务器。用户信息（昵称、头像、背景）使用 `localStorage` + cookie `pixel_user_session`（max-age 一年）持久化保存，关闭浏览器后仍保留，下次访问不会重复注册；其余数据保存在 `localStorage` / `IndexedDB` 中，关闭浏览器即销毁（除非用户主动保留）。退出登录会同时清除 `localStorage` 中的用户信息和 `pixel_user_session` cookie。

### 7. 函数系统为什么不让我用 `x` 作为参数名？

`x` 是函数的自变量，已被系统占用。同理 `pi`、`e`、`sin`、`cos`、`tan`、`log`、`sqrt`、`abs`、`exp`、`ln` 也都是保留字，不能作为参数名。请使用 `a`、`b`、`c` 等其他单字母作为参数。

### 8. MCP Server 怎么接入 TRAE / Claude？

详见 [`mcp-server/README.md`](mcp-server/README.md)。简单来说就是 `pip install -r requirements.txt` 后启动 `server.py`，然后在 MCP 客户端配置文件中添加对应的 server 配置即可。

### 9. 在手机上能用吗？

可以。所有工具都做了响应式适配，桌面端双栏布局，移动端单栏自适应，触摸友好的按钮尺寸和间距。推荐用 iOS Safari 14+ 或 Android Chrome 90+ 访问。

### 10. 如何贡献新的预测方法 / 艺术模式 / 学习卡片？

参考"贡献流程"小节 Fork 并创建特性分支。新预测方法在 `js/predictors.js` 的 `predictors` 数组中添加；新艺术模式在 `js/pixel-art.js` 中实现 `generateXxx()` 函数；新学习卡片在 `js/math-cards.js` 或 `js/math-cards-ext.js` 中添加，并在 `index.html` 创建对应页面 div、在 `js/i18n.js` 添加教程翻译。

---

## License

[MIT](LICENSE)

© 2026 Pixel Tools. 复古深空像素风.

---

## 致谢

- [p5.js](https://p5js.org/)：像素艺术生成器的绘图辅助库。
- [Emscripten](https://emscripten.org/)：WebAssembly 编译工具链。
- [FastMCP](https://github.com/modelcontextprotocol/python-sdk)：MCP Server 框架。
- [GitHub Pages](https://pages.github.com/)：免费托管。
- [GitHub Actions](https://github.com/features/actions)：自动部署。

---

> 如果这个项目对你有帮助，欢迎在 GitHub 上点个 ⭐ Star！