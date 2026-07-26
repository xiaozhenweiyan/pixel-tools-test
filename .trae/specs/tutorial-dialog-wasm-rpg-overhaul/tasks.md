# Tasks

- [x] Task 1: 首页教程按钮移到右上角（styles/pixel.css）
  - [x] SubTask 1.1: 在 `styles/pixel.css` 现有 `.tutorial-btn` 规则之后新增 `.tutorial-btn[data-page="app-landing-page"]` 选择器，覆盖样式：`top: 16px; right: 16px; bottom: auto; left: auto; transform: none; width: auto; max-width: none; padding: 6px 14px;`
  - [x] SubTask 1.2: 验证首页教程按钮显示在右上角，宽度仅容纳"教程"二字 + 内边距
  - [x] SubTask 1.3: 验证其他 22 个页面的教程按钮保持原有底部居中样式不变（不受影响）
  - [x] SubTask 1.4: 验证从首页进入子页面后，首页教程按钮不显示（`app-landing-page` 被隐藏，按钮随之隐藏）

- [x] Task 2: 自制像素风模态弹窗组件（styles/pixel.css + js/app.js）
  - [x] SubTask 2.1: 在 `styles/pixel.css` 新增 `.pixel-dialog-overlay`（全屏半透明黑色遮罩 `rgba(0,0,0,0.7)`、`position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10002; display: flex; align-items: center; justify-content: center;`）
  - [x] SubTask 2.2: 新增 `.pixel-dialog`（深空蓝背景 `#1a1a2e`、3px 金色 `#ffd700` 边框、4px 圆角、4px 4px 0 硬阴影、Courier New 字体、min-width 320px、max-width 480px、padding 16px）
  - [x] SubTask 2.3: 新增 `.pixel-dialog-header`（金色文字、flex 布局、标题 + ✕ 关闭按钮）、`.pixel-dialog-body`（白色文字、padding 12px 0）、`.pixel-dialog-input`（深色背景 `#2d2d44`、金色边框、白色文字、像素风）、`.pixel-dialog-error`（红色 `#ff4500` 文字、min-height 18px）、`.pixel-dialog-actions`（flex row、gap 8px、右对齐）、`.pixel-dialog-btn`（像素风按钮，确认按钮金色背景、取消按钮透明边框）
  - [x] SubTask 2.4: 在 `js/app.js` 新增通用函数 `showPixelDialog(config)`：config 含 `{ title, message, inputConfig (可选 {maxlength, placeholder}), confirmText, cancelText, onConfirm(inputValue), validate(inputValue) → errorMessage }`。函数动态创建 DOM 元素，挂载到 `document.body`，返回控制句柄；点关闭/取消/遮罩移除 DOM
  - [x] SubTask 2.5: 验证调用 `showPixelDialog({title:'测试', message:'输入字母', inputConfig:{maxlength:1}})` 弹出像素风弹窗，外观符合规范，关闭后 DOM 被清理

- [x] Task 3: 重写 addCustomParam 使用像素弹窗 + 单字母限制（js/app.js）
  - [x] SubTask 3.1: 修改 `addCustomParam()`：移除 `prompt()` 调用，改为调用 `showPixelDialog()`，配置：title="添加参数"、message="请输入参数名（单个字母，不能用 x / pi / e 等保留字）"、inputConfig={maxlength:1, placeholder:'k'}、confirmText="添加"、cancelText="取消"
  - [x] SubTask 3.2: 修改校验逻辑：`validate(inputValue)` 函数返回错误信息。校验规则：(a) 非空 → "参数名不能为空"；(b) 单字母 `/^[a-zA-Z]$/` → 否则 "参数名必须是单个字母"；(c) 保留字 `['x','pi','e','sin','cos','tan','log','sqrt','abs','exp','ln']` → "{name} 是保留字"；(d) 重复 → "参数 {name} 已存在"
  - [x] SubTask 3.3: `onConfirm(inputValue)` 函数：校验通过后把 `{name: nameLower, value: 1, min: -10, max: 10, step: 0.1, phase: Math.random()*Math.PI*2}` 加入 `fps.customParams`，同步 `params[nameLower]`，调用 `renderParamSliders()` + `applyParamsToActive()`
  - [x] SubTask 3.4: 移除原有 `alert()` 调用（所有错误改为 `validate` 返回值，由弹窗内显示）
  - [x] SubTask 3.5: 验证点击"添加参数"弹出像素弹窗（不是浏览器原生 prompt）
  - [x] SubTask 3.6: 验证输入 `k` → 点击"添加" → 弹窗关闭，参数面板出现 k 滑动条
  - [x] SubTask 3.7: 验证输入 `abc` → 弹窗内显示红色"参数名必须是单个字母"，弹窗保持打开
  - [x] SubTask 3.8: 验证输入 `x` → 弹窗内显示"x 是保留字"
  - [x] SubTask 3.9: 验证输入已存在的参数名 → 弹窗内显示"参数 {name} 已存在"

- [x] Task 4: 多参数自动创建确认弹窗（js/app.js）
  - [x] SubTask 4.1: 修改 `addFromInput()`：函数添加成功后，从 `result.ast` 调用 `window.ExpressionParser.extractParams(ast)` 获取参数数组
  - [x] SubTask 4.2: 如果参数数组长度 ≥ 2，调用 `showPixelDialog()`：title="检测到多个参数"、message="检测到该函数包含参数：{a, b, c}。是否自动创建这些参数的滑动条？"、confirmText="全部创建"、cancelText="取消"（无 inputConfig）
  - [x] SubTask 4.3: `onConfirm()` 函数：遍历参数数组，对每个参数检查 `getActiveParamNames()` 是否已存在，不存在则加入 `fps.customParams`（默认配置同 Task 3），最后调用 `renderParamSliders()` + `applyParamsToActive()`
  - [x] SubTask 4.4: 如果参数数组长度 < 2，不弹窗（参数已自动识别显示）
  - [x] SubTask 4.5: 验证输入 `y=a*x^2+b*x+c`（显式乘法）→ 函数添加后弹出"检测到多个参数"弹窗
  - [x] SubTask 4.6: 验证输入 `y=ax^2+bx+c`（隐式乘法，无 `*` 号）→ 同样弹出"检测到多个参数"弹窗，参数识别为 a、b、c（依赖 `expression-parser.js` 的 `splitIdentifier` 拆分 `ax`/`bx` + `parseMulDiv` 隐式乘法分支）
  - [x] SubTask 4.7: 验证输入 `y=ax^2+b*x+c`（混合隐式+显式）→ 弹窗正常出现，参数识别为 a、b、c
  - [x] SubTask 4.8: 验证点击"全部创建" → a、b、c 三个滑动条出现，弹窗关闭
  - [x] SubTask 4.9: 验证输入 `y=a*x^2`（单参数）→ 不弹窗
  - [x] SubTask 4.10: 验证点击"取消" → 弹窗关闭，不自动添加（但参数仍由 extractParams 自动识别显示）

- [x] Task 5: 修复 WebAssembly 加速（wasm/ 或 js/pixel-art.js）
  - [x] SubTask 5.1: 检查沙箱是否有 `emcc` 命令：`which emcc`。若有，执行 `cd /workspace/pixel-tools/wasm && bash build.sh` 编译生成 `reaction-diffusion.js` 和 `reaction-diffusion.wasm`
  - [x] SubTask 5.2: 如果方案 A 不可行（无 emcc），实施方案 B：在 `js/pixel-art.js` 顶部内联一个手写的 WAT 编译为 wasm 字节码的反应扩散模块（或用纯 JS 优化版替代，使用 Float32Array + 内联拉普拉斯计算，避免函数调用开销）
  - [x] SubTask 5.3: 如果方案 B 实施困难，实施方案 C：在 `js/pixel-art.js` 中把"启用 Wasm"按钮的 toast 提示从模糊的"加载失败"改为明确的"Wasm 文件缺失，已回退到 JS 优化版"；同时优化 JS 版本的 `drawReactionDiffusionJS` 函数（用 Float32Array 替代普通数组、内联 laplacian 计算、避免 Math.random 在循环内）
  - [x] SubTask 5.4: 验证在设置页启用"Wasm 加速"开关后，控制台不再出现 404 错误
  - [x] SubTask 5.5: 验证反应扩散模式运行时，控制台显示 `[WasmRD]` 日志（方案 A/B 成功）或 JS 优化版运行更流畅（方案 C）
  - [x] SubTask 5.6: 验证加载失败时 toast 提示明确说明原因

- [x] Task 6: README.md 详细化（README.md）
  - [x] SubTask 6.1: 在现有"项目结构"章节之后新增"文件清单"章节，为以下 25 个文件各写一节（用途 + 关键函数 + 依赖）
  - [x] SubTask 6.2: 强化"核心特性"章节：每条特色配 1-2 句详细说明，突出 PWA、i18n、像素风、纯前端、MCP、Wasm、像素弹窗、参数动画、坐标系自适应等亮点
  - [x] SubTask 6.3: 更新"工具目录"章节：把 RPG 描述改为"地牢迷宫探险，戴面具黑衣人闯关，回合制战斗，墙上火把照亮前路"
  - [x] SubTask 6.4: 更新"WebAssembly 加速"章节：说明已修复（编译文件已提交仓库 / 内联加载机制）、加载流程、性能对比
  - [x] SubTask 6.5: 更新"教程系统"章节：说明首页教程按钮在右上角，其他页面在底部居中
  - [x] SubTask 6.6: 新增"函数系统参数弹窗"章节：说明自制像素弹窗、单字母参数限制、多参数自动创建检测
  - [x] SubTask 6.7: 验证 README 总行数扩展到 900-1100 行
  - [x] SubTask 6.8: 验证每个文件节都有"用途"+"关键函数"+"依赖"三部分

- [x] Task 7: 像素 RPG 地牢重写（js/pixel-rpg.js）— **单独 sub-agent 完成**
  - [x] SubTask 7.1: 重写 `generateMap(level)`：用递归回溯算法生成迷宫（地图尺寸保持 20x15），地板用 `TILE.FLOOR`（深灰 `#3a3a3a`），墙壁保持 `TILE.WALL` 但改色（主色 `#1a1a1a`、高光 `#2a2a2a`、阴影 `#000000`）；移除 `TILE.GRASS`；玩家起点为迷宫入口（左上空地），出口为迷宫终点（右下空地）
  - [x] SubTask 7.2: 新增 `TILE.FLOOR` 常量，新增 `state.torches = []` 数组存储火把位置（{gx, gy}）；在迷宫生成时对每个墙段以 20% 概率在中段添加火把标记
  - [x] SubTask 7.3: 重写 `drawTile(gx, gy, type)`：FLOOR 类型绘制深灰石板纹理（带细微斑点）；WALL 类型绘制黑色砖墙（更明显的高光/阴影/砖块缝隙）；EXIT 类型绘制"向下走廊"（黑色长方形 + 拱门轮廓 + 向下阶梯 + 底部金色向下箭头）
  - [x] SubTask 7.4: 重写 `drawPlayer(px, py, facing, frame)`：黑色长袍 `#0a0a0a`（身体）、黑色兜帽 `#0a0a0a`（头部上方）、白色面具 `#f0f0f0`（覆盖脸部椭圆）、黑色眼洞（根据朝向位置不同）；移除原有金色 tunic、肤色、头发；保留阴影、4 方向、2 帧行走动画（腿偏移逻辑保留）
  - [x] SubTask 7.5: 新增 `drawTorches()` 函数：遍历 `state.torches`，在每个火把位置绘制棕色木柄 `#8b4513`（竖条）+ 橙色火焰 `#ff6600`（带 `#ffaa00` 高光），火焰大小基于 `Math.sin(state.animTime * 8 + torch.gx)` 做闪烁动画
  - [x] SubTask 7.6: 调整 `MONSTER_TYPES` 生成权重：史莱姆 60%（颜色改为半透明绿 `rgba(124, 252, 0, 0.85)`、高光 `#aaff44`、暗描边 `#4a8a00`）；其他怪物各约 13%；在 `drawMonster` 中为史莱姆新增"变形"动画（`scaleY` 基于 `Math.sin(state.animTime * 3)` 在 0.85-1.15 之间变化）
  - [x] SubTask 7.7: 在主渲染循环中调用 `drawTorches()`（在 `drawTile` 之后、`drawMonster` 之前）
  - [x] SubTask 7.8: 调整 `COLOR` 常量：BG 改为 `#0a0a14`，GRASS 相关常量可保留但不再使用（或删除并新增 FLOOR 系列），WALL 系列改为更暗的黑色
  - [x] SubTask 7.9: 保留所有游戏机制不变：回合制战斗、HP/ATK/DEF/EXP、宝箱、升级、BGM、UI 顶部状态栏、移动/碰撞检测
  - [x] SubTask 7.10: 用 `node -c js/pixel-rpg.js` 验证语法通过
  - [x] SubTask 7.11: 验证游戏可启动：进入像素 RPG 页面，地图显示地牢迷宫风格（黑色砖墙、深灰地板、火把闪烁）
  - [x] SubTask 7.12: 验证玩家外观为黑衣人 + 白面具
  - [x] SubTask 7.13: 验证怪物以史莱姆为主，史莱姆有变形动画
  - [x] SubTask 7.14: 验证出口为向下走廊图标
  - [x] SubTask 7.15: 验证战斗、宝箱、升级、下楼等机制正常工作

- [ ] Task 8: 升级 Service Worker 缓存版本 + 最终 README 更新 + 推送 GitHub
  - [ ] SubTask 8.1: 修改 `service-worker.js` 第 13 行 `CACHE_VERSION` 从 `'v14'` 改为 `'v15'`
  - [ ] SubTask 8.2: 用 `node -c service-worker.js` 验证语法通过
  - [ ] SubTask 8.3: 根据 Task 1-7 的最终改动状态，再次审查 README.md 是否需要补充（特别是 RPG 地牢风格描述、Wasm 修复说明、像素弹窗说明）
  - [ ] SubTask 8.4: `git status` 查看所有改动文件
  - [ ] SubTask 8.5: `git add` 所有改动文件（js/app.js、js/pixel-rpg.js、js/pixel-art.js、styles/pixel.css、service-worker.js、README.md、wasm/* 新文件、.trae/specs/tutorial-dialog-wasm-rpg-overhaul/*）
  - [ ] SubTask 8.6: `git commit` 一条总消息，遵循 conventional commit 风格
  - [ ] SubTask 8.7: `git push origin main` 推送到 GitHub
  - [ ] SubTask 8.8: 验证 GitHub Actions 自动部署到 gh-pages 成功（查看 Actions 页面或等待几分钟后访问 https://xiaozhenweiyan.github.io/pixel-tools/）
  - [ ] SubTask 8.9: 验证 https://xiaozhenweiyan.github.io/pixel-tools/ 可访问，首页教程按钮在右上角，进入 RPG 看到地牢风格

# Task Dependencies

- [Task 1] 独立（CSS 修改）
- [Task 2] 独立（CSS + JS 弹窗组件，可并行）
- [Task 3] depends on [Task 2]（addCustomParam 使用 showPixelDialog）
- [Task 4] depends on [Task 2]（多参数弹窗使用 showPixelDialog）
- [Task 5] 独立（Wasm 修复，可并行）
- [Task 6] 独立（README 详细化，可并行；但最终审查在 Task 8）
- [Task 7] 独立（RPG 重写，**单独 sub-agent 完成**，可与其他任务并行）
- [Task 8] depends on [Task 1, 2, 3, 4, 5, 6, 7]（最后统一推送）
