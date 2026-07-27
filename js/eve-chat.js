(function() {
  var EveChat = {
    chatHistory: [],
    isTyping: false,
    
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
      var lang = 'zh';
      if (window.i18n && typeof window.i18n.getCurrentLang === 'function') {
        lang = window.i18n.getCurrentLang();
      }
      
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