# 像素风数字序列预测 Web App Spec

## Why
用户希望拥有一个可部署到 GitHub Pages 的纯静态网页应用，能够输入一个数字序列（n 个数字），用 20 种数学方法预测下一个数字，展示各方法的权重与对最终预测的贡献，并以折线图呈现输入数据与预测数据。整体采用「复古深空像素风（Retro Deep-Space Pixel）」：深紫黑底 + 白色粗边 + 硬阴影无模糊 + 等宽字体 + 微圆角，兼顾复古与现代感。

## What Changes
- 新建纯静态网站项目（HTML/CSS/JS，无构建步骤，无后端依赖），可直接部署到 GitHub Pages
- 实现数字序列输入界面（支持空格、逗号、换行、CSV 粘贴）
- 实现 20 种独立的数学预测方法核心算法库（纯 JS）
- 实现权重计算与留一法回测（Backtesting）逻辑：基于历史预测误差反推各方法权重
- 实现预测结果可视化：方法权重条形图、贡献度面板、输入 + 预测折线图
- 实现完整的「复古深空像素风」UI 系统（CSS 变量 + 通用类）
- 提供响应式布局：桌面双栏、移动端单栏
- 提供数据导出（JSON / CSV）
- 更新 README，包含 GitHub Pages 部署说明与 20 种方法原理

## Impact
- Affected specs: 无（全新项目）
- Affected code:
  - `/workspace/index.html` — 主页面结构
  - `/workspace/styles/pixel.css` — 像素风样式系统（CSS 变量 + 通用类）
  - `/workspace/js/predictors.js` — 20 种预测算法
  - `/workspace/js/weights.js` — 权重计算与回测
  - `/workspace/js/chart.js` — 折线图与权重条形图（原生 Canvas）
  - `/workspace/js/app.js` — 主应用逻辑与事件绑定
  - `/workspace/README.md` — 已存在，需更新部署说明

## ADDED Requirements

### Requirement: 数字序列输入
系统 SHALL 提供一个输入区域，允许用户输入一个数字序列（n 个数字，n ≥ 2）。

- 支持空格、逗号、换行、分号分隔
- 支持粘贴 CSV / 纯文本
- 输入框聚焦时使用金色（#ffd700）边框强调
- 输入校验：非数字、序列长度不足时给出像素风提示框

#### Scenario: 正常输入
- **WHEN** 用户在输入框输入 "1, 2, 3, 5, 8, 13"
- **THEN** 系统解析为 [1, 2, 3, 5, 8, 13] 并启用「预测」按钮

#### Scenario: 输入不足
- **WHEN** 用户输入少于 2 个有效数字并点击预测
- **THEN** 系统显示提示「至少需要 2 个数字」，不执行预测

#### Scenario: 含非法字符
- **WHEN** 用户输入 "1, 2, abc, 4"
- **THEN** 系统忽略 "abc"，解析为 [1, 2, 4]，并显示轻量提示「已忽略 1 个非法值」

### Requirement: 20 种数学预测方法
系统 SHALL 实现以下 20 种独立的预测方法，每种方法对相同输入产出下一个数字的预测值：

1. 朴素法（Naive）— 取最后一个值
2. 季节朴素法（Seasonal Naive，周期 = 2）
3. 漂移法（Drift）— 用首末两点斜率外推
4. 简单平均（Mean）
5. 中位数（Median）
6. 简单移动平均（SMA，window = 3）
7. 加权移动平均（WMA，window = 3）
8. 简单指数平滑（SES，α = 0.5）
9. 二次指数平滑（Holt's Linear）
10. 三次指数平滑（Holt-Winters，周期 = 2）
11. 线性回归（最小二乘）
12. 二次多项式回归（deg = 2）
13. 三次多项式回归（deg = 3）
14. 自回归 AR(1)
15. 自回归 AR(2)
16. 几何增长（Geometric / Ratio）
17. 一阶差分外推
18. 二阶差分外推
19. Fibonacci / 黄金比率
20. 傅里叶外推（Fourier Extrapolation，k = 3）

#### Scenario: 预测执行
- **WHEN** 用户输入有效序列并点击「预测」
- **THEN** 系统在浏览器主线程中运行 20 种算法，每种返回一个数值预测
- **AND** 对于当前序列长度不足以支撑的方法（如 AR(2) 需 ≥ 3 个点），系统返回 null 并在 UI 标记为「数据不足」

#### Scenario: 可重复性
- **WHEN** 用户对相同输入连续点击「预测」两次
- **THEN** 两次得到的 20 个预测值完全一致（确定性算法，无随机性）

### Requirement: 权重计算与贡献度
系统 SHALL 基于留一法回测（Leave-One-Out Backtesting）计算每种方法的权重，使得权重之和为 1。

权重计算逻辑：
- 对每个方法，在历史数据上做留一法回测，计算其在已知点上的平均绝对百分比误差（MAPE）
- 权重 = (1 / (MAPE + ε)) 归一化（ε 防止除零）
- 数据不足或回测失败的方法权重为 0
- 用户可切换「均匀权重」与「回测权重」两种模式
- 融合预测 = Σ(method_prediction × weight)

#### Scenario: 权重显示
- **WHEN** 预测完成
- **THEN** 侧栏显示 20 个方法的列表，每个方法显示：名称、预测值、权重（百分比）、MAPE
- **AND** 融合预测值在结果区醒目显示

#### Scenario: 权重切换
- **WHEN** 用户切换权重模式（均匀 ↔ 回测）
- **THEN** 融合预测值、权重条形图、折线图实时更新，无需重新运行算法

### Requirement: 折线图可视化
系统 SHALL 在原生 Canvas 上绘制折线图，不引入第三方图表库。

包含元素：
- X 轴：数据点索引（1, 2, ..., n, n+1）
- Y 轴：数值，自动缩放
- 输入序列：金色（#ffd700）实线 + 像素方块节点
- 融合预测点：在第 n+1 位置，红色（#ff4500）方块，醒目
- 各方法预测点：在第 n+1 位置以半透明小方块叠加
- 坐标轴：白色 3px 边框 + 等宽字体刻度
- 鼠标悬停显示数值 tooltip

#### Scenario: 预测后绘图
- **WHEN** 预测完成
- **THEN** 折线图自动绘制，输入序列与预测点清晰可辨
- **AND** 图表在画布尺寸变化时自适应重绘

### Requirement: 权重条形图
系统 SHALL 在原生 Canvas 上绘制 20 个方法的权重条形图。
- 每个方法一条水平条，长度 = 权重比例
- 条形颜色按方法类别区分（平滑法蓝色、回归法绿色、差分类棕色、其他紫色）
- 条形右侧显示权重百分比

#### Scenario: 权重可视化
- **WHEN** 预测完成
- **THEN** 条形图按权重降序排列，最长的条对应贡献最大的方法

### Requirement: 复古深空像素风 UI
系统 SHALL 严格遵循以下视觉规范，所有面板、按钮、输入框、图表容器均使用统一 CSS 变量：

| Token | 值 | 用途 |
|------|------|------|
| `--bg-deep` | `#1a1a2e` | body 背景 |
| `--bg-panel` | `#2d2d44` | 面板 / 按钮底色 |
| `--bg-cell` | `#1a1a2e` | 单元格背景 |
| `--border` | `#ffffff` | 所有边框，3px 粗 |
| `--accent` | `#ffd700` | 输入聚焦、激活按钮、强调文字 |
| `--shadow` | `rgba(0,0,0,0.4)` | 硬阴影色 |
| `--font` | `"Courier New", Courier, monospace` | 全局字体 |
| 圆角 | `4px` | 微圆角（非直角） |
| 阴影 | `4px 4px 0 var(--shadow)` | 硬阴影，无模糊 |
| 字重 | `bold` | 全局 |
| 字间距 | `1-2px` | 全局 |

像素方块色板：泥土棕 `#8b4513` / 水 `#1e90ff` / 树叶 `#228b22` / 火 `#ff4500`。

按钮交互：
- 默认：`box-shadow: 4px 4px 0 var(--shadow)`
- 按下：`transform: translate(2px, 2px)` + `box-shadow: 2px 2px 0 var(--shadow)`

#### Scenario: UI 一致性
- **WHEN** 页面加载完成
- **THEN** 所有面板、按钮、输入框、图表容器均使用上述 CSS 变量与样式 token
- **AND** 无任何渐变模糊阴影、非等宽字体或非 4px 圆角元素出现

### Requirement: GitHub Pages 部署
系统 SHALL 提供完整的 GitHub Pages 部署支持：
- 所有代码为纯静态文件，无构建步骤、无后端依赖、无第三方运行时库（p5.js / Chart.js 等均不引入）
- 项目根目录包含 `index.html`，可直接通过 `https://<user>.github.io/<repo>/` 访问
- README 包含部署步骤说明

#### Scenario: 直接部署
- **WHEN** 用户将仓库推送到 GitHub 并在 Settings → Pages 选择 main 分支根目录
- **THEN** 网站立即可访问，无需任何额外配置

### Requirement: 数据导出
系统 SHALL 支持将当前预测结果导出为 JSON 与 CSV 两种格式。
- JSON：包含输入序列、各方法预测值、权重、MAPE、融合预测、时间戳
- CSV：方法名、预测值、权重、MAPE

#### Scenario: 导出 JSON
- **WHEN** 用户点击「导出 JSON」
- **THEN** 浏览器下载 `prediction_<timestamp>.json` 文件，内容包含完整预测数据

#### Scenario: 导出 CSV
- **WHEN** 用户点击「导出 CSV」
- **THEN** 浏览器下载 `prediction_<timestamp>.csv` 文件

### Requirement: 响应式布局
系统 SHALL 在不同屏幕尺寸下正常显示：
- 桌面（≥ 900px）：左侧主区（输入 + 图表）+ 右侧侧栏（方法列表 + 权重条形图）
- 移动端（< 900px）：单栏纵向堆叠，图表自适应宽度

#### Scenario: 移动端访问
- **WHEN** 用户在手机浏览器打开页面
- **THEN** 所有控件可触摸操作，图表宽度自适应屏幕，无横向滚动
