# Checklist

## 顶部栏删除 + 浮动头像
- [x] index.html 中 `#app-user-bar` 整个 div 已被移除（含头像、昵称、设置、退出按钮全部删除）
- [x] index.html 新增 `#floating-avatar` 浮动按钮，位置在左上角（top:12px left:16px）
- [x] pixel.css 新增 `.floating-avatar` 样式：position:fixed，36×36 方形像素风（3px 白边框、4px 圆角、深空背景）
- [x] floating-avatar 有头像时显示 background-image，无头像时显示昵称首字
- [x] floating-avatar hover 时通过 title 属性显示昵称 tooltip
- [x] 点击 floating-avatar 进入设置页（绑定到 showSettings）
- [x] floating-avatar 不挡住右上角的 floating-back-btn 和 floating-settings-btn

## 设置齿轮按钮位置
- [x] pixel.css 中 `.floating-settings-btn` 的 right 从 120px 改为 60px
- [x] floating-settings-btn（right:60px）和 floating-back-btn（right:16px）不重叠，间距足够
- [x] 设置齿轮按钮不再挡住返回主页按钮

## 计算器运算过程框位置
- [x] index.html 中 `#calc-steps-wrap` 已从 `.calc-bottom-row` 内移出
- [x] index.html 中 `#calc-steps-wrap` 现位于 `#calc-input`（输入框）下方
- [x] calc-output 位置不变（仍在按键网格上方）
- [x] pixel.css 移除 `.calc-bottom-row` 样式（按键网格独占一行不再 flex）
- [x] pixel.css 中 `.calc-steps-wrap` 宽度为 100%（独占输入框下方一行）
- [x] 按键网格不再被运算过程框挤压，独占完整一行
- [x] 新布局顺序：标题 → 输出区 → 按键网格 → 输入框 → 运算过程框

## 三角函数按键
- [x] index.html 计算器按键网格中新增 sin、cos、tan 三个按键（data-key 分别为 sin/cos/tan）
- [x] index.html 新增 DEG/RAD 切换按键（id="calc-angle-mode"），默认显示 RAD
- [x] 点击 sin 插入 `sin(`，点击 cos 插入 `cos(`，点击 tan 插入 `tan(`
- [x] 点击 DEG/RAD 按键可切换模式，按键文字随之更新

## 三角函数精确运算
- [x] app.js 新增 getExactTrig(func, angle, mode) 特殊角度查表函数
- [x] DEG 模式下 0/30/45/60/90/120/135/150/180/270/360 度返回精确值
- [x] RAD 模式下 0/π/6/π/4/π/3/π/2/π 等返回精确值
- [x] sin(90) 在 DEG 模式下输出 1（精确，不是 0.9999...）
- [x] sin(30) 在 DEG 模式下输出 0.5（精确）
- [x] cos(60) 在 DEG 模式下输出 0.5（精确）
- [x] tan(45) 在 DEG 模式下输出 1（精确）
- [x] sin(0) = 0，cos(0) = 1，tan(0) = 0（任意模式精确）
- [x] sin(π/2) 在 RAD 模式下输出 1（精确，输入 1.5707963267948966）
- [x] 非特殊角度（如 sin(10)）保留精度输出（不吸附，不约等于）
- [x] 非特殊角度浮点误差吸附（如 0.9999999999999999 → 1）
- [x] DEG 模式下三角函数正确把角度转弧度（x*π/180）

## 运算过程动态化
- [x] 点击 = 后立即显示最终结果到 calc-current（不等动画）
- [x] app.js 新增 showCalcStepsAnimated(steps, finalValue, error) 函数
- [x] 运算过程在 calc-steps 框中逐步动画显示，每步 200ms 延迟
- [x] 最后一步显示 = 结果行
- [x] 错误表达式立即显示错误，不延迟
- [x] calcEvaluate 调用 showCalcStepsAnimated 替代 showCalcSteps

## 大数和多小数显示
- [x] app.js formatCalcResult 检测科学计数法（含 e/E）并展开为完整数字字符串
- [x] 999999999999*999999999999 输出 999999999998000000000001（无 e）
- [x] 小数最多保留 20 位（用 toFixed(20) 然后 trim 末尾 0）
- [x] 1/3 输出 0.33333333333333333333（20 位小数）
- [x] 超大数（>1e308）输出 Infinity
- [x] 大数和小数都不使用 e 表示

## 设置页退出按钮
- [x] index.html 在 settings-page 内新增"退出登录"按钮（id="btn-settings-logout"）
- [x] app.js 绑定 btn-settings-logout：clearProfile + applyBackground + updateFloatingAvatar + showAppLanding + showRegisterModal
- [x] 点击退出按钮显示"已退出，数据已清除"toast
- [x] 退出后返回工具首页并重新弹注册窗

## 仓库地址展示
- [x] index.html 在 app-landing-page 底部新增 footer，显示仓库地址链接 https://github.com/xiaozhenweiyan/pixel-tools
- [x] README.md 仓库地址和网页地址正确
- [x] 向用户说明自定义域名 https://pixel-tools 不可行（不是合法域名，顶级域名为空）
- [x] 向用户说明要去 github 短网址需购买自己的域名（如 pixeltools.com、pixel.tools）

## 像素风一致性
- [x] floating-avatar 是像素风（3px 白边框、4px 圆角、深空背景、Courier New）
- [x] 三角函数按键样式与现有按键一致
- [x] DEG/RAD 切换按键样式与现有按键一致
- [x] 退出按钮样式与设置页其他按钮一致
- [x] footer 链接样式与整体风格一致

## 部署
- [x] 代码已提交并推送到 origin main 分支
- [x] 代码已推送到 gh-pages 分支
- [x] https://xiaozhenweiyan.github.io/pixel-tools/ 可访问且新功能生效
