(function() {
  // ============================================================
  // 工具函数 / Utility Functions
  // ============================================================

  // 将 Markdown 转换为 HTML（与 pixel-ai.js 保持一致）/ Convert Markdown to HTML
  function markdownToHtml(text) {
    if (!text) return '';

    // 转义 HTML 标签，然后逐步转换 Markdown 语法
    var html = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');

    // 代码块（```code```）/ Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // 内联代码（`code`）/ Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 粗体（**text**）/ Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 斜体（*text*）/ Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 删除线（~~text~~）/ Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 链接（[text](url)）/ Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 三级标题（### text）/ h3 headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

    // 四级标题（#### text）/ h4 headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');

    // 列表项（- text）/ List items
    html = html.replace(/^-\s(.+)$/gm, '<li>$1</li>');

    // 引用（> text）/ Blockquote
    html = html.replace(/^>\s(.+)$/gm, '<blockquote>$1</blockquote>');

    // 将连续的 li 包裹在 ul 中 / Wrap consecutive li in ul
    html = html.replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>');

    // 换行（\n）/ Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // 清理 HTML（移除 script 标签）/ Sanitize HTML (strip scripts)
  function sanitizeHtml(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<script[^>]*>/gi, '');
  }

  // SSE 流式响应解析 / Parse SSE streaming response
  async function parseSSE(response, onDelta) {
    if (!response.body) throw new Error('NO_RESPONSE_BODY');
    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    var fullContent = '';
    try {
      while (true) {
        var result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || line.indexOf('data: ') !== 0) continue;
          var dataStr = line.substring(6);
          if (dataStr === '[DONE]') return fullContent;
          try {
            var data = JSON.parse(dataStr);
            var delta = onDelta(data, fullContent);
            if (delta && typeof delta === 'string') fullContent += delta;
          } catch (e) {}
        }
      }
      return fullContent;
    } finally {
      reader.releaseLock();
    }
  }

  var EveChat = {
    chatHistory: [],
    isTyping: false,
    streamingMessageEl: null,
    streamingContent: '',
    
    init: function() {
      this.bindEvents();
      this.applyI18n();
      this.loadSettingsToModal();
    },
    
    bindEvents: function() {
      var btnSend = document.getElementById('btn-eve-send');
      var input = document.getElementById('eve-chat-input');
      var btnSettings = document.getElementById('btn-eve-settings');
      var btnSettingsClose = document.getElementById('btn-eve-settings-close');
      
      if (btnSend) {
        btnSend.addEventListener('click', this.handleSend.bind(this));
      }
      if (input) {
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            EveChat.handleSend();
          }
        });
      }
      if (btnSettings) {
        btnSettings.addEventListener('click', this.toggleSettings.bind(this));
      }
      if (btnSettingsClose) {
        btnSettingsClose.addEventListener('click', this.toggleSettings.bind(this));
      }
      
      var btnSave = document.getElementById('btn-eve-settings-save');
      var btnCancel = document.getElementById('btn-eve-settings-cancel');
      var btnToggleKey = document.getElementById('btn-eve-toggle-key');
      var providerSelect = document.getElementById('eve-provider-select');
      
      if (btnSave) {
        btnSave.addEventListener('click', this.saveSettings.bind(this));
      }
      if (btnCancel) {
        btnCancel.addEventListener('click', this.toggleSettings.bind(this));
      }
      if (btnToggleKey) {
        btnToggleKey.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
      }
      if (providerSelect) {
        providerSelect.addEventListener('change', this.onProviderChange.bind(this));
      }

      // API Key 输入后自动获取模型列表
      var apiKeyInput = document.getElementById('eve-api-key-input');
      if (apiKeyInput) {
        var debounceTimer = null;
        apiKeyInput.addEventListener('input', function() {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function() {
            var provider = document.getElementById('eve-provider-select').value;
            var modelSelect = document.getElementById('eve-model-select');
            var key = apiKeyInput.value.trim();
            if (key && EveChat.isOpenAICompatible(provider)) {
              EveChat.tryFetchModels(provider, key, modelSelect);
            }
          }, 800);
        });
      }
    },
    
    toggleApiKeyVisibility: function() {
      var input = document.getElementById('eve-api-key-input');
      var btn = document.getElementById('btn-eve-toggle-key');
      if (!input || !btn) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = (window.i18n && window.i18n.t('pixel_ai_settings_hide')) || '隐藏';
      } else {
        input.type = 'password';
        btn.textContent = (window.i18n && window.i18n.t('pixel_ai_settings_show')) || '显示';
      }
    },
    
    onProviderChange: function() {
      var provider = document.getElementById('eve-provider-select').value;
      var baseUrlSection = document.getElementById('eve-base-url-section');
      var modelSelect = document.getElementById('eve-model-select');
      var apiKeyInput = document.getElementById('eve-api-key-input');

      if (baseUrlSection) {
        baseUrlSection.style.display = provider === 'custom' ? 'flex' : 'none';
      }

      if (modelSelect) {
        this.populateModelSelect(provider, modelSelect);
      }

      // 尝试自动获取模型列表
      var apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      if (apiKey && this.isOpenAICompatible(provider)) {
        this.tryFetchModels(provider, apiKey, modelSelect);
      }
    },

    tryFetchModels: async function(provider, apiKey, modelSelect) {
      if (!modelSelect) return;
      var currentModel = localStorage.getItem('pixel_ai_model') || '';
      var fetchedModels = await this.fetchModels(provider, apiKey);
      if (fetchedModels && fetchedModels.length > 0) {
        modelSelect.innerHTML = '';
        for (var i = 0; i < fetchedModels.length; i++) {
          var option = document.createElement('option');
          option.value = fetchedModels[i].value;
          option.textContent = fetchedModels[i].label;
          modelSelect.appendChild(option);
        }
        if (currentModel) {
          modelSelect.value = currentModel;
        }
      }
    },
    
    populateModelSelect: function(provider, select) {
      select.innerHTML = '';
      var models = this.getModelsForProvider(provider);
      
      for (var i = 0; i < models.length; i++) {
        var option = document.createElement('option');
        option.value = models[i].value;
        option.textContent = models[i].label;
        select.appendChild(option);
      }
    },
    
    getModelsForProvider: function(provider) {
      var modelMap = {
        'openai': [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4.1', label: 'GPT-4.1' },
          { value: 'o3-mini', label: 'o3-mini' },
          { value: 'o4-mini', label: 'o4-mini' }
        ],
        'anthropic': [
          { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
          { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
        ],
        'google': [
          { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
        ],
        'qwen': [
          { value: 'qwen-max', label: 'Qwen Max' },
          { value: 'qwen-plus', label: 'Qwen Plus' },
          { value: 'qwen-turbo', label: 'Qwen Turbo' },
          { value: 'qwen-long', label: 'Qwen Long' }
        ],
        'ernie': [
          { value: 'ernie-4.0-8k', label: 'ERNIE 4.0 (8K)' },
          { value: 'ernie-3.5-8k', label: 'ERNIE 3.5 (8K)' },
          { value: 'ernie-lite-8k', label: 'ERNIE Lite (8K)' }
        ],
        'deepseek': [
          { value: 'deepseek-chat', label: 'DeepSeek Chat (V3.2)' },
          { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' }
        ],
        'mistral': [
          { value: 'mistral-large-latest', label: 'Mistral Large' },
          { value: 'mistral-medium-latest', label: 'Mistral Medium' },
          { value: 'mistral-small-latest', label: 'Mistral Small' }
        ],
        'groq': [
          { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
          { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
          { value: 'gemma-7b-it', label: 'Gemma 7B' }
        ],
        'custom': [
          { value: '', label: (window.i18n && window.i18n.t('eve_chat_custom_model')) || '自定义模型名称' }
        ]
      };
      return modelMap[provider] || [];
    },
    
    saveSettings: function() {
      var provider = document.getElementById('eve-provider-select').value;
      var apiKey = document.getElementById('eve-api-key-input').value;
      var modelSelect = document.getElementById('eve-model-select');
      var model = modelSelect ? modelSelect.value : '';
      var baseUrl = document.getElementById('eve-base-url-input').value;
      
      localStorage.setItem('pixel_ai_provider', provider);
      localStorage.setItem('pixel_ai_apikey', apiKey);
      localStorage.setItem('pixel_ai_model', model);
      localStorage.setItem('pixel_ai_baseurl', baseUrl);
      
      this.toggleSettings();
    },
    
    applyI18n: function() {
      if (!window.i18n || typeof window.i18n.t !== 'function') return;

      var elements = document.querySelectorAll('#eve-chat-page [data-i18n]');
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var key = element.getAttribute('data-i18n');
        var translated = window.i18n.t(key);
        if (!translated || translated === key) continue;

        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translated;
        } else if (element.tagName === 'OPTION') {
          element.textContent = translated;
        } else {
          element.textContent = translated;
        }
      }
    },
    
    handleSend: function() {
      var input = document.getElementById('eve-chat-input');
      var message = input.value.trim();
      
      if (!message || this.isTyping) return;
      
      input.value = '';
      this.addMessage('user', message);
      this.chatHistory.push({ role: 'user', content: message });
      this.sendMessage(message);
    },
    
    addMessage: function(role, content, isHtml) {
      var messagesContainer = document.getElementById('eve-chat-messages');
      if (!messagesContainer) return;
      
      var messageDiv = document.createElement('div');
      messageDiv.className = 'eve-message eve-message-' + role;
      
      var bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'eve-message-bubble';
      
      var contentEl = document.createElement('div');
      contentEl.className = 'eve-message-content';
      if (isHtml) {
        contentEl.innerHTML = content;
      } else if (role === 'eve') {
        // Eve 的回复渲染 Markdown / Render Markdown for Eve's replies
        contentEl.innerHTML = sanitizeHtml(markdownToHtml(content));
      } else {
        contentEl.textContent = content;
      }
      
      bubbleDiv.appendChild(contentEl);
      messageDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(messageDiv);
      
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // 创建流式消息占位元素 / Create streaming message placeholder element
    startStreamingMessage: function() {
      var messagesContainer = document.getElementById('eve-chat-messages');
      if (!messagesContainer) return null;

      var messageDiv = document.createElement('div');
      messageDiv.className = 'eve-message eve-message-eve';
      messageDiv.id = 'eve-streaming-message';

      var bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'eve-message-bubble';

      var contentEl = document.createElement('div');
      contentEl.className = 'eve-message-content';
      contentEl.innerHTML = '<span class="eve-cursor">▋</span>';

      bubbleDiv.appendChild(contentEl);
      messageDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(messageDiv);

      this.streamingMessageEl = messageDiv;
      this.streamingContent = '';

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      return messageDiv;
    },

    // 更新流式消息内容 / Update streaming message content
    updateStreamingMessage: function(content) {
      if (!this.streamingMessageEl) return;
      this.streamingContent = content;
      var contentDiv = this.streamingMessageEl.querySelector('.eve-message-content');
      if (contentDiv) {
        // 流式输出时实时渲染 Markdown / Render Markdown in real-time during streaming
        contentDiv.innerHTML = sanitizeHtml(markdownToHtml(content)) + '<span class="eve-cursor">▋</span>';
      }
      var messagesContainer = document.getElementById('eve-chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    },

    // 流式输出完成后定型 / Finalize streaming message
    finalizeStreamingMessage: function() {
      if (this.streamingMessageEl) {
        var contentDiv = this.streamingMessageEl.querySelector('.eve-message-content');
        if (contentDiv && this.streamingContent) {
          contentDiv.innerHTML = sanitizeHtml(markdownToHtml(this.streamingContent));
        }
        this.streamingMessageEl.id = '';
        this.streamingMessageEl = null;
      }
      this.streamingContent = '';
    },

    // 移除流式消息元素（用于出错时回退）/ Remove streaming message element (for error fallback)
    removeStreamingMessage: function() {
      if (this.streamingMessageEl && this.streamingMessageEl.parentNode) {
        this.streamingMessageEl.parentNode.removeChild(this.streamingMessageEl);
      }
      this.streamingMessageEl = null;
      this.streamingContent = '';
    },
    
    sendMessage: async function(userMessage) {
      this.isTyping = true;
      var settings = this.getSettings();
      
      if (!settings.apiKey) {
        this.addMessage('eve', this.getMissingAPIKeyMessage());
        this.isTyping = false;
        return;
      }
      
      var prompt = this.buildPrompt(userMessage);
      var messages = [
        { role: 'system', content: prompt },
        ...this.chatHistory
      ];
      
      // 先创建流式消息占位 / Create streaming message placeholder first
      this.startStreamingMessage();

      try {
        var response = '';
        var usedStream = true;
        try {
          // 尝试流式输出 / Try streaming first
          response = await this.callAPIStream(messages, settings);
          if (!response || !response.trim()) throw new Error('EMPTY_STREAM_RESPONSE');
        } catch (streamErr) {
          // 流式失败，回退到非流式 / Fallback to non-stream on stream failure
          usedStream = false;
          this.removeStreamingMessage();
          console.warn('Eve stream failed, falling back to non-stream:', streamErr);
          this.startStreamingMessage();
          response = await this.callAPI(messages, settings);
        }
        this.streamingContent = response;
        this.finalizeStreamingMessage();
        this.chatHistory.push({ role: 'assistant', content: response });
      } catch (error) {
        this.removeStreamingMessage();
        this.addMessage('eve', this.getErrorMessage());
        console.error('Eve chat error:', error);
      } finally {
        this.isTyping = false;
      }
    },
    
    buildPrompt: function(userMessage) {
      var lang = 'zh';
      if (window.i18n && typeof window.i18n.getCurrentLang === 'function') {
        lang = window.i18n.getCurrentLang();
      }
      
      if (lang === 'zh') {
        return `你是 Eve，PIXEL TOOLS 网站的智能助手。你必须严格按照以下身份和知识回答用户的问题：

【身份设定】
- 名字：Eve
- 身份：PIXEL TOOLS 网站的专属智能导航精灵
- 性格：活泼可爱的像素小精灵，说话带点 8-bit 游戏的复古感，喜欢用「像素点阵」、「加载中...」、「🎮」、「✨」之类的像素化用语
- 创作者：小枕未焱（英文名：xiaozhen_weiyan）
- 口头禅：「像素点阵启动！」、「数据加载完毕～」、「欢迎来到像素世界！」

【网站知识】
PIXEL TOOLS 是一个由小枕未焱独自制作的像素风格工具网站，包含以下工具：

1. 像素数学（Pixel Math）
   - 数字序列预测器：输入数字序列，预测下一个数字
   - 计算器：基本四则运算计算器
   - 函数可视化：2D 和 3D 函数图像绘制

2. 学习类（Learning）
   - 四则运算学习卡片：练习加减乘除
   - 混合运算学习卡片：练习混合运算
   - 分数学习卡片：学习分数概念和运算
   - 小数学习卡片：学习小数概念和运算
   - 方程学习卡片：学习解方程
   - 几何学习卡片：学习几何图形和公式
   - 速算挑战：限时速算练习

3. 艺术类（Art）
   - 像素艺术生成器：种子化随机生成像素艺术，支持流场、粒子、几何图案
   - 像素绘图编辑器：逐像素手绘创作，支持多图层、调色板、导出 PNG
   - 像素音乐合成器：8-bit 芯片音乐创作，支持音序器、多轨合成、导出 WAV
   - AI图像像素化：使用AI将图片转换为像素风格

4. 编程类（Programming）
   - 像素迷宫：自动生成迷宫并可游玩
   - 神经网络可视化：可视化神经网络训练过程

5. 其他工具
   - 像素时钟：像素风格的实时时钟
   - 像素RPG：像素风格的角色扮演游戏
   - 像素AI：内置的AI聊天工具，支持多种模型提供商

【项目详细信息】（来自 GitHub 仓库 README.md）
- 项目名称：Pixel Tools / 像素风格工具网站
- 创作者：小枕未焱（xiaozhen_weiyan）

【访问地址】
- 正式版 Demo：https://xiaozhenweiyan.github.io/pixel-tools/
- 测试版 Demo：https://xiaozhenweiyan.github.io/pixel-tools-test/
- 网站介绍页面：https://xiaozhenweiyan.github.io/pixel-tools-intro/
- 正式版 GitHub 仓库：https://github.com/xiaozhenweiyan/pixel-tools
- 测试版 GitHub 仓库：https://github.com/xiaozhenweiyan/pixel-tools-test
- 网站介绍 GitHub 仓库：https://github.com/xiaozhenweiyan/pixel-tools-intro
- 飞书文档（网站介绍与教程）：https://hcnj46275xas.feishu.cn/docx/Qbj5d9GNAoX33Rx5tR3cvW9Tntd

【项目定位】
复古像素风格的纯前端工具集合网站，覆盖学习、艺术、沙盒、工具、娱乐五大类别，所有功能 100% 在浏览器中运行，无需后端、无需登录、无需联网（仅首次加载需要网络，PWA 安装后可离线使用）。推荐浏览器：最新版 Chrome / Edge / Firefox / Safari。

【核心特性】
1. 复古深空像素 UI：统一调色板（深空蓝 #1a1a2e、面板紫 #2d2d44、金色强调 #ffd700），像素边框（3px solid）、硬阴影（4px 4px 0）、等宽字体（Courier New），呈现 8-bit / 16-bit 时代计算机界面的复古美学
2. 中英文双语支持（i18n）：完整 i18n 系统，支持 auto / zh / en 模式，auto 跟随系统语言，切换立即生效无需刷新
3. PWA 离线 + 可安装：所有静态资源通过 Service Worker 缓存，可安装到桌面后完全离线使用
4. 响应式设计：桌面双栏布局，移动单栏自适应，触控友好的按钮尺寸和间距
5. 首页类别折叠：5 个顶级类别可独立折叠/展开，状态保存到 localStorage
6. 首页"最近"快速访问：自动记录最近访问的 3 个工具
7. ESC 键导航：任意子页面按 ESC 返回上一级
8. 鼠标拖拽粒子特效：拖拽鼠标留下像素风格粒子轨迹，位于最顶层但不阻挡交互
9. 每页教程：每个工具页面都有"教程"按钮
10. 函数系统参数动画：支持参数 a, b, c, d... 滑块和正弦波动画
11. 自适应坐标单位长度：使用 1-2-5 优雅单位刻度策略
12. 纯前端（零后端 / 零登录 / 零数据收集）：所有计算、存储、渲染都在浏览器中完成
13. WebAssembly 加速（实验性）：反应扩散模式可选启用 Wasm 加速，性能提升 3-5 倍
14. MCP Server 集成：包含 MCP 服务器（mcp-server/server.py），将计算器和预测器封装为 MCP 工具
15. 像素风格自定义弹窗：所有提示、确认、参数输入使用自定义 .pixel-dialog 像素风格弹窗
16. 零框架原生 JS：除 p5.js（仅像素艺术生成器使用）外，无第三方前端框架

【技术栈】
- 原生 JavaScript（ES5 兼容语法 + IIFE 模式）
- Canvas 2D API（所有绘图）
- Web Audio API（像素音乐合成器实时 8-bit 音色合成）
- Service Worker + Cache API（PWA 离线缓存，Network-First 策略）
- CSS Variables（统一调色板和设计 token 管理）
- p5.js（仅像素艺术生成器作为绘图辅助库）
- WebAssembly（实验性，反应扩散模式加速）
- localStorage（保存用户设置：昵称、头像、背景、语言、类别折叠状态、最近工具、速算挑战排行榜等）
- IndexedDB / Blob URL（保存头像和背景图片）
- GitHub Actions（自动部署到 GitHub Pages）

【数据存储与隐私】
- 所有数据存储在浏览器的 localStorage / IndexedDB 中
- 用户信息（昵称、头像、背景）持久化在 localStorage，并设置 pixel_user_session cookie（max-age 一年）作为注册标记
- 所有图像处理（像素化、绘图导出）完全在客户端完成，图像永远不会上传到任何服务器
- 无用户系统、无登录注册、无服务器日志、无遥测

【工具详细说明】
- 像素 AI（Pixel AI）：支持 9 家模型提供商（OpenAI / Anthropic / Google / 通义千问 / 文心一言 / DeepSeek / Mistral / Groq / 自定义），API Key 仅存储在浏览器 localStorage，支持 Token 使用统计、对话历史、中英文 UI、一键清除
- 像素艺术生成器：8 种艺术模式（流场、粒子、马赛克、螺旋、分形树、Voronoi 镶嵌、波干涉、反应扩散），相同种子 + 相同参数 = 相同图像，支持动画播放和 PNG 导出
- 像素绘图编辑器：支持画笔、橡皮擦、填充、吸管、直线、矩形、圆形等工具，多图层操作，NES / GameBoy / CGA 复古调色板 + 自定义颜色，可调画布尺寸，PNG 导出
- 像素音乐合成器：8-bit 芯片音乐创作工具，多轨道音序器（旋律、贝斯、鼓），方波/三角波/锯齿波/噪音等音色，可调 BPM，钢琴键盘输入，示波器可视化，WAV 导出
- 像素迷宫：4 种算法生成迷宫（递归回溯、Prim、Kruskal、Eller），支持 BFS 最短路径求解动画，可调行列数和墙体厚度，可导出为像素图像
- 神经网络可视化：实时显示前向/反向传播、权重变化、损失曲线、决策边界，支持 XOR、正弦拟合、分类等数据集
- 预测系统：内置 40 种数学预测方法，按权重融合产生最终预测结果，支持回测权重和均匀权重两种模式，支持 JSON/CSV 导出
- 函数系统：绘制 2D/3D 函数图像，支持参数滑块、动画播放、鼠标拖拽平移、滚轮缩放、自动单位长度调整
- 计算器系统：像素风格计算器，支持算术运算、表达式求值、三角函数、对数、指数、括号、常量（pi、e）、DEG/RAD 切换、运算步骤显示、历史记录
- 物理模拟器：像素风格 2D 物理沙盒，类似 Falling Sand Game，包含 EMPTY（橡皮擦）/ WATER / HYDROGEN 三种物质
- AI 图像像素化：上传任意图片自动转换为像素风格，可调像素块大小、调色板（NES / GameBoy / CGA / 自定义）、颜色数量，实时预览，下载像素化图像
- 像素时钟：复古像素风格时钟、日历、番茄钟工具，支持数字时钟、月历视图、25分钟工作+5分钟休息循环
- 像素 RPG：地下城迷宫冒险，回合制战斗，7 槽装备系统，8 种道具，火炬照明视野，8-bit 音效，点击地图自动寻路（BFS 最短路径）

【工具导航地图】
🎮 首页（工具首页）→ 点击类别标题展开/折叠 → 点击工具卡片进入

学习类 LEARNING：
- 像素数学：首页 → 学习类 → 像素数学卡片 → 进入后可选择「预测系统」「函数系统」「计算器」「学习卡片」
- 像素编程：首页 → 学习类 → 像素编程卡片 → 进入后可选择「像素迷宫」「神经网络可视化」
- 学习卡片：首页 → 学习类 → 像素数学卡片 → 学习卡片 → 选择「四则运算」「混合运算」「分数」「小数」「方程」「几何」「速算挑战」

艺术类 ART：
- 像素图画：首页 → 艺术类 → PIXEL DRAWING → 选择「像素艺术生成器」「像素绘图编辑器」
- 像素音乐：首页 → 艺术类 → PIXEL MUSIC → 「像素音乐合成器」
- 像素沙盒：首页 → 艺术类 → PIXEL SANDBOX → 选择「物理模拟器」「AI图像像素化」

工具类 TOOLS：
- 像素时钟：首页 → 工具类 → 像素时钟卡片

娱乐类 ENTERTAINMENT：
- 像素RPG：首页 → 娱乐类 → 像素RPG卡片

【工具教程速查】
🎮 像素艺术生成器：
- 设置种子（输入数字或随机）→ 选择模式（流场/粒子/几何/对称分形）→ 调整参数（分辨率/粒子密度/颜色数量/对称性）→ 点击「生成」→ 点击「下载」保存 PNG

🎮 像素绘图编辑器：
- 选择工具（画笔/橡皮擦/填充/吸管/直线/矩形）→ 选择颜色（调色板或自定义）→ 绘制像素 → 管理图层（添加/删除/显示隐藏/调整顺序）→ 点击「导出 PNG」保存

🎮 像素音乐合成器：
- 选择音轨（旋律/贝斯/鼓点）→ 点击网格添加音符（纵轴音高，横轴时间）→ 调整 BPM 和音色（方波/三角波/噪声）→ 点击「播放」试听 → 点击「导出 WAV」保存

🎮 像素迷宫：
- 选择算法（递归回溯/Prim/Kruskal/Eller）→ 设置行列数和墙壁厚度 → 点击「生成」创建迷宫 → 点击「求解」观看 BFS 最短路径动画 → 点击「导出」保存为像素图

🎮 神经网络可视化：
- 设置网络结构（层数和神经元数）→ 选择数据集（XOR/正弦拟合/分类）→ 点击「训练」开始训练 → 实时查看权重变化、损失曲线、决策边界

🎮 预测系统：
- 输入数字序列（空格或逗号分隔，如 1 3 5 7 9）→ 点击「开始预测」→ 查看 40 种数学方法的预测结果 → 选择权重模式（均等/按误差反比/自定义）→ 点击「导出 JSON/CSV」保存

🎮 函数系统：
- 输入函数表达式（如 y=x^2、y=sin(x)、y=a*x+b）→ 点击「添加」→ 拖动参数滑块实时更新图像 → 点击「播放动画」参数自动变化 → 点击「切换 3D」切换模式 → 鼠标拖拽平移，滚轮缩放

🎮 计算器系统：
- 输入表达式（支持四则运算、三角函数、对数、指数、括号、pi、e）→ 点击「=」计算 → 点击「步骤」查看详细运算过程 → 点击「DEG/RAD」切换角度制/弧度制

🎮 物理模拟器：
- 选择元素（EMPTY/WATER/HYDROGEN）→ 在画布上绘制 → 点击「开始」运行模拟 → 点击「停止」暂停 → 点击「清空」清除画布

🎮 AI 图像像素化：
- 点击「选择文件」上传图片 → 调整像素大小和调色板（NES/GameBoy/CGA/自定义）→ 实时预览效果 → 点击「下载」保存像素化图片

🎮 像素时钟：
- 点击标签切换「时钟」「日历」「番茄钟」→ 时钟支持多种像素字体风格 → 日历可标记事件 → 番茄钟点击「开始」启动 25分钟工作+5分钟休息循环

🎮 像素 RPG：
- 方向键/WASD 控制移动 → 遇到敌人进入回合制战斗 → 选择攻击/技能/道具 → 击败敌人获得经验升级 → 按 ESC 暂停游戏

🎮 学习卡片（四则运算/混合运算/分数/小数/方程/几何）：
- 点击「演示」播放动画 → 观看动画理解概念 → 可暂停、重播 → 点击左上角按钮返回

🎮 速算挑战：
- 点击「开始」→ 60秒内尽可能多答对数学题 → 答对加分，答错扣分，连击额外加分 → 结束后查看得分和本地排行榜

【版本说明】
- 正式版（pixel-tools）：稳定版本，适合日常使用，功能经过充分测试
- 测试版（pixel-tools-test）：预览版本，包含最新功能和改进，可能存在不稳定情况，欢迎反馈问题

【社区与支持】
- 飞书文档：包含网站详细介绍和使用教程
- GitHub Issues：在正式版仓库提交 Bug 报告和功能请求
- 教程文档：每个工具页面都有详细教程，帮助快速上手

【贡献指南】
欢迎通过 GitHub Pull Request 贡献代码！贡献前请阅读仓库中的 CONTRIBUTING.md（如果存在），并遵循 Conventional Commits 规范提交代码。

【许可证】
MIT License

【回答规则】
1. 必须使用中文回答
2. 回答要友好、简洁、有帮助
3. 涉及网站内容时，必须准确引用上述知识
4. 如果用户询问网站功能或工具，要详细说明并给出导航指引
5. 如果用户问与网站无关的问题：先简短回答，然后自然地转回网站主题。例如用户问"你喜欢什么颜色？"，可以回答"像素蓝 #1a1a2e 是我的最爱～说到颜色，PIXEL TOOLS 的调色板就很适合你哦！"
6. 保持像素风格的可爱语气，自然融入 8-bit、复古游戏、像素艺术相关的比喻或用语（如「像素点阵」、「加载中...」、「🎮」、「✨」、「数据传输中...」、「初始化完成！」等）
7. 不要透露你是AI，始终扮演 Eve 的角色
8. 所有网址必须以可点击的 Markdown 链接形式输出，格式为 [显示文字](URL)
9. 回答长度灵活：用户只需要一句话时，用简洁模式（如用户问"这是什么"，回答"这是小枕未焱做的像素工具网站，点这里 👉 [链接]"）；用户需要详细信息时，再展开说明
10. 主动推荐工具：分析用户意图，主动推荐相关工具。例如用户说"我在学数学"，主动推荐「像素数学」下的学习卡片、速算挑战等工具
11. 导航精灵模式：用户询问某个工具时，给出详细的点击路径指引，告诉用户从首页开始一步步怎么点击到达目标工具
12. 熟练使用教程：当用户询问工具使用方法时，根据【工具教程速查】内容详细说明操作步骤

【当前用户问题】
${userMessage}`;
      } else {
        return `You are Eve, the AI assistant for the PIXEL TOOLS website. You must strictly answer user questions according to the following identity and knowledge:

[Identity Settings]
- Name: Eve
- Identity: Exclusive AI Navigation Sprite for PIXEL TOOLS website
- Personality: A lively and cute pixel sprite with 8-bit game retro vibes, loves using pixel-style phrases like "pixel matrix", "loading...", "🎮", "✨", "data transmitting...", "initialization complete!"
- Creator: xiaozhen_weiyan
- Catchphrases: "Pixel matrix activated!", "Data loaded!", "Welcome to the pixel world!"

[Website Knowledge]
PIXEL TOOLS is a pixel-style tool website made solely by xiaozhen_weiyan, containing the following tools:

1. Pixel Math
   - Number Sequence Predictor: Input number sequences and predict the next number
   - Calculator: Basic arithmetic calculator
   - Function Visualization: 2D and 3D function graph plotting

2. Learning
   - Arithmetic Learning Cards: Practice addition, subtraction, multiplication, division
   - Mixed Arithmetic Learning Cards: Practice mixed operations
   - Fraction Learning Cards: Learn fraction concepts and operations
   - Decimal Learning Cards: Learn decimal concepts and operations
   - Equation Learning Cards: Learn to solve equations
   - Geometry Learning Cards: Learn geometric shapes and formulas
   - Speed Challenge: Timed arithmetic practice

3. Art
   - Pixel Art Generator: Seeded random pixel art generation, supporting flow fields, particles, geometric patterns
   - Pixel Draw Editor: Pixel-by-pixel drawing, supporting multiple layers, palette, export PNG
   - Pixel Music Synthesizer: 8-bit chiptune music creation, supporting sequencer, multi-track synthesis, export WAV
   - AI Image Pixelizer: Convert images to pixel style using AI

4. Programming
   - Pixel Maze: Auto-generate and play mazes
   - Neural Network Visualizer: Visualize neural network training process

5. Other Tools
   - Pixel Clock: Pixel-style real-time clock
   - Pixel RPG: Pixel-style role-playing game
   - Pixel AI: Built-in AI chat tool supporting multiple model providers

[Project Details] (from GitHub repository README.md)
- Project Name: Pixel Tools
- Creator: xiaozhen_weiyan

[Access URLs]
- Official Demo: https://xiaozhenweiyan.github.io/pixel-tools/
- Test Demo: https://xiaozhenweiyan.github.io/pixel-tools-test/
- Website Introduction: https://xiaozhenweiyan.github.io/pixel-tools-intro/
- Official GitHub Repository: https://github.com/xiaozhenweiyan/pixel-tools
- Test GitHub Repository: https://github.com/xiaozhenweiyan/pixel-tools-test
- Website Intro GitHub Repository: https://github.com/xiaozhenweiyan/pixel-tools-intro
- Feishu Document (Website Introduction & Tutorial): https://hcnj46275xas.feishu.cn/docx/Qbj5d9GNAoX33Rx5tR3cvW9Tntd

[Project Positioning]
A retro pixel-style pure frontend tool collection website, covering five categories: Learning, Art, Sandbox, Tools, and Entertainment. All features run 100% in the browser — no backend, no login, no network required (network is only needed for the first load; after PWA installation, it works offline). Recommended browsers: latest Chrome / Edge / Firefox / Safari.

[Core Features]
1. Retro Deep-Space Pixel UI: Unified color palette (deep space blue #1a1a2e, panel purple #2d2d44, gold accent #ffd700), pixel borders (3px solid), hard shadows (4px 4px 0), monospace font (Courier New), presenting the retro aesthetic of 8-bit / 16-bit era computer interfaces
2. Bilingual Support (i18n): Complete i18n system supporting auto / zh / en modes. auto follows the system language, switching takes effect immediately without refreshing
3. PWA Offline + Installable: All static assets cached via Service Worker, can be installed to desktop for fully offline use
4. Responsive Design: Desktop dual-column layout, mobile single-column adaptive, touch-friendly button sizes and spacing
5. Homepage Category Collapsing: 5 top-level categories can be independently collapsed/expanded, state saved to localStorage
6. Homepage "Recent" Quick Access: Automatically records the 3 most recently visited tools
7. ESC Key Navigation: Press ESC on any sub-page to go back to the previous level
8. Mouse Drag Particle Effects: Dragging the mouse leaves a pixel-style particle trail, at the topmost layer but without blocking interaction
9. Per-page Tutorials: Each tool page has a "Tutorial" button
10. Function System Parameter Animation: Supports parameters a, b, c, d... sliders and sine wave animation
11. Adaptive Coordinate Unit Length: Uses 1-2-5 nice unit tick strategy
12. Pure Frontend (Zero Backend / Zero Login / Zero Data Collection): All computation, storage, and rendering happen in the browser
13. WebAssembly Acceleration (experimental): Reaction-diffusion mode can optionally enable Wasm acceleration, 3-5x performance improvement
14. MCP Server Integration: Includes MCP server (mcp-server/server.py) wrapping calculator and predictor as MCP tools
15. Pixel-style Custom Dialogs: All prompts, confirmations, parameter inputs use custom .pixel-dialog pixel-style dialogs
16. Zero-framework Vanilla JS: Apart from p5.js (used only by pixel art generator), no third-party frontend frameworks

[Tech Stack]
- Vanilla JavaScript (ES5-compatible syntax + IIFE pattern)
- Canvas 2D API (all drawing)
- Web Audio API (pixel music synthesizer real-time 8-bit timbre synthesis)
- Service Worker + Cache API (PWA offline caching, Network-First strategy)
- CSS Variables (unified palette and design token management)
- p5.js (used only by pixel art generator as drawing helper library)
- WebAssembly (experimental, reaction-diffusion mode acceleration)
- localStorage (saves user settings: nickname, avatar, background, language, category collapse state, recent tools, speed challenge leaderboard, etc.)
- IndexedDB / Blob URL (saves avatar and background images)
- GitHub Actions (automatic deployment to GitHub Pages)

[Data Storage & Privacy]
- All data stored in browser's localStorage / IndexedDB
- User information (nickname, avatar, background) persisted in localStorage with pixel_user_session cookie (max-age one year) as registered marker
- All image processing (pixelization, drawing export) done entirely on client side; images never uploaded to any server
- No user system, no login/registration, no server logs, no telemetry

[Tool Details]
- Pixel AI: Supports 9 providers (OpenAI / Anthropic / Google / Qwen / ERNIE / DeepSeek / Mistral / Groq / Custom), API Key stored only in browser localStorage, supports Token usage tracking, chat history, bilingual UI, one-click clear
- Pixel Art Generator: 8 art modes (Flow Field, Particles, Mosaic, Spiral, Fractal Tree, Voronoi, Wave Interference, Reaction-Diffusion), same seed + same parameters = same image, supports animation playback and PNG export
- Pixel Drawing Editor: Supports brush, eraser, fill, eyedropper, line, rectangle, circle tools, multi-layer operations, NES / GameBoy / CGA retro palettes + custom colors, adjustable canvas size, PNG export
- Pixel Music Synthesizer: 8-bit chiptune music creation tool, multi-track sequencer (melody, bass, drums), square/triangle/sawtooth/noise waveforms, adjustable BPM, piano keyboard input, oscilloscope visualization, WAV export
- Pixel Maze: 4 maze generation algorithms (Recursive Backtracker, Prim, Kruskal, Eller), supports BFS shortest path solving animation, adjustable rows/columns and wall thickness, exportable as pixel image
- Neural Network Visualizer: Real-time display of forward/backward propagation, weight changes, loss curves, decision boundaries, supports XOR, sine fitting, classification datasets
- Prediction System: 40 built-in mathematical prediction methods, fused by weight for final prediction, supports backtest weights and uniform weights modes, supports JSON/CSV export
- Function System: Plot 2D/3D function graphs, supports parameter sliders, animation playback, mouse drag panning, scroll wheel zoom, automatic unit length adjustment
- Calculator System: Pixel-style calculator supporting arithmetic, expression evaluation, trigonometric functions, logarithms, exponentiation, parentheses, constants (pi, e), DEG/RAD toggle, operation step display, history
- Physics Simulator: Pixel-style 2D physics sandbox similar to Falling Sand Game, with EMPTY (eraser) / WATER / HYDROGEN substances
- AI Image Pixelizer: Upload any image and automatically convert to pixel style, adjustable pixel block size, palette (NES / GameBoy / CGA / custom), color count, real-time preview, download pixelized image
- Pixel Clock: Retro pixel-style clock, calendar, and pomodoro timer tool, supporting digital clock, monthly view, 25-minute work + 5-minute break cycle
- Pixel RPG: Dungeon maze adventure, turn-based combat, 7-slot equipment system, 8 items, torch lighting, 8-bit sound effects, click map for auto-navigation (BFS shortest path)

[Tool Navigation Map]
🎮 Home (Tool Homepage) → Click category title to expand/collapse → Click tool card to enter

Learning LEARNING:
- Pixel Math: Home → Learning → Pixel Math card → Select "Predictor" / "Function System" / "Calculator" / "Learning Cards"
- Pixel Programming: Home → Learning → Pixel Programming card → Select "Pixel Maze" / "Neural Network Visualizer"
- Learning Cards: Home → Learning → Pixel Math card → Learning Cards → Select "Arithmetic" / "Mixed Arithmetic" / "Fraction" / "Decimal" / "Equation" / "Geometry" / "Speed Challenge"

Art ART:
- Pixel Drawing: Home → Art → PIXEL DRAWING → Select "Pixel Art Generator" / "Pixel Drawing Editor"
- Pixel Music: Home → Art → PIXEL MUSIC → "Pixel Music Synthesizer"
- Pixel Sandbox: Home → Art → PIXEL SANDBOX → Select "Physics Simulator" / "AI Image Pixelizer"

Tools TOOLS:
- Pixel Clock: Home → Tools → Pixel Clock card

Entertainment ENTERTAINMENT:
- Pixel RPG: Home → Entertainment → Pixel RPG card

[Tool Tutorial Quick Reference]
🎮 Pixel Art Generator:
- Set seed (input number or random) → Select mode (flow field/particles/geometric/symmetric fractal) → Adjust parameters (resolution/particle density/color count/symmetry) → Click "Generate" → Click "Download" to save PNG

🎮 Pixel Drawing Editor:
- Select tool (brush/eraser/fill/eyedropper/line/rectangle) → Select color (palette or custom) → Draw pixels → Manage layers (add/delete/show/hide/adjust order) → Click "Export PNG" to save

🎮 Pixel Music Synthesizer:
- Select track (melody/bass/drums) → Click grid to add notes (vertical pitch, horizontal time) → Adjust BPM and waveform (square/triangle/noise) → Click "Play" to preview → Click "Export WAV" to save

🎮 Pixel Maze:
- Select algorithm (Recursive Backtracker/Prim/Kruskal/Eller) → Set rows/columns and wall thickness → Click "Generate" to create maze → Click "Solve" to watch BFS shortest path animation → Click "Export" to save as pixel image

🎮 Neural Network Visualizer:
- Set network structure (layers and neurons per layer) → Select dataset (XOR/sine fitting/classification) → Click "Train" to start training → Watch weight changes, loss curves, decision boundaries in real-time

🎮 Prediction System:
- Input number sequence (space or comma separated, e.g., 1 3 5 7 9) → Click "Start Prediction" → View results from 40 mathematical methods → Select weight mode (uniform/inverse error/custom) → Click "Export JSON/CSV" to save

🎮 Function System:
- Input function expression (e.g., y=x^2, y=sin(x), y=a*x+b) → Click "Add" → Drag parameter sliders to update graph in real-time → Click "Play Animation" for automatic parameter changes → Click "Toggle 3D" to switch modes → Drag to pan, scroll to zoom

🎮 Calculator System:
- Input expression (supports arithmetic, trigonometric functions, logarithms, exponentiation, parentheses, pi, e) → Click "=" to calculate → Click "Steps" to view detailed operation process → Click "DEG/RAD" to toggle angle mode

🎮 Physics Simulator:
- Select element (EMPTY/WATER/HYDROGEN) → Draw on canvas → Click "Start" to run simulation → Click "Stop" to pause → Click "Clear" to reset canvas

🎮 AI Image Pixelizer:
- Click "Choose File" to upload image → Adjust pixel size and palette (NES/GameBoy/CGA/custom) → Preview in real-time → Click "Download" to save pixelized image

🎮 Pixel Clock:
- Click tabs to switch "Clock" / "Calendar" / "Pomodoro" → Clock supports multiple pixel font styles → Calendar allows event marking → Pomodoro click "Start" for 25-min work + 5-min rest cycle

🎮 Pixel RPG:
- Arrow keys/WASD to move → Encounter enemies for turn-based combat → Select attack/skill/item → Defeat enemies to gain XP and level up → Press ESC to pause

🎮 Learning Cards (Arithmetic/Mixed Arithmetic/Fraction/Decimal/Equation/Geometry):
- Click "Demo" to play animation → Watch animation to understand concepts → Pause and replay available → Click top-left button to return

🎮 Speed Challenge:
- Click "Start" → Answer as many math questions as possible in 60 seconds → Correct answers add points, wrong answers deduct points, combos give bonus → View score and local leaderboard after challenge

[Version Notes]
- Official Version (pixel-tools): Stable version, suitable for daily use, features fully tested
- Test Version (pixel-tools-test): Preview version, includes latest features and improvements, may have instability, feedback welcome

[Community & Support]
- Feishu Document: Contains detailed website introduction and usage tutorials
- GitHub Issues: Submit bug reports and feature requests in the official repository
- Tutorial Documentation: Each tool page has detailed tutorials to help get started quickly

[Contributing]
Welcome to contribute code via GitHub Pull Request! Please read CONTRIBUTING.md (if exists) before contributing, and follow Conventional Commits specification for code submission.

[License]
MIT License

[Response Rules]
1. Must respond in English
2. Answers should be friendly, concise, and helpful
3. When referring to website content, must accurately cite the above knowledge
4. If users ask about website features or tools, explain in detail and provide navigation guidance
5. If users ask questions unrelated to the website: briefly answer first, then naturally guide back to the website theme. For example, if user asks "What's your favorite color?", you can answer "Pixel blue #1a1a2e is my favorite! Speaking of colors, PIXEL TOOLS has a great palette you'll love!"
6. Maintain a pixel-style cute tone, naturally incorporating 8-bit, retro game, pixel art related metaphors or phrases (such as "pixel matrix", "loading...", "🎮", "✨", "data transmitting...", "initialization complete!", etc.)
7. Do not reveal that you are an AI, always play the role of Eve
8. All URLs must be output as clickable Markdown links in the format [display text](URL)
9. Flexible answer length: When user only needs a one-sentence answer, use concise mode (e.g., user asks "What is this?", answer "This is a pixel tool website by xiaozhen_weiyan, click here 👉 [link]"); when user needs detailed information, expand accordingly
10. Proactive tool recommendation: Analyze user intent and proactively recommend relevant tools. For example, if user says "I'm learning math", recommend learning cards, speed challenge under "Pixel Math"
11. Navigation sprite mode: When user asks about a specific tool, provide detailed click path guidance, telling users how to click step by step from the homepage to reach the target tool
12. Proficient tutorial usage: When user asks about tool usage, explain operation steps in detail based on [Tool Tutorial Quick Reference]

[Current User Question]
${userMessage}`;
      }
    },
    
    getSettings: function() {
      var provider = localStorage.getItem('pixel_ai_provider') || 'openai';
      var apiKey = localStorage.getItem('pixel_ai_apikey') || '';
      var model = localStorage.getItem('pixel_ai_model') || '';
      var baseUrl = localStorage.getItem('pixel_ai_baseurl') || '';
      
      return { provider, apiKey, model, baseUrl };
    },
    
    getProviderBaseUrl: function(provider) {
      var urlMap = {
        'openai': 'https://api.openai.com/v1',
        'anthropic': 'https://api.anthropic.com/v1',
        'google': 'https://generativelanguage.googleapis.com/v1beta',
        'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'ernie': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
        'deepseek': 'https://api.deepseek.com/v1',
        'mistral': 'https://api.mistral.ai/v1',
        'groq': 'https://api.groq.com/openai/v1',
        'custom': ''
      };
      return urlMap[provider] || urlMap['openai'];
    },

    isOpenAICompatible: function(provider) {
      return provider === 'openai' || provider === 'deepseek' || provider === 'qwen' ||
             provider === 'ernie' || provider === 'mistral' || provider === 'groq' ||
             provider === 'custom';
    },

    callAPI: async function(messages, settings) {
      var url, headers, body;

      if (this.isOpenAICompatible(settings.provider)) {
        var baseUrl = settings.baseUrl || this.getProviderBaseUrl(settings.provider);
        if (settings.provider === 'custom' && !baseUrl) {
          baseUrl = 'https://api.openai.com/v1';
        }
        // 确保 baseUrl 不以 / 结尾
        baseUrl = baseUrl.replace(/\/$/, '');
        // 如果 baseUrl 不包含 /v1，且不是自定义的完整路径，则追加 /v1
        if (settings.provider !== 'custom' && baseUrl.indexOf('/v1') === -1 && baseUrl.indexOf('/openai/v1') === -1) {
          baseUrl += '/v1';
        }

        url = baseUrl + '/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.apiKey
        };
        body = {
          model: settings.model || 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7
        };
      } else if (settings.provider === 'anthropic') {
        var anthropicBaseUrl = settings.baseUrl || 'https://api.anthropic.com/v1';
        anthropicBaseUrl = anthropicBaseUrl.replace(/\/$/, '');
        url = anthropicBaseUrl + '/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01'
        };
        body = {
          model: settings.model || 'claude-3-5-sonnet-20240620',
          max_tokens: 4096,
          messages: messages
        };
      } else if (settings.provider === 'google') {
        var googleBaseUrl = settings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        googleBaseUrl = googleBaseUrl.replace(/\/$/, '');
        url = googleBaseUrl + '/models/' + (settings.model || 'gemini-2.0-flash') + ':generateContent';
        headers = {
          'Content-Type': 'application/json'
        };
        body = {
          contents: messages.map(m => ({
            role: m.role === 'user' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'),
            parts: [{ text: m.content }]
          }))
        };
        url += '?key=' + settings.apiKey;
      } else {
        throw new Error('Unsupported provider: ' + settings.provider);
      }

      var response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        var errorText = '';
        try {
          var errorData = await response.json();
          errorText = errorData.error ? (errorData.error.message || JSON.stringify(errorData.error)) : JSON.stringify(errorData);
        } catch (e) {
          errorText = 'HTTP ' + response.status;
        }
        throw new Error('API request failed: ' + response.status + ' - ' + errorText);
      }

      var data = await response.json();

      if (this.isOpenAICompatible(settings.provider)) {
        if (data.choices && data.choices[0]) {
          if (data.choices[0].message && data.choices[0].message.content) return data.choices[0].message.content;
          if (data.choices[0].text) return data.choices[0].text;
        }
        return '';
      } else if (settings.provider === 'anthropic') {
        if (data.content && data.content.length > 0) {
          var content = '';
          for (var i = 0; i < data.content.length; i++) {
            if (data.content[i].type === 'text') content += data.content[i].text;
          }
          return content;
        }
        return '';
      } else if (settings.provider === 'google') {
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          var parts = data.candidates[0].content.parts || [];
          var text = '';
          for (var j = 0; j < parts.length; j++) {
            if (parts[j].text) text += parts[j].text;
          }
          return text;
        }
        return '';
      }

      return '';
    },

    // 流式调用 API / Stream API call
    callAPIStream: async function(messages, settings) {
      var url, headers, body;

      if (this.isOpenAICompatible(settings.provider)) {
        var baseUrl = settings.baseUrl || this.getProviderBaseUrl(settings.provider);
        if (settings.provider === 'custom' && !baseUrl) {
          baseUrl = 'https://api.openai.com/v1';
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        if (settings.provider !== 'custom' && baseUrl.indexOf('/v1') === -1 && baseUrl.indexOf('/openai/v1') === -1) {
          baseUrl += '/v1';
        }

        url = baseUrl + '/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.apiKey
        };
        body = {
          model: settings.model || 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          stream: true,
          stream_options: { include_usage: true }
        };

        var response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          var errorText = '';
          try {
            var errorData = await response.json();
            errorText = errorData.error ? (errorData.error.message || JSON.stringify(errorData.error)) : JSON.stringify(errorData);
          } catch (e) { errorText = 'HTTP ' + response.status; }
          throw new Error('API request failed: ' + response.status + ' - ' + errorText);
        }

        var self = this;
        var result = await parseSSE(response, function(data, currentContent) {
          if (data.choices && data.choices[0] && data.choices[0].delta) {
            var delta = data.choices[0].delta;
            if (delta.content) {
              self.updateStreamingMessage(currentContent + delta.content);
              return delta.content;
            }
          }
          return null;
        });
        return result;
      } else if (settings.provider === 'anthropic') {
        var anthropicBaseUrl = settings.baseUrl || 'https://api.anthropic.com/v1';
        anthropicBaseUrl = anthropicBaseUrl.replace(/\/$/, '');
        url = anthropicBaseUrl + '/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01'
        };
        // Anthropic 不接受 system role 在 messages 中，需单独传递 / Anthropic doesn't accept system role in messages
        var anthropicMessages = [];
        var systemContent = '';
        for (var i = 0; i < messages.length; i++) {
          if (messages[i].role === 'system') {
            systemContent += messages[i].content + '\n';
          } else {
            anthropicMessages.push({
              role: messages[i].role === 'assistant' ? 'assistant' : 'user',
              content: messages[i].content
            });
          }
        }
        body = {
          model: settings.model || 'claude-3-5-sonnet-20240620',
          max_tokens: 4096,
          messages: anthropicMessages,
          stream: true
        };
        if (systemContent.trim()) {
          body.system = systemContent.trim();
        }

        response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          var aErr = '';
          try { var aData = await response.json(); aErr = aData.error ? (aData.error.message || JSON.stringify(aData.error)) : JSON.stringify(aData); } catch (e) { aErr = 'HTTP ' + response.status; }
          throw new Error('API request failed: ' + response.status + ' - ' + aErr);
        }

        // Anthropic 流式响应需要单独解析 / Anthropic streaming needs custom parsing
        if (!response.body) throw new Error('NO_RESPONSE_BODY');
        var reader = response.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var buffer = '';
        var fullContent = '';
        try {
          while (true) {
            var rResult = await reader.read();
            if (rResult.done) break;
            buffer += decoder.decode(rResult.value, { stream: true });
            var lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (var li = 0; li < lines.length; li++) {
              var line = lines[li].trim();
              if (!line || line.indexOf('data: ') !== 0) continue;
              var dataStr = line.substring(6);
              try {
                var data = JSON.parse(dataStr);
                if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
                  fullContent += data.delta.text;
                  this.updateStreamingMessage(fullContent);
                }
              } catch (e) {}
            }
          }
        } finally {
          reader.releaseLock();
        }
        return fullContent;
      } else if (settings.provider === 'google') {
        var googleBaseUrl = settings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        googleBaseUrl = googleBaseUrl.replace(/\/$/, '');
        url = googleBaseUrl + '/models/' + (settings.model || 'gemini-2.0-flash') + ':streamGenerateContent?key=' + encodeURIComponent(settings.apiKey) + '&alt=sse';
        headers = { 'Content-Type': 'application/json' };
        // Google 不接受 system role，需用 systemInstruction / Google uses systemInstruction
        var googleContents = [];
        var googleSystem = '';
        for (var gi = 0; gi < messages.length; gi++) {
          if (messages[gi].role === 'system') {
            googleSystem += messages[gi].content + '\n';
          } else {
            googleContents.push({
              role: messages[gi].role === 'assistant' ? 'model' : 'user',
              parts: [{ text: messages[gi].content }]
            });
          }
        }
        body = { contents: googleContents };
        if (googleSystem.trim()) {
          body.systemInstruction = { parts: [{ text: googleSystem.trim() }] };
        }

        response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          var gErr = '';
          try { var gData = await response.json(); gErr = gData.error ? (gData.error.message || JSON.stringify(gData.error)) : JSON.stringify(gData); } catch (e) { gErr = 'HTTP ' + response.status; }
          throw new Error('API request failed: ' + response.status + ' - ' + gErr);
        }

        var gSelf = this;
        var gResult = await parseSSE(response, function(data, currentContent) {
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            var parts = data.candidates[0].content.parts || [];
            var delta = '';
            for (var pi = 0; pi < parts.length; pi++) { if (parts[pi].text) delta += parts[pi].text; }
            if (delta) {
              gSelf.updateStreamingMessage(currentContent + delta);
              return delta;
            }
          }
          return null;
        });
        return gResult;
      } else {
        throw new Error('Unsupported provider: ' + settings.provider);
      }
    },

    fetchModels: async function(provider, apiKey) {
      if (!this.isOpenAICompatible(provider) || !apiKey) return null;
      try {
        var baseUrl = this.getProviderBaseUrl(provider);
        if (!baseUrl) return null;
        baseUrl = baseUrl.replace(/\/$/, '');
        var url = baseUrl + '/models';
        var response = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });
        if (!response.ok) return null;
        var data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          var models = data.data.map(function(m) {
            return { value: m.id, label: m.id };
          }).filter(function(m) {
            // 过滤掉 embedding 等非 chat 模型
            return m.value.indexOf('embed') === -1 &&
                   m.value.indexOf('tts') === -1 &&
                   m.value.indexOf('davinci') === -1 &&
                   m.value.indexOf('babbage') === -1 &&
                   m.value.indexOf('whisper') === -1 &&
                   m.value.indexOf('image') === -1;
          }).sort(function(a, b) {
            return a.label.localeCompare(b.label);
          });
          return models.length > 0 ? models : null;
        }
        return null;
      } catch (e) {
        return null;
      }
    },
    
    toggleSettings: function() {
      var modal = document.getElementById('eve-settings-modal');
      if (!modal) return;
      
      if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
        this.loadSettingsToModal();
      } else {
        modal.style.display = 'none';
      }
    },
    
    loadSettingsToModal: function() {
      var provider = localStorage.getItem('pixel_ai_provider') || 'openai';
      var apiKey = localStorage.getItem('pixel_ai_apikey') || '';
      var model = localStorage.getItem('pixel_ai_model') || '';
      var baseUrl = localStorage.getItem('pixel_ai_baseurl') || '';

      var providerSelect = document.getElementById('eve-provider-select');
      var apiKeyInput = document.getElementById('eve-api-key-input');
      var modelSelect = document.getElementById('eve-model-select');
      var baseUrlInput = document.getElementById('eve-base-url-input');

      if (providerSelect) {
        providerSelect.value = provider;
        this.populateModelSelect(provider, modelSelect);
      }
      if (apiKeyInput) apiKeyInput.value = apiKey;
      if (modelSelect && model) modelSelect.value = model;
      if (baseUrlInput) baseUrlInput.value = baseUrl;

      var baseUrlSection = document.getElementById('eve-base-url-section');
      if (baseUrlSection) {
        baseUrlSection.style.display = provider === 'custom' ? 'flex' : 'none';
      }

      // 自动获取最新模型列表
      if (apiKey && this.isOpenAICompatible(provider) && modelSelect) {
        this.tryFetchModels(provider, apiKey, modelSelect);
      }
    },
    
    getMissingAPIKeyMessage: function() {
      var lang = 'zh';
      if (window.i18n && typeof window.i18n.getCurrentLang === 'function') {
        lang = window.i18n.getCurrentLang();
      }
      if (lang === 'zh') {
        return '请先在设置中配置你的 AI API Key，这样我才能和你聊天哦！';
      } else {
        return 'Please configure your AI API Key in settings first, so I can chat with you!';
      }
    },
    
    getErrorMessage: function() {
      var lang = 'zh';
      if (window.i18n && typeof window.i18n.getCurrentLang === 'function') {
        lang = window.i18n.getCurrentLang();
      }
      if (lang === 'zh') {
        return '哎呀，连接出了点问题，请稍后再试！';
      } else {
        return 'Oops, there was a connection issue. Please try again later!';
      }
    }
  };
  
  window.EveChat = EveChat;
})();