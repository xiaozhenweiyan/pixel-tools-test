# 顶部栏删除 + 计算器增强 + 大数支持 Spec

## Why
用户反馈：工具首页顶部用户栏（含头像、名字、设置、退出按钮）整体冗余，挡住浮动按钮，希望全部删除只保留头像；计算器运算过程框挤掉按键空间，应放到输入框下方；三角函数运算要精确（如 sin(90°)=1 而非 0.9999）；大数输出用科学计数法不直观；想要去掉 github 的短网址。

## What Changes
- **删除工具首页顶部用户栏**：完全移除 `#app-user-bar` div（含头像、昵称、设置、退出按钮）
- **头像改为浮动左上角**：新增 `#floating-avatar` 按钮，position:fixed，top:12px，left:16px，方形像素风，点击进入设置页，hover 显示昵称 tooltip
- **浮动齿轮按钮往左移**：`#btn-floating-settings` 的 right 从 120px 改为 60px（让出更多空间给浮动返回按钮，避免挡住）
  - 注意：浮动返回按钮在 right:16px，齿轮在 right:60px，两者间距 44px（齿轮宽 40px + 4px 间隙），不重叠
- **退出功能移到设置页**：设置页新增"退出登录"按钮
- **运算过程框位置调整**：把 `#calc-steps-wrap`（运算过程）从 `calc-bottom-row`（与按键并排）移到 `#calc-input`（输入框）下方，避免挤掉按键空间
  - calc-output 位置不变（保持在按键上方）
  - 新布局：标题 → 输出区 → 按键网格（独占一行） → 输入框 → 运算过程框
- **计算器三角函数**：新增 sin、cos、tan 按键 + DEG/RAD 切换
  - **特殊角度精确值查表**：0°/30°/45°/60°/90°/120°/135°/150°/180°/270°/360° 等常见角度返回精确值（如 sin(30°)=0.5，sin(90°)=1，cos(60°)=0.5）
  - 非特殊角度用 Math.sin/cos/tan 计算，浮点误差吸附（如 0.9999999999999999 吸附为 1）
- **大数和多小数显示**：
  - 大数（≥ 1e21）展开为完整数字字符串（不用 e）
  - 小数保留最多 20 位
  - formatCalcResult 改进：检测科学计数法并展开
- **自定义域名说明**：
  - https://pixel-tools 不是合法域名（顶级域名为空），无法配置
  - 要去 github 短网址需购买自己的域名（如 pixeltools.com、pixel.tools 等），在 GitHub Pages Settings 配置 Custom Domain
  - 当前网址：https://xiaozhenweiyan.github.io/pixel-tools/
  - 仓库地址：https://github.com/xiaozhenweiyan/pixel-tools
- **工具首页底部显示仓库地址**：新增 footer 链接

## Impact
- Affected code: `index.html`（删除 app-user-bar、新增 floating-avatar、调整 calc 布局、新增三角函数按键、设置页加退出按钮、底部 footer）、`styles/pixel.css`（floating-avatar 样式、floating-settings-btn 位置、calc 布局）、`js/app.js`（三角函数求值、特殊角度查表、formatCalcResult 大数展开、退出按钮逻辑迁移、floating-avatar 事件）
- 不影响预测系统/长期训练/神经网络/图片压缩等现有功能

## ADDED Requirements

### Requirement: 删除顶部用户栏 + 浮动头像
系统 SHALL 完全移除 `#app-user-bar` div，新增 `#floating-avatar` 浮动按钮（左上角 fixed），点击进入设置页，hover 显示昵称 tooltip。

#### Scenario: 工具首页
- **WHEN** 用户在工具首页
- **THEN** 左上角显示浮动头像按钮
- **AND** 没有顶部用户栏
- **AND** 右上角浮动齿轮按钮（right:60px）和浮动返回按钮（right:16px）不重叠

#### Scenario: 点击头像
- **WHEN** 用户点击浮动头像
- **THEN** 进入设置页

#### Scenario: 头像 hover
- **WHEN** 用户 hover 头像
- **THEN** 显示昵称 tooltip

### Requirement: 计算器运算过程框位置
系统 SHALL 把运算过程框 `#calc-steps-wrap` 从 `calc-bottom-row`（与按键并排）移到 `#calc-input` 下方，让按键网格独占一行不被挤压。

#### Scenario: 新布局
- **WHEN** 用户在计算器页面
- **THEN** 布局顺序：标题 → 输出区 → 按键网格（独占一行） → 输入框 → 运算过程框

### Requirement: 计算器三角函数精确运算
系统 SHALL 新增 sin、cos、tan 按键 + DEG/RAD 切换。特殊角度（0/30/45/60/90/120/135/150/180/270/360 度）返回精确值，非特殊角度浮点误差吸附。

#### Scenario: 弧度模式特殊值
- **WHEN** 用户输入 sin(1.5707963267948966)（即 π/2）并按 =（RAD 模式）
- **THEN** 输出 1（不是 0.9999...）

#### Scenario: 角度模式特殊值
- **WHEN** 用户切换到 DEG 模式
- **AND** 输入 sin(90) 并按 =
- **THEN** 输出 1（精确）

#### Scenario: 30 度
- **WHEN** DEG 模式输入 sin(30) 并按 =
- **THEN** 输出 0.5（精确）

#### Scenario: cos 60 度
- **WHEN** DEG 模式输入 cos(60) 并按 =
- **THEN** 输出 0.5（精确）

#### Scenario: tan 45 度
- **WHEN** DEG 模式输入 tan(45) 并按 =
- **THEN** 输出 1（精确）

#### Scenario: 非特殊角度
- **WHEN** DEG 模式输入 sin(10) 并按 =
- **THEN** 输出 0.17364817766693036（不吸附，保留精度）

### Requirement: 运算过程动态化
系统 SHALL 在点击 = 后立即显示最终结果，运算过程在输入框下方的 calc-steps 框中逐步动画显示（每步 200ms）。

#### Scenario: 立即显示结果
- **WHEN** 用户输入 1+2*3 并按 =
- **THEN** calc-current 立即显示 7
- **AND** calc-steps 逐步显示：1+2*3 → 1+6 → = 7（每步 200ms）

### Requirement: 大数和多小数显示
系统 SHALL 把科学计数法展开为完整数字字符串，小数保留最多 20 位。

#### Scenario: 大整数
- **WHEN** 用户输入 999999999999*999999999999 并按 =
- **THEN** 输出 999999999998000000000001（无 e）

#### Scenario: 多小数
- **WHEN** 用户输入 1/3 并按 =
- **THEN** 输出 0.3333333333333333（20 位内）

#### Scenario: 超大数溢出
- **WHEN** 结果超过 Number.MAX_VALUE
- **THEN** 输出 Infinity

### Requirement: 仓库地址展示
系统 SHALL 在工具首页底部显示 GitHub 仓库地址链接。

#### Scenario: 底部 footer
- **WHEN** 用户在工具首页
- **THEN** 底部显示链接 https://github.com/xiaozhenweiyan/pixel-tools

## MODIFIED Requirements

### Requirement: 设置页增加退出按钮
设置页 SHALL 新增"退出登录"按钮，点击清除 sessionStorage 并返回工具首页重新弹注册窗。

### Requirement: formatCalcResult
formatCalcResult SHALL 改进：检测科学计数法（含 e/E）并展开为完整数字字符串，小数保留最多 20 位。

## REMOVED Requirements

### Requirement: 工具首页顶部用户栏
**Reason**: 用户要求删除整个顶部栏，只保留头像
**Migration**: 头像改为浮动左上角，退出功能移到设置页
