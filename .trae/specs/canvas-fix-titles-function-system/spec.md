# 像素艺术画布修复 + 标题统一 + 计算器动画增强 + 函数系统 Spec

## Why
用户反馈 5 个问题：(1) 像素艺术生成器画布留白多、实际显示区域小；(2) 设置齿轮按钮位置不合适，希望放到头像右边；(3) 各页面标题命名不统一（数学学习网站/像素预测器/像素计算器 应统一为卡片名）；(4) 计算器运算过程动画不够直观，多个乘法应一步步合并显示；(5) 缺少函数图像绘制工具。

## What Changes
- **像素艺术画布自适应**：移除 `#pixel-art-canvas-container` 的 `max-width: 600px` 限制，改为 `width: 100%` 填满容器；提高默认分辨率从 32 到 48（让显示更清晰）；画布容器 `.pixel-art-canvas-wrap` 高度自适应
- **设置齿轮按钮位置**：把 `.floating-settings-btn` 的 `right: 60px` 改为 `left: 60px`（移到头像右侧），移除 `right` 属性
- **标题统一**（统一为卡片名称）：
  - landing-page 的 `<h1 class="landing-title">数学学习网站</h1>` → `像素数学`
  - landing-page 的 `<p class="landing-subtitle">MATH LEARNING SITE</p>` → `PIXEL MATH`
  - predictor-page 的 `<h1 class="pixel-title">像素预测器 PIXEL PREDICTOR</h1>` → `预测系统 PIXEL PREDICTOR`
  - calculator-page 的 `<h1 class="pixel-title">像素计算器 PIXEL CALCULATOR</h1>` → `计算机系统 PIXEL CALCULATOR`
- **计算器运算过程合并动画**：
  - 修改 `showCalcStepsAnimated`：每步显示时，把"被计算的子表达式"高亮，然后用动画效果（CSS transition）让它"下移合并"到结果位置
  - 确保 `computeStepsWithTrace` 每次只算一组乘除（已是此行为，需验证多个乘法时分组逐步显示）
  - 每个 `*/` 运算单独一步，不要合并多组
- **新增函数系统卡片 + 页面**：
  - landing-page 在"预测系统"卡片之后新增"函数系统"卡片（`id="btn-enter-function"`）
  - 新增 `<div id="function-page" class="function-page">` 页面
  - 页面含：浮动返回按钮、标题、Canvas 画布（平面直角坐标系）、输入框、+/− 缩放按钮
  - Canvas 支持鼠标拖拽平移、滚轮/按钮缩放
  - 输入框支持 `y=表达式` 或 `f(x)=表达式` 格式
  - 坐标系网格、坐标轴、刻度、原点标记清晰，缩放时基准长度（单位长度像素）按比例变化不混乱
  - 新增 `js/function-plotter.js` 模块负责解析和绘制
- **更新 README.md**：在功能列表新增函数系统、更新像素艺术生成器说明（分辨率 48、画布填满）、更新各页面标题说明、项目结构新增 function-plotter.js、使用说明更新齿轮按钮位置

## Impact
- Affected code:
  - `index.html`（标题改名、新增函数系统卡片、新增 function-page、加载 function-plotter.js）
  - `styles/pixel.css`（pixel-art-canvas 容器去 max-width、floating-settings-btn 改 left、function-page 样式、calc-step 合并动画样式）
  - `js/pixel-art.js`（默认分辨率 32→48，可选）
  - `js/app.js`（showCalcStepsAnimated 合并动画、computeStepsWithTrace 多乘法分组验证、showFunction/initFunction 页面切换）
  - `js/function-plotter.js`（新增文件）
- 不影响预测系统、神经网络、长期训练、MCP server 等现有功能
- 不影响像素艺术生成器的算法逻辑，只调整显示尺寸

## ADDED Requirements

### Requirement: 像素艺术画布填满显示区域
系统 SHALL 让像素艺术画布的显示尺寸填满其容器（去掉 max-width: 600px 限制），并提高默认分辨率让显示更清晰。

#### Scenario: 画布尺寸
- **WHEN** 用户打开像素艺术生成器页面
- **THEN** 画布显示尺寸填满 `.pixel-art-canvas-wrap` 容器宽度（减去 padding）
- **AND** 画布保持 1:1 正方形（aspect-ratio 1）
- **AND** 默认分辨率提高到 48（原 32）

### Requirement: 设置齿轮按钮移到头像右侧
系统 SHALL 把 `.floating-settings-btn` 从右上角（right:60px）移到左上角头像右侧（left:60px）。

#### Scenario: 齿轮位置
- **WHEN** 用户在任何页面
- **THEN** 头像在 left:16px，齿轮按钮紧邻其右（left:60px）
- **AND** 齿轮按钮不挡住右上角的 floating-back-btn（right:16px）

### Requirement: 标题统一为卡片名称
系统 SHALL 把各页面大标题统一为对应的卡片名称：landing-page 标题改为"像素数学"，predictor-page 标题改为"预测系统"，calculator-page 标题改为"计算机系统"。

#### Scenario: 像素数学首页
- **WHEN** 用户从工具首页点击"像素数学"卡片进入 landing-page
- **THEN** 页面大标题显示"像素数学"
- **AND** 副标题显示"PIXEL MATH"

#### Scenario: 预测系统页
- **WHEN** 用户进入 predictor-page
- **THEN** 大标题显示"预测系统 PIXEL PREDICTOR"

#### Scenario: 计算机系统页
- **WHEN** 用户进入 calculator-page
- **THEN** 大标题显示"计算机系统 PIXEL CALCULATOR"

### Requirement: 计算器运算过程合并动画
系统 SHALL 在运算过程动画中，把每一步"被计算的子表达式"以高亮 + 下移合并的视觉效果呈现，多个乘除法逐步显示（每组单独一步）。

#### Scenario: 单步合并动画
- **WHEN** 用户输入 `1+2*3` 并按 =
- **THEN** calc-current 立即显示 7
- **AND** calc-steps 第一步显示 `1+2*3`（完整表达式）
- **AND** 第二步显示 `1+6`，其中 `2*3` → `6` 的变化以高亮 + 下移合并动画呈现
- **AND** 第三步显示 `= 7`

#### Scenario: 多个乘法逐步
- **WHEN** 用户输入 `2*3+4*5` 并按 =
- **THEN** 运算过程分多步：`2*3+4*5` → `6+4*5` → `6+20` → `= 26`
- **AND** 每个乘法单独一步，不会一次算出 `6+20`

#### Scenario: 三个乘法
- **WHEN** 用户输入 `2*3*4` 并按 =
- **THEN** 运算过程：`2*3*4` → `6*4` → `= 24`（逐步，不跳步）

### Requirement: 新增函数系统卡片
系统 SHALL 在 landing-page 的卡片列表中，"预测系统"卡片之后新增"函数系统"卡片。

#### Scenario: 卡片显示
- **WHEN** 用户进入像素数学首页（landing-page）
- **THEN** 看到三个卡片从上到下：预测系统、函数系统、计算机系统
- **AND** 函数系统卡片标题为"函数系统"
- **AND** 卡片描述说明可输入函数绘制图像

#### Scenario: 点击进入
- **WHEN** 用户点击"函数系统"卡片
- **THEN** 进入 function-page

### Requirement: 函数系统页面
系统 SHALL 提供一个函数图像绘制页面，含平面直角坐标系、函数输入框、缩放和平移功能。

#### Scenario: 页面布局
- **WHEN** 用户进入 function-page
- **THEN** 看到标题"函数系统 PIXEL FUNCTION"
- **AND** 一个正方形/宽方形 Canvas 显示平面直角坐标系（x 轴、y 轴、网格、刻度、原点标记）
- **AND** Canvas 右下角有 + 和 − 缩放按钮
- **AND** Canvas 下方有函数输入框

#### Scenario: 输入函数绘制
- **WHEN** 用户在输入框输入 `y=x^2` 并按回车
- **THEN** Canvas 上绘制 y=x² 的曲线
- **AND** 曲线颜色为像素风金色（#ffd700）

#### Scenario: f(x) 格式
- **WHEN** 用户输入 `f(x)=sin(x)` 并按回车
- **THEN** Canvas 绘制 sin(x) 曲线（x 为弧度）

#### Scenario: 鼠标拖拽平移
- **WHEN** 用户在 Canvas 上按住鼠标拖拽
- **THEN** 坐标系平移（原点跟随鼠标移动）
- **AND** 网格、刻度、曲线一起平移
- **AND** 基准长度（单位长度的像素数）不变

#### Scenario: 缩放
- **WHEN** 用户点击 Canvas 右下角的 + 按钮
- **THEN** 坐标系放大（基准长度增加，如从 40px/单位 变为 50px/单位）
- **AND** 网格、刻度、曲线按新基准长度重绘
- **AND** 原点位置不变（仍居中或保持原位置）

#### Scenario: 滚轮缩放
- **WHEN** 用户在 Canvas 上滚动鼠标滚轮
- **THEN** 坐标系缩放（向上滚放大，向下滚缩小）
- **AND** 以鼠标位置为缩放中心

#### Scenario: 多函数叠加
- **WHEN** 用户输入第一个函数后，再输入第二个函数
- **THEN** Canvas 同时显示两个函数曲线（不同颜色）
- **AND** 提供清除按钮可清空所有曲线

#### Scenario: 坐标系不混乱
- **WHEN** 用户多次缩放和平移
- **THEN** 网格线始终等距
- **AND** 刻度数字始终对齐网格线
- **AND** 基准长度（单位像素数）始终为正值且最小限制（如 ≥10px）

## MODIFIED Requirements

### Requirement: showCalcStepsAnimated
showCalcStepsAnimated SHALL 在每一步添加"合并动画"：被计算的子表达式以高亮色显示，然后用 CSS transition 让它下移并淡入到新结果位置。每个乘除法运算单独一步，不合并多组。

### Requirement: computeStepsWithTrace
computeStepsWithTrace SHALL 保持每次只化简一组运算（已是此行为），确保 `2*3*4` 这种连续乘法分两步（`2*3*4 → 6*4 → 24`）而不是一步算完。

## REMOVED Requirements
（无）
