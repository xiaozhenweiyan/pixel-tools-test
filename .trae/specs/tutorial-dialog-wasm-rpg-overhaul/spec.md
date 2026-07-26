# 首页教程按钮 + 像素弹窗 + Wasm 修复 + RPG 地牢重写 + README 详细化 Spec

## Why

用户在一次请求中提出 6 项相互独立但需统一交付的改动：
1. 首页（工具首页 `app-landing-page`）的教程按钮当前与所有页面共享同一 CSS（视口底部居中、宽达 400px），用户希望首页教程按钮独占右上角、按钮大小仅容纳文字。同时明确：首页教程按钮**不**在其他页面显示。
2. 函数系统添加自定义参数时使用浏览器原生 `prompt()` / `alert()`，与全站像素风不符；且参数命名允许 1-3 字符，过宽易与函数名冲突。需要替换为自制的像素风模态弹窗，并把命名限制收紧为**单个字母**。新增：当用户添加的函数中检测到多个参数时，弹出自制像素弹窗询问"是否自动创建 X、X、X 参数"。
3. WebAssembly 加速无法使用。核查发现 `/workspace/pixel-tools/wasm/` 目录**只有 `build.sh` 和 `reaction-diffusion.c`，缺少已编译的 `reaction-diffusion.js` 与 `reaction-diffusion.wasm`**。`js/pixel-art.js` 的 `loadWasmModule()` 尝试 `loadScript('wasm/reaction-diffusion.js')` 时 404，永远回退到 JS 版本，导致用户感觉"Wasm 用不了"。
4. 现有 `README.md`（630 行）已较详细但用户希望更细化：每个 JS 文件干什么用、软件特色更突出。
5. 像素 RPG 现为草地+随机墙+金色小人+4 种怪物（史莱姆/蝙蝠/骷髅/哥布林）。用户希望重写为地牢风：迷宫式地图、戴面具黑衣人玩家、偏黑色砖墙、墙上火把、史莱姆为主要怪物、出口为向下走廊图标。**用户明确要求此项单独由一个 sub-agent 完成**。
6. 所有改动完成后更新 README 并推送到 GitHub。

## What Changes

### 1. 首页教程按钮位置与尺寸（styles/pixel.css）
- 新增 CSS 规则 `.tutorial-btn[data-page="app-landing-page"]`（或为首页按钮加专属 class），覆盖默认底部居中样式：
  - `top: 16px; right: 16px; bottom: auto; left: auto; transform: none;`
  - `width: auto; max-width: none; padding: 6px 14px;`
  - 字号可保持 14px，按钮整体仅容纳"教程"二字 + 内边距
- 不影响其他 22 个页面的 `.tutorial-btn`（仍保持底部居中、宽 400px）
- 验证：首页教程按钮在右上角、大小刚好包住"教程"两字；进入任何子页面后该按钮不显示（因为 `app-landing-page` 被隐藏）

### 2. 函数系统自制像素弹窗（js/app.js + styles/pixel.css + index.html）
- **新增像素风模态弹窗组件** `.pixel-dialog`：
  - 半透明黑色遮罩 `rgba(0,0,0,0.7)` 全屏覆盖，`z-index: 10002`（高于教程模态框 10001）
  - 居中卡片：深空蓝 `#1a1a2e` 背景、3px 金色 `#ffd700` 边框、4px 圆角、4px 4px 0 硬阴影、Courier New 字体
  - 卡片含标题栏（金色文字 + 关闭 ✕ 按钮）、内容区、按钮行（确认/取消，像素风按钮）
- **替换 `addCustomParam()` 中的 `prompt()` 和 `alert()`**：
  - 弹出像素弹窗，含一个单字符输入框（`maxlength="1"`）+ 提示文字"请输入参数名（单个字母，不能用 x / pi / e 等保留字）"
  - 校验失败时在弹窗内显示红色错误提示（不再用 `alert`），用户可重新输入
  - 校验通过后点"确认"关闭弹窗并添加参数
- **收紧参数名校验**：从"1-3 字母"改为"**必须单个字母**"，错误提示改为"参数名必须是单个字母"
- **新增多参数自动创建检测**：
  - 在 `addFromInput()` 中，函数添加成功后调用 `ExpressionParser.extractParams(ast)` 获取该函数的所有参数
  - 如果参数数量 ≥ 2，弹出自制像素弹窗，显示"检测到该函数包含参数：a, b, c。是否自动创建这些参数的滑动条？"，按钮"全部创建" / "取消"
  - 点击"全部创建"：把每个参数都加入 `functionPlotterInstance.customParams`（去重），然后 `renderParamSliders()` + `applyParamsToActive()`
  - 注意：现有的 `extractParams` 已经能自动识别参数并显示滑动条，但用户可能没注意到。此弹窗作为"显式确认"的增强 UX，让用户更明确地感知参数被识别

### 3. WebAssembly 加速修复（wasm/ + js/pixel-art.js）
- **根本原因**：`wasm/` 目录缺少已编译的 `reaction-diffusion.js` 和 `reaction-diffusion.wasm`，`loadScript('wasm/reaction-diffusion.js')` 404
- **修复方案 A（首选）**：在沙箱中尝试用 Emscripten 编译 `reaction-diffusion.c` 生成两个文件，提交到仓库
  - 命令：`cd wasm && bash build.sh`
  - 如果沙箱无 `emcc`，则降级到方案 B
- **修复方案 B（备选）**：手写 WebAssembly 文本格式（WAT）实现 Gray-Scott 反应扩散核心循环，用 `wat2wasm` 或内联字节码方式生成 wasm 模块
  - 在 `js/pixel-art.js` 中直接 `WebAssembly.instantiate(bytes)` 加载，无需外部 `reaction-diffusion.js` 胶水文件
  - 导出 `init(width, height, seed)` / `step(feed, kill, iterations)` / `getB()` 三个函数
  - 内存用 `WebAssembly.Memory` 共享，JS 端用 `Float32Array` 视图访问
- **修复方案 C（兜底）**：如果方案 A、B 都不可行，则在 `js/pixel-art.js` 中把"启用 Wasm"按钮替换为"已启用 JS 优化版"提示，并优化 JS 版本（用 `Float32Array` + 内联拉普拉斯计算，避免函数调用开销），让用户感知"加速已启用"
- **加载状态提示**：Wasm 加载失败时 toast 提示从模糊的"加载失败"改为明确的"Wasm 文件缺失，已回退到 JS 优化版"

### 4. README.md 详细化（README.md）
- 现有 630 行基础上扩展到约 900-1100 行
- **新增"文件清单"章节**：每个 JS 文件一节，说明用途、关键函数、依赖关系
  - `js/app.js`：主应用入口，页面切换、设置、参数面板、计算器、教程系统
  - `js/i18n.js`：国际化，中英文翻译表
  - `js/mouse-trails.js`：鼠标拖拽粒子特效
  - `js/pixel-art.js`：像素艺术生成器，8 种艺术模式 + Wasm 加速
  - `js/pixel-drawing-editor.js`：像素绘图编辑器，多图层 + 调色板
  - `js/pixel-music.js`：像素音乐合成器，8-bit 芯片音乐
  - `js/expression-parser.js`：表达式解析器（用于函数系统），AST + 参数提取
  - `js/function-plotter.js`：函数系统 2D 绘图，坐标系 + 缩放 + 参数动画
  - `js/function-3d.js`：函数系统 3D 绘图
  - `js/chart.js`：预测系统折线图，自适应刻度 + 缩放 + 平移
  - `js/predictors.js`：40 种预测方法实现
  - `js/weights.js`：预测权重计算（回测 MAPE 反归一化）
  - `js/nn.js`：神经网络预测
  - `js/nn-visualizer.js`：神经网络可视化
  - `js/funcfit.js` / `overfit.js` / `offsetfit.js`：函数拟合 / 过拟合 / 偏移拟合演示
  - `js/math-cards.js` / `math-cards-ext.js`：7 种数学学习卡片
  - `js/maze-generator.js`：迷宫生成器
  - `js/physics-sandbox.js`：物理沙盒
  - `js/image-pixelizer.js`：AI 图像像素化
  - `js/pixel-clock.js`：像素时钟
  - `js/pixel-rpg.js`：像素 RPG 小游戏（地牢风，本 spec 更新后）
  - `service-worker.js`：PWA Service Worker
  - `mcp-server/server.py`：MCP 服务器
  - `wasm/reaction-diffusion.c` / `build.sh`：WebAssembly 加速源码
- **新增"软件特色"章节**（强化）：把"核心特性"扩写，每条特色配 1-2 句详细说明
- **更新"工具目录"章节**：把 RPG 描述改为"地牢探险"风格
- **更新"WebAssembly 加速"章节**：说明已修复、文件位置、加载机制
- **更新"项目结构"章节**：补全所有文件
- **新增"教程系统"详细说明**：每个页面专属教程，首页按钮位置在右上角

### 5. 像素 RPG 地牢重写（js/pixel-rpg.js）— 单独 sub-agent 完成
- **地图生成 `generateMap(level)`**：
  - 改为地牢迷宫风格：用递归回溯（recursive backtracker）或房间+走廊算法生成迷宫
  - 玩家起点改为迷宫入口（左上），出口改为迷宫终点（右下）
  - 移除"草地"瓦片，改为"地牢地板"（深灰 `#3a3a3a` 带石板纹理）
  - 墙壁瓦片改为"黑色砖墙"（主色 `#1a1a1a`、高光 `#2a2a2a`、阴影 `#000000`），砖块缝隙更明显
- **玩家角色 `drawPlayer()`**：
  - 改为"戴面具的黑衣人"：
    - 身体：黑色长袍 `#0a0a0a`（替代金色 tunic）
    - 头部：黑色兜帽 `#0a0a0a` + 白色面具 `#f0f0f0`（仅露眼睛部位）
    - 面具样式：白色椭圆覆盖脸部，黑色眼洞
    - 移除"头发"和"肤色"，整体只有黑+白两色
    - 保留 4 方向 + 2 帧行走动画
- **新增火把瓦片/装饰**：
  - 在部分墙壁瓦片上绘制火把（`drawTile` 中 WALL 类型增加"火把变体"）
  - 火把：棕色木柄 `#8b4513` + 橙色火焰 `#ff6600`（带 `#ffaa00` 高光），火焰用 `state.animTime` 做闪烁动画
  - 火把位置：每生成一段墙，有 20% 概率在该墙中段添加火把标记
  - 新增 `state.torches` 数组存储火把位置，`drawTorches()` 单独绘制
- **怪物调整 `MONSTER_TYPES` 和 `drawMonster()`**：
  - 史莱姆作为主要怪物（生成权重提高至 60%），其他怪物（蝙蝠/骷髅/哥布林）作为次要
  - 史莱姆样式增强：半透明绿色 `rgba(124, 252, 0, 0.85)` + 高光 `#aaff44` + 暗色描边 `#4a8a00`，保留闲置浮动动画
  - 新增史莱姆"变形"动画：每 2 秒轻微压扁/拉伸（用 `state.animTime` 驱动 `scaleY`）
- **出口图标 `drawTile(EXIT)`**：
  - 改为"向下走廊"样式：黑色长方形 `#000000` + 中间向下的阶梯/箭头图案
  - 上方画一个"拱门"轮廓（深灰 `#3a3a3a` 弧线）
  - 中间画向下的阶梯（3-4 级，逐渐变窄）
  - 底部画一个"向下箭头" `#ffd700` 提示方向
- **保留所有现有逻辑**：
  - 回合制战斗、HP/ATK/DEF/EXP 系统、宝箱、升级、BGM、UI 顶部状态栏
  - 仅替换视觉资源，不改变游戏机制
- **配色统一**：地牢整体偏暗（背景 `#0a0a14`、地板 `#3a3a3a`、墙 `#1a1a1a`、火把橙 `#ff6600`、出口金 `#ffd700`、玩家黑袍+白面具、史莱姆绿）

### 6. 最终 README 更新 + GitHub 推送
- 完成 Task 1-5 后，根据所有改动再次更新 README（特别是 RPG 章节描述、Wasm 修复说明）
- 升级 Service Worker 缓存版本 v14 → v15
- `git add` 所有改动文件，`git commit` 一条总消息，`git push origin main`
- 验证 GitHub Actions 自动部署到 gh-pages 成功
- 验证 https://xiaozhenweiyan.github.io/pixel-tools/ 可访问

## Impact

- **Affected code**：
  - `styles/pixel.css`：新增首页教程按钮右上角样式；新增 `.pixel-dialog` 模态弹窗样式
  - `index.html`：可能在 `param-panel` 内新增 `.pixel-dialog` 容器（或纯 JS 动态创建）
  - `js/app.js`：重写 `addCustomParam()` 使用像素弹窗；新增 `showPixelDialog(title, message, inputConfig, onConfirm)` 通用函数；新增多参数自动创建检测逻辑；收紧参数名为单字母
  - `wasm/reaction-diffusion.js` + `wasm/reaction-diffusion.wasm`：新增已编译文件（方案 A）或在 `js/pixel-art.js` 内联（方案 B）
  - `js/pixel-art.js`：可能调整 `loadWasmModule()` 加载逻辑；优化加载失败提示
  - `js/pixel-rpg.js`：大范围重写 `generateMap` / `drawTile` / `drawPlayer` / `drawMonster` / `drawExit` / 新增 `drawTorches`；调整 `MONSTER_TYPES` 权重
  - `service-worker.js`：`CACHE_VERSION` v14 → v15
  - `README.md`：扩展到 900-1100 行
- **不影响**：预测算法、神经网络（除可视化外）、像素艺术生成器核心算法、计算器、物理沙盒、像素时钟等其他工具
- **不影响**：上一轮 spec 已修复的坐标系自适应刻度、参数面板基础功能、+/- 按钮乘法缩放

## ADDED Requirements

### Requirement: 首页教程按钮右上角定位
系统 SHALL 让首页（`app-landing-page`）的教程按钮显示在视口右上角，按钮宽度仅容纳文字"教程"+ 内边距，不占用全宽。其他页面的教程按钮保持原有底部居中样式不变。

#### Scenario: 首页教程按钮位置
- **WHEN** 用户访问工具首页（`app-landing-page`）
- **THEN** 教程按钮位于视口右上角（`top: 16px; right: 16px`）
- **AND** 按钮宽度为 `auto`，仅容纳"教程"两字 + `padding: 6px 14px`
- **AND** 按钮不与右上角其他元素冲突（首页无 floating-back-btn，无 floating-settings-btn）

#### Scenario: 进入子页面后首页教程按钮不显示
- **WHEN** 用户从首页点击任意卡片进入子页面
- **THEN** 首页 `app-landing-page` 被隐藏（`display: none`）
- **AND** 首页的教程按钮随之隐藏（不显示在任何子页面）
- **AND** 子页面有自己的 `.tutorial-btn`（底部居中）正常显示

### Requirement: 自制像素风模态弹窗
系统 SHALL 提供一个可复用的像素风模态弹窗组件 `.pixel-dialog`，替代浏览器原生 `prompt()` 和 `alert()`，用于函数系统的参数命名和多参数自动创建确认。

#### Scenario: 弹窗外观
- **WHEN** 弹窗显示
- **THEN** 全屏半透明黑色遮罩 `rgba(0,0,0,0.7)`，`z-index: 10002`
- **AND** 居中卡片：深空蓝背景 `#1a1a2e`、3px 金色 `#ffd700` 边框、4px 圆角、4px 4px 0 硬阴影
- **AND** 卡片含标题栏（金色文字 + 关闭 ✕）、内容区、按钮行（确认/取消）
- **AND** 字体为 Courier New，与全站像素风一致

#### Scenario: 弹窗输入
- **WHEN** 弹窗包含输入框
- **THEN** 输入框为像素风（深色背景、金色边框、白色文字）
- **AND** 可设置 `maxlength` 限制输入长度
- **AND** 校验失败时在弹窗内显示红色错误提示，用户可重新输入

### Requirement: 参数名单字母限制
系统 SHALL 限制自定义参数名为单个字母（a-z 或 A-Z），不允许数字、特殊字符或多字符。

#### Scenario: 单字母参数名
- **WHEN** 用户在添加参数弹窗中输入 `k`
- **THEN** 校验通过，参数 `k` 被添加

#### Scenario: 多字母被拒绝
- **WHEN** 用户输入 `abc`
- **THEN** 弹窗内显示红色错误"参数名必须是单个字母"
- **AND** 参数不被添加，弹窗保持打开

#### Scenario: 数字被拒绝
- **WHEN** 用户输入 `x1`
- **THEN** 弹窗内显示红色错误"参数名必须是单个字母"

### Requirement: 多参数自动创建确认弹窗
系统 SHALL 在用户添加含多个参数（≥2）的函数时，自动弹出自制像素弹窗，询问是否自动创建这些参数的滑动条。

#### Scenario: 多参数函数触发弹窗
- **WHEN** 用户输入 `y=a*x^2+b*x+c` 并添加
- **THEN** 函数添加成功后弹出自制像素弹窗
- **AND** 弹窗显示"检测到该函数包含参数：a, b, c。是否自动创建这些参数的滑动条？"
- **AND** 弹窗含"全部创建"和"取消"两个按钮

#### Scenario: 点击全部创建
- **WHEN** 用户点击"全部创建"
- **THEN** a、b、c 三个参数被加入 `customParams`（如果尚未存在）
- **AND** 参数面板立即显示三个滑动条
- **AND** 弹窗关闭

#### Scenario: 点击取消
- **WHEN** 用户点击"取消"
- **THEN** 弹窗关闭，不自动添加参数
- **AND** 用户仍可通过"添加参数"按钮手动添加

#### Scenario: 单参数函数不触发
- **WHEN** 用户输入 `y=a*x^2`（仅 1 个参数）
- **THEN** 不弹窗（参数已自动识别显示滑动条）

#### Scenario: 隐式乘法表达式同样触发
- **WHEN** 用户输入 `y=ax^2+bx+c`（无 `*` 号，隐式乘法）
- **THEN** 表达式解析器（`expression-parser.js`）的 `splitIdentifier` 把 `ax` 拆分为 `[a, x]`、`bx` 拆分为 `[b, x]`，再通过隐式乘法 `parseMulDiv` 组合为 `a*x`、`b*x`
- **AND** `extractParams(ast)` 正确识别参数 a、b、c（共 3 个，≥2）
- **AND** 弹出自制像素弹窗显示"检测到该函数包含参数：a, b, c。是否自动创建这些参数的滑动条？"
- **AND** 点击"全部创建"后 a、b、c 三个滑动条出现

#### Scenario: 隐式乘法与显式乘法混合
- **WHEN** 用户输入 `y=ax^2+b*x+c`（前半隐式、后半显式）
- **THEN** 解析器仍正确识别参数 a、b、c
- **AND** 弹窗正常出现并可全部创建

### Requirement: WebAssembly 加速可用
系统 SHALL 让 WebAssembly 加速功能实际可用，用户在设置页启用"Wasm 加速"后能成功加载 wasm 模块并加速反应扩散模式。

#### Scenario: Wasm 加载成功
- **WHEN** 用户在设置页启用"Wasm 加速"
- **THEN** wasm 模块成功加载（`wasmLoaded = true`）
- **AND** toast 提示"Wasm 加速已启用"
- **AND** 反应扩散模式运行时使用 wasm 版本，性能比 JS 版本提升 3-5 倍

#### Scenario: Wasm 加载失败有明确提示
- **WHEN** Wasm 加载失败（如浏览器不支持或文件缺失）
- **THEN** toast 提示明确说明原因（如"Wasm 文件缺失，已回退到 JS 优化版"）
- **AND** 设置页开关自动回退到关闭状态
- **AND** 反应扩散模式继续工作（JS 版本）

### Requirement: 像素 RPG 地牢风格
系统 SHALL 把像素 RPG 的视觉风格从草地+金色小人改为地牢迷宫+黑衣人，并新增火把和向下走廊出口。

#### Scenario: 地牢迷宫地图
- **WHEN** 用户进入像素 RPG
- **THEN** 地图为迷宫风格（递归回溯或房间+走廊算法生成）
- **AND** 地板为深灰色石板（`#3a3a3a`），墙壁为黑色砖墙（`#1a1a1a` 带高光阴影）
- **AND** 玩家起点在迷宫入口，出口在迷宫终点

#### Scenario: 戴面具黑衣人玩家
- **WHEN** 游戏绘制玩家
- **THEN** 玩家为黑色长袍 + 黑色兜帽 + 白色面具
- **AND** 面具为白色椭圆覆盖脸部，带黑色眼洞
- **AND** 保留 4 方向 + 2 帧行走动画

#### Scenario: 墙上火把
- **WHEN** 地图生成
- **THEN** 部分墙壁上有火把（约 20% 的墙段）
- **AND** 火把为棕色木柄 + 橙色火焰
- **AND** 火焰有闪烁动画（基于 `animTime`）

#### Scenario: 史莱姆为主要怪物
- **WHEN** 怪物生成
- **THEN** 史莱姆生成权重约 60%（其他怪物各 13%）
- **AND** 史莱姆有半透明绿色 + 高光 + 暗描边
- **AND** 史莱姆有变形动画（每 2 秒压扁/拉伸）

#### Scenario: 向下走廊出口
- **WHEN** 绘制出口瓦片
- **THEN** 显示黑色长方形 + 拱门轮廓 + 向下阶梯 + 底部金色向下箭头
- **AND** 不再是原来的蓝色楼梯

### Requirement: README 详细化
系统 SHALL 把 `README.md` 扩展到约 900-1100 行，新增"文件清单"章节（每个 JS 文件一节说明用途）、强化"软件特色"章节、更新 RPG 和 Wasm 章节。

#### Scenario: 文件清单章节
- **WHEN** 用户查看 README
- **THEN** 看到"文件清单"章节，列出所有 JS 文件
- **AND** 每个文件有一节说明用途、关键函数、依赖关系
- **AND** 总数约 25 个文件全部覆盖

#### Scenario: 软件特色强化
- **WHEN** 用户查看"核心特性"或"软件特色"章节
- **THEN** 每条特色配 1-2 句详细说明
- **AND** 突出 PWA、i18n、像素风、纯前端、MCP、Wasm 等亮点

## MODIFIED Requirements

### Requirement: addCustomParam（app.js）
`addCustomParam()` SHALL 使用自制像素风模态弹窗（`.pixel-dialog`）替代 `prompt()` 和 `alert()`。参数名校验从"1-3 字母"收紧为"必须单个字母"。校验失败时在弹窗内显示红色错误提示，用户可重新输入。

### Requirement: addFromInput（app.js）
`addFromInput()` SHALL 在函数添加成功后调用 `ExpressionParser.extractParams(ast)` 检测参数。如果参数数量 ≥ 2，弹出自制像素弹窗询问"是否自动创建这些参数"，用户点击"全部创建"则批量加入 `customParams`。该检测 SHALL 同时支持显式乘法（`y=a*x^2+b*x+c`）和隐式乘法（`y=ax^2+bx+c`）表达式——`expression-parser.js` 已实现 `splitIdentifier` 把 `ax` 拆分为 `[a, x]` 并通过 `parseMulDiv` 的隐式乘法分支组合为 `a*x`，`extractParams` 遍历 AST 即可正确识别参数 a、b、c。

### Requirement: generateMap（pixel-rpg.js）
`generateMap(level)` SHALL 生成地牢迷宫风格地图（递归回溯或房间+走廊算法），地板为深灰石板、墙壁为黑色砖墙。玩家起点在迷宫入口，出口在迷宫终点。墙壁生成时 20% 概率标记火把位置。

### Requirement: drawPlayer（pixel-rpg.js）
`drawPlayer()` SHALL 绘制戴面具的黑衣人：黑色长袍 + 黑色兜帽 + 白色面具 + 黑色眼洞。移除原金色 tunic 和肤色/头发。保留 4 方向 + 2 帧行走动画。

### Requirement: drawTile（pixel-rpg.js）
`drawTile()` SHALL 区分三种瓦片：地牢地板（深灰石板纹理）、黑色砖墙（带砖块缝隙和高光阴影）、向下走廊出口（拱门 + 阶梯 + 金色向下箭头）。

### Requirement: drawMonster（pixel-rpg.js）
`drawMonster()` SHALL 让史莱姆成为主要怪物（60% 生成权重），增强史莱姆视觉（半透明绿 + 高光 + 暗描边 + 变形动画）。其他怪物保留原有样式。

### Requirement: loadWasmModule（pixel-art.js）
`loadWasmModule()` SHALL 能成功加载已编译的 wasm 文件（方案 A）或内联 wasm 字节码（方案 B）。加载失败时 toast 提示明确说明原因。

### Requirement: CACHE_VERSION（service-worker.js）
`CACHE_VERSION` SHALL 从 `'v14'` 升级到 `'v15'`，确保所有新改动（像素弹窗、RPG 地牢、Wasm 修复）能被用户浏览器获取。

## REMOVED Requirements

（无）
