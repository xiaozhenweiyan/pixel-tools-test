# 像素工具大型更新 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 函数系统参数滑块 UI 与参数检测
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在函数系统页面的函数输入面板下方新增参数滑块区域
  - 自动检测函数表达式中的参数变量（a, b, c, d 等单字母，排除 x 与 Math 函数保留字）
  - 每个滑块显示参数名、当前值、范围标签
  - 滑块值变化实时重绘函数图像
  - 多函数时取所有函数的参数并集
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 输入 y=a*sin(x) 后显示 a 的滑块，拖动时图像实时变化
  - `human-judgement` TR-1.2: 输入 y=a*x+b 后显示 a 和 b 两个滑块
  - `programmatic` TR-1.3: 参数检测函数正确识别 a/b/c/d，不把 x/sin/cos 识别为参数
- **Notes**: 默认范围 -10 到 10，步长 0.1，默认值 1

## [ ] Task 2: 参数滑块设置与动画往复
- **Priority**: high
- **Depends On**: [Task 1]
- **Description**:
  - 每个滑块旁有设置按钮，可修改 min、max、step
  - 全局动画播放/暂停按钮，点击后所有参数滑块在各自 min-max 之间往复
  - 动画速度可调（快/中/慢 或 BPM 滑块）
  - 往复用 sin 波形平滑过渡
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 点击设置可修改滑块范围，修改后滑块范围更新
  - `human-judgement` TR-2.2: 点击播放按钮，滑块自动往复，图像实时变化
  - `human-judgement` TR-2.3: 速度调节生效，动画快慢变化

## [ ] Task 3: 首页艺术类重构为分组
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 工具首页艺术类（ART）拆分为两个子分组
  - 像素图画 PIXEL DRAWING 分组：像素艺术生成器卡片 + 像素绘图编辑器卡片
  - 像素音乐 PIXEL MUSIC 分组：像素音乐合成器卡片
  - 子分组标题样式与学习类分类标题一致
  - 每个子分组内卡片纵向排列
  - app.js 更新页面切换逻辑（新增 art-drawing-landing / art-music-landing 中间页）
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 工具首页艺术类显示"像素图画"和"像素音乐"两个分组标题
  - `human-judgement` TR-3.2: 每个分组下有对应卡片，点击卡片进入对应工具页
  - `human-judgement` TR-3.3: 样式与学习类分组保持一致

## [ ] Task 4: 像素艺术生成器新增 4 种算法
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新增 L-system 分形树模式（递归分支，参数：递归深度、分支角度、长度衰减率、初始长度）
  - 新增 Voronoi 镶嵌模式（随机种子点 + Lloyd 松弛，按细胞到中心距离/细胞大小配色）
  - 新增波干涉 Wave Interference 模式（多波源叠加，振幅映射到调色板颜色）
  - 新增反应扩散 Reaction-Diffusion 模式（Gray-Scott 模型，迭代生成斑图）
  - 每种模式添加到 art-mode 下拉选择中
  - 每种模式有对应参数滑块
  - 全部种子化随机，可复现
  - 使用 p5.js 实例模式，与现有代码风格一致
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 下拉菜单中有 8 种模式（原 4 + 新 4）
  - `human-judgement` TR-4.2: 每种新模式能正常生成对应风格图像
  - `human-judgement` TR-4.3: 相同种子产生相同图像
  - `human-judgement` TR-4.4: 每种模式有合理的参数控制

## [ ] Task 5: 像素绘图编辑器 - 画布与基础工具
- **Priority**: high
- **Depends On**: [Task 3]
- **Description**:
  - 新建 pixel-drawing-editor.js 模块
  - index.html 新增 pixel-drawing-page 页面结构
  - Canvas 网格编辑器（默认 32×32，可调 16/32/64/128）
  - CSS image-rendering: pixelated 放大显示
  - 基础工具：画笔（左击绘画）、橡皮、取色器、填色桶
  - 工具切换按钮栏
  - 像素风 16 色调色板
  - 自定义颜色选择器
  - 当前颜色指示器
  - 网格线显示开关
  - 清空画布按钮
  - 导出 PNG 按钮
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 画笔工具可在画布上绘制像素
  - `human-judgement` TR-5.2: 橡皮工具可擦除像素
  - `human-judgement` TR-5.3: 取色器可从画布取色
  - `human-judgement` TR-5.4: 填色桶可填充连通区域
  - `human-judgement` TR-5.5: 调色板点击切换颜色
  - `human-judgement` TR-5.6: 导出 PNG 功能正常

## [ ] Task 6: 像素绘图编辑器 - 进阶功能
- **Priority**: medium
- **Depends On**: [Task 5]
- **Description**:
  - 撤销 / 重做（最多 50 步历史栈）
  - 键盘快捷键：Ctrl+Z 撤销 / Ctrl+Y 重做 / B 画笔 / E 橡皮 / G 网格切换
  - 直线工具（点击两点画直线，Bresenham 算法）
  - 矩形工具（点击拖动画矩形）
  - 圆形工具（点击拖动画圆）
  - 镜像绘画（水平镜像，可选开启）
  - 右键取色
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-6.1: Ctrl+Z 撤销上一步操作，Ctrl+Y 重做
  - `human-judgement` TR-6.2: 直线/矩形/圆形工具可正常绘制
  - `human-judgement` TR-6.3: 镜像绘画开启后左右对称绘制
  - `human-judgement` TR-6.4: 右键点击画布取色

## [ ] Task 7: 像素音乐合成器 - 钢琴键盘与音色
- **Priority**: high
- **Depends On**: [Task 3]
- **Description**:
  - 新建 pixel-music.js 模块
  - index.html 新增 pixel-music-page 页面结构
  - Web Audio API 创建 AudioContext
  - 4 种音色：方波（square）、三角波（triangle）、锯齿波（sawtooth）、噪声（noise）
  - 两个八度钢琴键盘 UI（白键 + 黑键）
  - 鼠标点击发声（按下发声，松开停止，ADSR 包络）
  - 键盘按键映射（A S D F G H J K L = 白键，W E T Y U O = 黑键）
  - 音量滑块
  - 八度切换（+1 / -1）
  - 波形可视化示波器（Canvas 实时绘制波形）
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 点击钢琴键发出对应音高的声音
  - `human-judgement` TR-7.2: 键盘按键可演奏
  - `human-judgement` TR-7.3: 4 种音色切换生效
  - `human-judgement` TR-7.4: 音量滑块调节生效
  - `human-judgement` TR-7.5: 示波器显示波形

## [ ] Task 8: 像素音乐合成器 - Sequencer
- **Priority**: medium
- **Depends On**: [Task 7]
- **Description**:
  - 16 步 × 4 轨网格 Sequencer
  - 每轨可选择音色
  - 点击格子添加/移除音符
  - 播放/停止按钮
  - BPM 滑块（60-200，默认 120）
  - 当前步高亮指示
  - 每轨音量控制
  - 循环播放
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgement` TR-8.1: Sequencer 网格点击可添加/移除音符
  - `human-judgement` TR-8.2: 播放时按节奏发声，当前步高亮
  - `human-judgement` TR-8.3: BPM 调节生效
  - `human-judgement` TR-8.4: 4 轨独立播放，音色可选

## [ ] Task 9: 函数系统与计算器安全加固
- **Priority**: high
- **Depends On**: None
- **Description**:
  - function-plotter.js 表达式解析升级：从简单字符串替换升级为 token 级解析 + AST 评估
  - 支持的 token：数字、x、+ - * / ^ ( )、Math 函数名、常量 PI/E
  - 递归深度限制（防栈溢出）
  - 执行超时保护（try-catch + 手动计步）
  - 计算器 computeStepsWithTrace 同样加固
  - 更新安全审查报告
- **Acceptance Criteria Addressed**: [AC-12]
- **Test Requirements**:
  - `programmatic` TR-9.1: 输入 `y=x; alert(1)` 不执行 alert，返回语法错误
  - `programmatic` TR-9.2: 输入超长嵌套表达式不导致栈溢出
  - `programmatic` TR-9.3: 恶意构造如 `constructor.constructor` 不可达
  - `human-judgement` TR-9.4: 安全审查报告更新，记录加固措施

## [ ] Task 10: 中英文双语国际化 (i18n)
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 js/i18n.js 模块，提供 i18n.t(key) 翻译函数
  - 翻译数据：中文 zh 和英文 en 两套，覆盖所有 UI 文字
  - 自动检测系统语言：navigator.language，zh/zh-CN/zh-TW → 中文，其他 → 英文
  - 设置页新增语言下拉框：跟随系统 / 中文 / 英文
  - 语言选择持久化到 localStorage（key: pixel_tools_lang，值：'auto' | 'zh' | 'en'）
  - HTML 静态文字用 data-i18n="key" 标记，初始化时自动替换
  - JS 动态文字统一用 i18n.t('key') 获取
  - 切换语言时：扫描所有 data-i18n 元素重新填充，更新 document.title
  - index.html 加载 i18n.js（在 app.js 之前）
  - 所有页面文字都走翻译（标题、按钮、标签、提示、toast、帮助文本等）
  - 用户输入内容（如函数表达式、计算器输入）不翻译
- **Acceptance Criteria Addressed**: [AC-13, AC-14, AC-15]
- **Test Requirements**:
  - `human-judgement` TR-10.1: 中文系统访问显示中文界面
  - `human-judgement` TR-10.2: 英文系统访问显示英文界面
  - `human-judgement` TR-10.3: 设置页语言下拉切换实时生效
  - `programmatic` TR-10.4: localStorage 中保存语言偏好，刷新后保持
  - `human-judgement` TR-10.5: 所有页面文字正确翻译，无遗漏

## [ ] Task 12: WebAssembly 反应扩散加速
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 新建 wasm/ 目录
  - 用 C 语言写 reaction-diffusion.c：Gray-Scott 模型核心迭代循环
  - 用 Emscripten 编译为 reaction-diffusion.wasm + 胶水 JS
  - 编译脚本 build.sh（含 emcc 命令）
  - JS 端封装 WasmReactionDiffusion 类，接口与 JS 版一致
  - 像素艺术生成器的反应扩散模式：开关开启时用 Wasm，否则用 JS
  - 设置页新增"Wasm 加速"开关（仅 WebAssembly 支持时显示）
  - 开关状态存 localStorage，默认关闭
  - Wasm 加载失败自动回退 JS 版本
  - 提供预编译好的 .wasm 文件（本地先编译好再提交）
- **Acceptance Criteria Addressed**: [AC-16, AC-17]
- **Test Requirements**:
  - `human-judgement` TR-12.1: 设置页有 Wasm 加速开关（支持时显示）
  - `human-judgement` TR-12.2: 开启后反应扩散模式使用 Wasm 计算
  - `programmatic` TR-12.3: Wasm 加载失败时自动回退 JS，不报错
  - `human-judgement` TR-12.4: 开关状态刷新后保持
  - `programmatic` TR-12.5: 相同种子 + 相同参数，Wasm 与 JS 版本输出视觉一致

## [ ] Task 13: 学习系统首页 + 数学学习卡片分组
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 像素数学首页新增"学习系统"卡片（SVG 图标：书本/灯泡图案）
  - 点击进入学习系统首页（learning-landing-page）
  - 学习系统首页结构与像素数学首页类似
  - "数学学习卡片 MATH CARDS" 分组标题
  - 分组下含：四则运算学习卡片、混合运算学习卡片
  - 各卡片有 SVG 图标、标题、描述
  - app.js 新增页面切换逻辑
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `human-judgement` TR-10.1: 像素数学首页有"学习系统"卡片
  - `human-judgement` TR-10.2: 点击进入学习系统首页，显示数学学习卡片分组
  - `human-judgement` TR-10.3: 分组下有四则运算和混合运算两张卡片
  - `human-judgement` TR-10.4: 页面风格与像素数学首页一致

## [ ] Task 14: 四则运算学习卡片
- **Priority**: high
- **Depends On**: [Task 13]
- **Description**:
  - 新建 math-cards.js 模块
  - 四则运算学习页面（arithmetic-page）
  - 题型选择：加法 / 减法 / 乘法 / 除法（顶部 tab 切换）
  - 每种 20 关，难度递增（数字范围逐步扩大）
  - 每页一题，输入框 + 提交按钮
  - 答对：金色星星动画 + 0.5s 后自动进入下一题
  - 答错：红色抖动提示 + 显示正确答案 + 继续按钮
  - 进度条显示当前关卡
  - 结果页：正确数 / 错误数 / 星级评价 / 错题回顾 / 再来一次按钮
  - 星级：全对 3 星 / 错 1-2 题 2 星 / 错 3+ 题 1 星
  - 像素风动画：题目从上方滑入，答对有粒子效果
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `human-judgement` TR-11.1: 4 种运算类型可切换
  - `human-judgement` TR-11.2: 答对显示庆祝动画并进入下一题
  - `human-judgement` TR-11.3: 答错显示正确答案
  - `human-judgement` TR-11.4: 进度条正确显示进度
  - `human-judgement` TR-11.5: 完成 20 关后显示结果页，含星级评价
  - `human-judgement` TR-11.6: 动画流畅，像素风一致

## [ ] Task 15: 混合运算学习卡片
- **Priority**: high
- **Depends On**: [Task 14]
- **Description**:
  - 混合运算学习页面（mixed-arithmetic-page）
  - 难度分级：简单 / 中等 / 困难
    - 简单：2 个数加减混合
    - 中等：3 个数乘除 + 加减混合
    - 困难：4 个数 + 括号四则混合
  - 每级 15 关
  - 复用四则运算卡片的动画框架（滑入/答对/答错/进度条/结果页）
  - 题目随机生成，确保答案为整数（除法整除）
  - 结果页显示正确答案与运算过程
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `human-judgement` TR-12.1: 简单/中等/困难三档难度可选
  - `human-judgement` TR-12.2: 每关题目难度与选择一致
  - `human-judgement` TR-12.3: 动画效果与四则运算卡片一致
  - `human-judgement` TR-12.4: 完成后显示结果页和星级
  - `programmatic` TR-12.5: 题目答案为整数，无除不尽情况

## [ ] Task 16: 移动端响应式适配
- **Priority**: high
- **Depends On**: None
- **Description**:
  - viewport meta 标签完善：添加 user-scalable=no（禁用双击缩放）
  - pixel.css 新增移动端媒体查询（断点：480px / 768px / 1024px）
  - 双栏布局在 768px 以下变为单栏
  - 卡片在 480px 以下宽度 100%
  - 字体大小响应式调整
  - 按钮最小触控尺寸 44×44px
  - 函数系统触摸支持：单指拖拽平移、双指捏合缩放
  - 像素绘图编辑器触摸支持：单指绘画
  - 折线图触摸支持：单指拖拽
  - 钢琴键盘触摸优化：键宽自适应
  - 虚拟键盘弹出时页面不被顶飞（输入框 scrollIntoView）
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `human-judgement` TR-13.1: 768px 以下双栏变单栏
  - `human-judgement` TR-13.2: 所有按钮在手机上可点击（≥44px）
  - `human-judgement` TR-13.3: 函数系统单指拖拽、双指缩放生效
  - `human-judgement` TR-13.4: 像素绘图编辑器手指可绘画
  - `human-judgement` TR-13.5: 页面不溢出，无横向滚动条

## [ ] Task 17: PWA 支持
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 manifest.json（名称：像素工具 / Pixel Tools，短名：PixelTools）
  - 创建 192×192 和 512×512 像素风图标（用 canvas 程序生成）
  - 创建 service-worker.js（缓存静态资源：HTML/CSS/JS/CDN p5.js）
  - Cache-First 策略 + 网络回退
  - index.html 注册 Service Worker
  - index.html 添加 manifest link
  - 主题色 #1a1a2e
  - 显示模式：standalone
  - 启动画面背景色与主题一致
- **Acceptance Criteria Addressed**: [AC-10]
- **Test Requirements**:
  - `programmatic` TR-14.1: manifest.json 存在且格式正确
  - `programmatic` TR-14.2: service-worker.js 存在，注册代码已添加
  - `human-judgement` TR-14.3: 图标为像素风，与品牌一致
  - `human-judgement` TR-14.4: 可添加到主屏幕
  - `human-judgement` TR-14.5: 离线时已缓存页面可打开

## [ ] Task 18: 更新 README.md
- **Priority**: medium
- **Depends On**: [Task 4, Task 5, Task 7, Task 10, Task 12, Task 13, Task 14, Task 16, Task 17]
- **Description**:
  - 功能列表新增：像素绘图编辑器、像素音乐合成器、生成器 4 种新算法
  - 功能列表新增：学习系统（四则运算卡片、混合运算卡片）
  - 功能列表新增：函数系统参数滑块 + 动画
  - 功能列表新增：移动端适配 + PWA
  - 功能列表新增：中英文双语国际化
  - 功能列表新增：WebAssembly 加速（反应扩散试点）
  - 更新页面结构图（含艺术类分组、学习系统分组）
  - 更新文件结构（新增 js/pixel-drawing-editor.js、js/pixel-music.js、js/math-cards.js、js/i18n.js、wasm/、manifest.json、service-worker.js、icons/）
  - 更新使用说明
- **Acceptance Criteria Addressed**: [AC-11]
- **Test Requirements**:
  - `programmatic` TR-15.1: README.md 包含所有新功能说明
  - `programmatic` TR-15.2: 页面结构图和文件结构已更新
  - `human-judgement` TR-15.3: 内容准确无误

## [ ] Task 19: 提交并推送 GitHub
- **Priority**: high
- **Depends On**: [Task 1-18]
- **Description**:
  - 所有改动分组创建 conventional commits
  - 推送到 origin main 和 gh-pages
  - 验证 GitHub Pages 可访问
  - 验证所有新功能在线上生效
- **Acceptance Criteria Addressed**: [AC-11]
- **Test Requirements**:
  - `programmatic` TR-16.1: git push 成功
  - `programmatic` TR-16.2: GitHub Pages 返回 HTTP 200
  - `human-judgement` TR-16.3: 线上页面包含所有新功能

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 5]
- [Task 7] depends on [Task 3]
- [Task 8] depends on [Task 7]
- [Task 14] depends on [Task 13]
- [Task 15] depends on [Task 14]
- [Task 18] depends on [Task 4, Task 5, Task 7, Task 10, Task 12, Task 13, Task 14, Task 16, Task 17]
- [Task 19] depends on all

# 可并行任务
- Task 1/4/9/10/12/13/16/17 可并行（独立模块）
- Task 3 独立（首页重构）
- Task 2 等 Task 1
- Task 5/7 等 Task 3
