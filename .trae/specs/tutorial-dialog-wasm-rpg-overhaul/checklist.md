# Checklist

## 首页教程按钮右上角
- [x] `styles/pixel.css` 新增 `.tutorial-btn[data-page="app-landing-page"]` 选择器
- [x] 样式包含 `top: 16px; right: 16px; bottom: auto; left: auto; transform: none;`
- [x] 样式包含 `width: auto; max-width: none; padding: 6px 14px;`
- [x] 首页教程按钮显示在视口右上角
- [x] 按钮宽度仅容纳"教程"二字 + 内边距
- [x] 其他 22 个页面的教程按钮保持原有底部居中样式
- [x] 进入子页面后首页教程按钮不显示

## 像素风模态弹窗组件
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-overlay`（全屏半透明黑色遮罩）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog`（深空蓝背景 + 金色边框 + 硬阴影）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-header`（金色文字 + ✕ 关闭按钮）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-body`（白色文字）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-input`（深色背景 + 金色边框 + 白色文字）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-error`（红色错误提示）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-actions`（按钮行 flex 布局）
- [ ] `styles/pixel.css` 新增 `.pixel-dialog-btn`（像素风按钮，确认金色 / 取消透明）
- [ ] `z-index: 10002`（高于教程模态框 10001）
- [ ] 字体为 Courier New
- [ ] `js/app.js` 新增 `showPixelDialog(config)` 通用函数
- [ ] 函数支持 title、message、inputConfig、confirmText、cancelText、onConfirm、validate
- [ ] 函数动态创建 DOM 挂载到 `document.body`，关闭时移除
- [ ] 点关闭 ✕ / 取消按钮 / 遮罩都能关闭弹窗

## addCustomParam 改用像素弹窗 + 单字母限制
- [ ] `addCustomParam()` 移除 `prompt()` 调用
- [ ] `addCustomParam()` 移除所有 `alert()` 调用
- [ ] 改为调用 `showPixelDialog()` 弹出像素弹窗
- [ ] inputConfig 设 `maxlength: 1`
- [ ] 校验规则 (a) 非空 → "参数名不能为空"
- [ ] 校验规则 (b) `/^[a-zA-Z]$/` → 否则 "参数名必须是单个字母"
- [ ] 校验规则 (c) 保留字列表 `['x','pi','e','sin','cos','tan','log','sqrt','abs','exp','ln']`
- [ ] 校验规则 (d) 重复 → "参数 {name} 已存在"
- [ ] 校验失败时弹窗内显示红色错误提示，弹窗保持打开
- [ ] 校验通过后参数加入 `fps.customParams`
- [ ] 调用 `renderParamSliders()` + `applyParamsToActive()`
- [ ] 输入 `k` → 添加成功，滑动条出现
- [ ] 输入 `abc` → 显示"参数名必须是单个字母"
- [ ] 输入 `x1` → 显示"参数名必须是单个字母"
- [ ] 输入 `x` → 显示"x 是保留字"
- [ ] 输入已存在参数 → 显示"参数 {name} 已存在"

## 多参数自动创建确认弹窗
- [ ] `addFromInput()` 中函数添加成功后调用 `ExpressionParser.extractParams(ast)`
- [ ] 参数数量 ≥ 2 时弹出自制像素弹窗
- [ ] 弹窗 message 显示参数列表（如 "a, b, c"）
- [ ] 弹窗含"全部创建"和"取消"按钮
- [ ] 点击"全部创建"：每个参数加入 `customParams`（去重）
- [ ] 点击"全部创建"后调用 `renderParamSliders()` + `applyParamsToActive()`
- [ ] 点击"取消"：弹窗关闭，不自动添加
- [ ] 单参数函数（如 `y=a*x^2`）不触发弹窗
- [ ] 显式乘法：输入 `y=a*x^2+b*x+c` → 弹窗出现
- [ ] 显式乘法：点击"全部创建" → a、b、c 三个滑动条出现
- [ ] 隐式乘法：输入 `y=ax^2+bx+c`（无 `*` 号）→ 弹窗出现
- [ ] 隐式乘法：点击"全部创建" → a、b、c 三个滑动条出现
- [ ] 隐式乘法：`splitIdentifier` 把 `ax` 拆为 `[a, x]`、`bx` 拆为 `[b, x]` 验证通过
- [ ] 隐式乘法：`parseMulDiv` 的 `isValueStarter` 检测正确插入 `*` 操作符
- [ ] 隐式乘法：`extractParams(ast)` 正确收集到 a、b、c 三个 Param 节点
- [ ] 混合乘法：输入 `y=ax^2+b*x+c`（前隐式后显式）→ 弹窗出现
- [ ] 混合乘法：点击"全部创建" → a、b、c 三个滑动条出现
- [ ] 混合乘法：输入 `y=a*x^2+bx+c`（前显式后隐式）→ 弹窗出现
- [ ] 混合乘法：点击"全部创建" → a、b、c 三个滑动条出现
- [ ] 三项式隐式乘法：输入 `y=ax^2+bx+c` 在已有 a 滑动条时点击"全部创建" → 仅新增 b、c（去重）
- [ ] 隐式乘法嵌套：输入 `y=abx^2+cdx+ef`（共 6 个参数）→ 弹窗出现并显示 "a, b, c, d, e, f"
- [ ] 隐式乘法 + 显式括号：输入 `y=a(x+1)+b(x-1)+c` → 弹窗出现并显示 "a, b, c"

## WebAssembly 加速修复
- [ ] 检查沙箱是否有 `emcc` 命令
- [ ] 方案 A：若有 `emcc`，编译生成 `wasm/reaction-diffusion.js` 和 `wasm/reaction-diffusion.wasm`
- [ ] 方案 B：若无 `emcc`，在 `js/pixel-art.js` 内联手写 wasm 或用纯 JS 优化版
- [ ] 方案 C：若 A、B 不可行，优化 JS 版本 + 改进 toast 提示
- [ ] 启用 Wasm 开关后控制台不再出现 404 错误
- [ ] 反应扩散模式运行时性能可感知提升（或 JS 优化版运行更流畅）
- [ ] 加载失败时 toast 提示明确说明原因

## README.md 详细化
- [ ] 新增"文件清单"章节
- [ ] 文件清单覆盖 25+ 个 JS 文件
- [ ] 每个文件说明包含"用途"
- [ ] 每个文件说明包含"关键函数"
- [ ] 每个文件说明包含"依赖关系"
- [ ] 强化"核心特性"章节，每条特色配 1-2 句详细说明
- [ ] 更新"工具目录"中 RPG 描述为地牢探险风格
- [ ] 更新"WebAssembly 加速"章节说明已修复
- [ ] 更新"教程系统"章节说明首页按钮在右上角
- [ ] 新增"函数系统参数弹窗"章节
- [ ] README 总行数 900-1100 行

## 像素 RPG 地牢重写
- [ ] `js/pixel-rpg.js` 新增 `TILE.FLOOR` 常量（深灰石板）
- [ ] `generateMap()` 改用递归回溯算法生成迷宫
- [ ] 地图地板为深灰 `#3a3a3a` 石板纹理
- [ ] 墙壁主色 `#1a1a1a`（高光 `#2a2a2a`、阴影 `#000000`）
- [ ] 砖块缝隙更明显
- [ ] 玩家起点为迷宫入口（左上）
- [ ] 出口为迷宫终点（右下）
- [ ] 新增 `state.torches` 数组
- [ ] 墙壁生成时 20% 概率标记火把位置
- [ ] 新增 `drawTorches()` 函数
- [ ] 火把含棕色木柄 `#8b4513`
- [ ] 火把含橙色火焰 `#ff6600` + 高光 `#ffaa00`
- [ ] 火焰有闪烁动画（基于 `animTime`）
- [ ] `drawPlayer()` 改为黑色长袍 `#0a0a0a`
- [ ] `drawPlayer()` 新增黑色兜帽 `#0a0a0a`
- [ ] `drawPlayer()` 新增白色面具 `#f0f0f0`（椭圆覆盖脸部）
- [ ] `drawPlayer()` 新增黑色眼洞（根据朝向）
- [ ] 移除原有金色 tunic、肤色、头发
- [ ] 保留 4 方向 + 2 帧行走动画
- [ ] 史莱姆生成权重 60%
- [ ] 史莱姆颜色半透明绿 `rgba(124, 252, 0, 0.85)`
- [ ] 史莱姆高光 `#aaff44`、暗描边 `#4a8a00`
- [ ] 史莱姆新增变形动画（scaleY 在 0.85-1.15 间变化）
- [ ] 其他怪物（蝙蝠/骷髅/哥布林）保留原有样式，权重各约 13%
- [ ] `drawTile(EXIT)` 改为向下走廊样式
- [ ] 出口含黑色长方形 + 拱门轮廓 + 向下阶梯 + 金色向下箭头
- [ ] 主渲染循环调用 `drawTorches()`
- [ ] `COLOR.BG` 改为 `#0a0a14`
- [ ] 保留回合制战斗机制
- [ ] 保留 HP/ATK/DEF/EXP 系统
- [ ] 保留宝箱、升级、BGM、UI 顶部状态栏
- [ ] `node -c js/pixel-rpg.js` 语法通过
- [ ] 游戏可启动，地图显示地牢迷宫风格
- [ ] 玩家外观为黑衣人 + 白面具
- [ ] 怪物以史莱姆为主，有变形动画
- [ ] 出口为向下走廊图标
- [ ] 战斗、宝箱、升级、下楼等机制正常

## Service Worker 缓存版本升级
- [ ] `service-worker.js` 第 13 行 `CACHE_VERSION` 从 `'v14'` 改为 `'v15'`
- [ ] `CACHE_NAME` 自动变为 `'pixel-tools-v15'`
- [ ] `node -c service-worker.js` 语法通过
- [ ] 其他 SW 逻辑（skipWaiting、clients.claim、SW_UPDATED、Network-First）保持不变

## 最终推送 GitHub
- [ ] `git status` 查看所有改动文件
- [ ] `git add` 所有相关文件
- [ ] `git commit` 总消息符合 conventional commit 风格
- [ ] `git push origin main` 成功
- [ ] GitHub Actions 自动部署到 gh-pages 成功
- [ ] https://xiaozhenweiyan.github.io/pixel-tools/ 可访问
- [ ] 首页教程按钮在右上角
- [ ] 进入 RPG 看到地牢风格
- [ ] 函数系统添加参数使用像素弹窗（非原生 prompt）
- [ ] Wasm 加速可启用（或 JS 优化版运行）

## 回归验证（不影响其他功能）
- [ ] 像素艺术生成器画布填满容器
- [ ] 计算器运算过程合并动画正常
- [ ] 神经网络可视化正常
- [ ] 长期训练面板正常
- [ ] 物理沙盒、像素时钟等其他工具正常
- [ ] 教程模态框（每页专属教程）正常
- [ ] i18n 中英文切换正常
- [ ] 函数系统参数滑动条、min/max/step、动画播放/暂停正常
- [ ] 函数系统坐标系 +/- 按钮乘法缩放正常
- [ ] 预测系统折线图自适应刻度正常
