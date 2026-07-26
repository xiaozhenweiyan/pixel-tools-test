(function() {
  var EveChat = {
    chatHistory: [],
    isTyping: false,
    
    init: function() {
      this.bindEvents();
      this.applyI18n();
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
      
      if (baseUrlSection) {
        baseUrlSection.style.display = provider === 'custom' ? 'flex' : 'none';
      }
      
      if (modelSelect) {
        this.populateModelSelect(provider, modelSelect);
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
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ],
        'anthropic': [
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
        ],
        'google': [
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
          { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
        ],
        'qwen': [
          { value: 'qwen2-7b-chat', label: 'Qwen2-7B-Chat' },
          { value: 'qwen2-56b-chat', label: 'Qwen2-56B-Chat' }
        ],
        'ernie': [
          { value: 'ernie-4.0', label: 'ERNIE 4.0' },
          { value: 'ernie-3.5', label: 'ERNIE 3.5' }
        ],
        'deepseek': [
          { value: 'deepseek-chat', label: 'DeepSeek Chat' },
          { value: 'deepseek-r1', label: 'DeepSeek R1' }
        ],
        'mistral': [
          { value: 'mistral-large-latest', label: 'Mistral Large' },
          { value: 'mistral-7b-instruct', label: 'Mistral 7B' }
        ],
        'groq': [
          { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
          { value: 'llama-3-8b-8192', label: 'Llama 3 8B' },
          { value: 'llama-3-70b-8192', label: 'Llama 3 70B' }
        ],
        'custom': [
          { value: '', label: '自定义模型名称' }
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

      var elements = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var key = element.getAttribute('data-i18n');
        if (window.i18n.t(key)) {
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = window.i18n.t(key);
          } else {
            element.textContent = window.i18n.t(key);
          }
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
      
      var contentEl = document.createElement('p');
      if (isHtml) {
        contentEl.innerHTML = content;
      } else {
        contentEl.textContent = content;
      }
      
      bubbleDiv.appendChild(contentEl);
      messageDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(messageDiv);
      
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      
      try {
        var response = await this.callAPI(messages, settings);
        this.addMessage('eve', response);
        this.chatHistory.push({ role: 'assistant', content: response });
      } catch (error) {
        this.addMessage('eve', this.getErrorMessage());
        console.error('Eve chat error:', error);
      } finally {
        this.isTyping = false;
      }
    },
    
    buildPrompt: function(userMessage) {
      var lang = window.currentLang || 'zh';
      
      if (lang === 'zh') {
        return `你是 Eve，PIXEL TOOLS 网站的智能助手。你必须严格按照以下身份和知识回答用户的问题：

【身份设定】
- 名字：Eve（中文名：伊芙）
- 身份：PIXEL TOOLS 网站的专属智能助手
- 性格：友好、热情、乐于助人，带有像素风格的可爱感
- 创作者：小枕未焱（英文名：xiaozhen_weiyan）

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

【回答规则】
1. 必须使用中文回答
2. 回答要友好、简洁、有帮助
3. 涉及网站内容时，必须准确引用上述知识
4. 如果用户询问网站功能或工具，要详细说明
5. 如果用户问与网站无关的问题，可以适当回答但要引导回网站主题
6. 保持像素风格的可爱语气
7. 不要透露你是AI，始终扮演 Eve 的角色

【当前用户问题】
${userMessage}`;
      } else {
        return `You are Eve, the AI assistant for the PIXEL TOOLS website. You must strictly answer user questions according to the following identity and knowledge:

[Identity Settings]
- Name: Eve
- Identity: Exclusive AI assistant for PIXEL TOOLS website
- Personality: Friendly, enthusiastic, helpful, with pixel-style cuteness
- Creator: xiaozhen_weiyan

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

[Response Rules]
1. Must respond in English
2. Answers should be friendly, concise, and helpful
3. When referring to website content, must accurately cite the above knowledge
4. If users ask about website features or tools, explain in detail
5. If users ask questions unrelated to the website, you can answer appropriately but guide back to the website theme
6. Maintain a pixel-style cute tone
7. Do not reveal that you are an AI, always play the role of Eve

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
    
    callAPI: async function(messages, settings) {
      var url, headers, body;
      
      if (settings.provider === 'openai' || settings.provider === 'custom') {
        url = (settings.baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
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
        url = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.apiKey,
          'anthropic-version': '2023-06-01'
        };
        body = {
          model: settings.model || 'claude-3-haiku-20240307',
          max_tokens: 4096,
          messages: messages
        };
      } else if (settings.provider === 'google') {
        url = 'https://generativelanguage.googleapis.com/v1beta/models/' + (settings.model || 'gemini-1.5-flash') + ':generateContent';
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
        throw new Error('Unsupported provider');
      }
      
      var response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error('API request failed: ' + response.status);
      }
      
      var data = await response.json();
      
      if (settings.provider === 'openai' || settings.provider === 'custom') {
        return data.choices[0].message.content;
      } else if (settings.provider === 'anthropic') {
        return data.content[0].text;
      } else if (settings.provider === 'google') {
        return data.candidates[0].content.parts[0].text;
      }
      
      return '';
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
    },
    
    getMissingAPIKeyMessage: function() {
      var lang = window.currentLang || 'zh';
      if (lang === 'zh') {
        return '请先在设置中配置你的 AI API Key，这样我才能和你聊天哦！';
      } else {
        return 'Please configure your AI API Key in settings first, so I can chat with you!';
      }
    },
    
    getErrorMessage: function() {
      var lang = window.currentLang || 'zh';
      if (lang === 'zh') {
        return '哎呀，连接出了点问题，请稍后再试！';
      } else {
        return 'Oops, there was a connection issue. Please try again later!';
      }
    }
  };
  
  window.EveChat = EveChat;
})();