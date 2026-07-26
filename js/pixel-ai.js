/**
 * pixel-ai.js
 * 像素 AI 聊天模块 / Pixel AI Chat Module
 *
 * 功能：
 *   - 支持 9 家模型提供商（OpenAI / Anthropic / Google / 通义千问 / 文心一言 / DeepSeek / Mistral / Groq / 自定义）
 *   - 消息历史内存存储，单次会话保留
 *   - Token 使用统计，从 API 返回 usage 字段累加
 *   - 设置持久化到 localStorage（pixel_ai_settings）
 *   - API Key 安全：绝不输出到 console
 *   - Enter 发送，Shift+Enter 换行
 *   - 语言切换时重新渲染模型选项
 *
 * 用法：
 *   PixelAI.init();
 *   PixelAI.sendMessage(text);
 *   PixelAI.clearChat();
 *   PixelAI.openSettings();
 *   PixelAI.closeSettings();
 */
window.PixelAI = (function () {
  'use strict';

  // ============================================================
  // 常量 / Constants
  // ============================================================

  const STORAGE_KEY = 'pixel_ai_settings';

  const API_TYPES = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google'
  };

  const PROVIDERS = [
    {
      id: 'openai',
      nameKey: 'pixel_ai_provider_openai',
      apiType: API_TYPES.OPENAI,
      baseUrl: 'https://api.openai.com/v1',
      models: [
        { id: 'gpt-4o', nameKey: 'pixel_ai_model_gpt_4o' },
        { id: 'gpt-4o-mini', nameKey: 'pixel_ai_model_gpt_4o_mini' },
        { id: 'gpt-4-turbo', nameKey: 'pixel_ai_model_gpt_4_turbo' },
        { id: 'gpt-3.5-turbo', nameKey: 'pixel_ai_model_gpt_35_turbo' }
      ]
    },
    {
      id: 'anthropic',
      nameKey: 'pixel_ai_provider_anthropic',
      apiType: API_TYPES.ANTHROPIC,
      baseUrl: 'https://api.anthropic.com/v1',
      models: [
        { id: 'claude-3-5-sonnet-20240620', nameKey: 'pixel_ai_model_claude_35_sonnet' },
        { id: 'claude-3-opus-20240229', nameKey: 'pixel_ai_model_claude_3_opus' },
        { id: 'claude-3-haiku-20240307', nameKey: 'pixel_ai_model_claude_3_haiku' }
      ]
    },
    {
      id: 'google',
      nameKey: 'pixel_ai_provider_google',
      apiType: API_TYPES.GOOGLE,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: [
        { id: 'gemini-1.5-pro', nameKey: 'pixel_ai_model_gemini_15_pro' },
        { id: 'gemini-1.5-flash', nameKey: 'pixel_ai_model_gemini_15_flash' },
        { id: 'gemini-1.0-pro', nameKey: 'pixel_ai_model_gemini_10_pro' }
      ]
    },
    {
      id: 'qwen',
      nameKey: 'pixel_ai_provider_qwen',
      apiType: API_TYPES.OPENAI,
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: [
        { id: 'qwen-max', nameKey: 'pixel_ai_model_qwen_max' },
        { id: 'qwen-plus', nameKey: 'pixel_ai_model_qwen_plus' },
        { id: 'qwen-turbo', nameKey: 'pixel_ai_model_qwen_turbo' },
        { id: 'qwen-long', nameKey: 'pixel_ai_model_qwen_long' }
      ]
    },
    {
      id: 'ernie',
      nameKey: 'pixel_ai_provider_ernie',
      apiType: API_TYPES.OPENAI,
      baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      models: [
        { id: 'ernie-4.0-8k', nameKey: 'pixel_ai_model_ernie_40' },
        { id: 'ernie-3.5-8k', nameKey: 'pixel_ai_model_ernie_35' },
        { id: 'ernie-lite-8k', nameKey: 'pixel_ai_model_ernie_lite' }
      ]
    },
    {
      id: 'deepseek',
      nameKey: 'pixel_ai_provider_deepseek',
      apiType: API_TYPES.OPENAI,
      baseUrl: 'https://api.deepseek.com/v1',
      models: [
        { id: 'deepseek-v4-pro', nameKey: 'pixel_ai_model_deepseek_v4_pro' },
        { id: 'deepseek-v4-flash', nameKey: 'pixel_ai_model_deepseek_v4_flash' },
        { id: 'deepseek-coder-v2', nameKey: 'pixel_ai_model_deepseek_coder_v2' }
      ]
    },
    {
      id: 'mistral',
      nameKey: 'pixel_ai_provider_mistral',
      apiType: API_TYPES.OPENAI,
      baseUrl: 'https://api.mistral.ai/v1',
      models: [
        { id: 'mistral-large-latest', nameKey: 'pixel_ai_model_mistral_large' },
        { id: 'mistral-medium-latest', nameKey: 'pixel_ai_model_mistral_medium' },
        { id: 'mistral-small-latest', nameKey: 'pixel_ai_model_mistral_small' }
      ]
    },
    {
      id: 'groq',
      nameKey: 'pixel_ai_provider_groq',
      apiType: API_TYPES.OPENAI,
      baseUrl: 'https://api.groq.com/openai/v1',
      models: [
        { id: 'llama-3.3-70b-versatile', nameKey: 'pixel_ai_model_groq_llama_33' },
        { id: 'mixtral-8x7b-32768', nameKey: 'pixel_ai_model_groq_mixtral' },
        { id: 'gemma-7b-it', nameKey: 'pixel_ai_model_groq_gemma' }
      ]
    },
    {
      id: 'custom',
      nameKey: 'pixel_ai_provider_custom',
      apiType: API_TYPES.OPENAI,
      baseUrl: '',
      customBaseUrl: true,
      customModel: true,
      models: [
        { id: 'custom-model', nameKey: 'pixel_ai_provider_custom' }
      ]
    }
  ];

  // ============================================================
  // 模块状态 / Module State
  // ============================================================

  const state = {
    settings: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: ''
    },
    messages: [],
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    isLoading: false,
    isStreaming: false,
    streamingMessageEl: null,
    streamingContent: '',
    showApiKey: false,
    dom: {}
  };

  // ============================================================
  // 工具函数 / Utility Functions
  // ============================================================

  function t(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    // fallback: 简单的占位符替换 / simple placeholder replacement
    var text = key;
    if (params && typeof params === 'object') {
      text = key.replace(/\{(\w+)\}/g, function (match, paramKey) {
        return params.hasOwnProperty(paramKey) ? params[paramKey] : match;
      });
    }
    return text;
  }

  function getProvider(providerId) {
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].id === providerId) {
        return PROVIDERS[i];
      }
    }
    return PROVIDERS[0];
  }

  function getModels(providerId) {
    var provider = getProvider(providerId);
    return provider.models || [];
  }

  function getBaseUrl(providerId) {
    var provider = getProvider(providerId);
    if (provider.customBaseUrl && state.settings.baseUrl) {
      return state.settings.baseUrl.replace(/\/$/, '');
    }
    return provider.baseUrl;
  }

  function getModelId(providerId) {
    var provider = getProvider(providerId);
    if (provider.customModel) {
      return state.settings.model || 'custom-model';
    }
    return state.settings.model;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================
  // 设置持久化 / Settings Persistence
  // ============================================================

  function loadSettings() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.provider) state.settings.provider = parsed.provider;
        if (parsed.model) state.settings.model = parsed.model;
        if (parsed.apiKey) state.settings.apiKey = parsed.apiKey;
        if (parsed.baseUrl !== undefined) state.settings.baseUrl = parsed.baseUrl;
      }
    } catch (e) {
      // 静默失败 / silent fail
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        provider: state.settings.provider,
        model: state.settings.model,
        apiKey: state.settings.apiKey,
        baseUrl: state.settings.baseUrl
      }));
    } catch (e) {
      // 静默失败 / silent fail
    }
  }

  // ============================================================
  // DOM 缓存 / DOM Caching
  // ============================================================

  function cacheDom() {
    state.dom.messages = document.getElementById('ai-messages');
    state.dom.input = document.getElementById('ai-input');
    state.dom.sendBtn = document.getElementById('btn-ai-send');
    state.dom.clearBtn = document.getElementById('btn-ai-clear');
    state.dom.settingsBtn = document.getElementById('btn-ai-settings');
    state.dom.backBtn = document.getElementById('btn-back-home-ai');
    state.dom.settingsModal = document.getElementById('ai-settings-modal');
    state.dom.providerSelect = document.getElementById('ai-provider-select');
    state.dom.modelSelect = document.getElementById('ai-model-select');
    state.dom.apiKeyInput = document.getElementById('ai-api-key-input');
    state.dom.baseUrlInput = document.getElementById('ai-base-url-input');
    state.dom.baseUrlSection = document.getElementById('ai-base-url-section');
    state.dom.toggleKeyBtn = document.getElementById('btn-ai-toggle-key');
    state.dom.saveBtn = document.getElementById('btn-ai-settings-save');
    state.dom.cancelBtn = document.getElementById('btn-ai-settings-cancel');
    state.dom.totalTokens = document.getElementById('ai-total-tokens');
  }

  // ============================================================
  // 渲染函数 / Render Functions
  // ============================================================

  function renderProviderOptions() {
    if (!state.dom.providerSelect) return;
    var select = state.dom.providerSelect;
    select.innerHTML = '';
    for (var i = 0; i < PROVIDERS.length; i++) {
      var provider = PROVIDERS[i];
      var option = document.createElement('option');
      option.value = provider.id;
      option.textContent = t(provider.nameKey);
      if (provider.id === state.settings.provider) {
        option.selected = true;
      }
      select.appendChild(option);
    }
  }

  function renderModelOptions() {
    if (!state.dom.modelSelect) return;
    var select = state.dom.modelSelect;
    var provider = getProvider(state.settings.provider);
    select.innerHTML = '';

    if (provider.customModel) {
      var inputDiv = document.createElement('div');
      inputDiv.style.width = '100%';
      var input = document.createElement('input');
      input.type = 'text';
      input.id = 'ai-model-custom-input';
      input.className = 'pixel-input';
      input.value = state.settings.model || '';
      input.placeholder = t('pixel_ai_settings_model');
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      inputDiv.appendChild(input);
      select.parentNode.insertBefore(inputDiv, select.nextSibling);
      select.style.display = 'none';
    } else {
      var existingCustom = document.getElementById('ai-model-custom-input');
      if (existingCustom && existingCustom.parentNode) {
        existingCustom.parentNode.removeChild(existingCustom);
      }
      select.style.display = '';

      var models = getModels(state.settings.provider);
      var found = false;
      for (var i = 0; i < models.length; i++) {
        var model = models[i];
        var option = document.createElement('option');
        option.value = model.id;
        option.textContent = t(model.nameKey);
        if (model.id === state.settings.model) {
          option.selected = true;
          found = true;
        }
        select.appendChild(option);
      }
      if (!found && models.length > 0) {
        state.settings.model = models[0].id;
      }
    }
  }

  function renderBaseUrlSection() {
    if (!state.dom.baseUrlSection) return;
    var provider = getProvider(state.settings.provider);
    if (provider.customBaseUrl) {
      state.dom.baseUrlSection.style.display = '';
      if (state.dom.baseUrlInput) {
        state.dom.baseUrlInput.value = state.settings.baseUrl || '';
      }
    } else {
      state.dom.baseUrlSection.style.display = 'none';
    }
  }

  function renderTokenStats() {
    if (!state.dom.totalTokens) return;
    state.dom.totalTokens.textContent = t('pixel_ai_token_total_session') + ' ' + state.totalTokens;
  }

  function appendMessage(role, content, isError) {
    if (!state.dom.messages) return;
    var container = state.dom.messages;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message ai-message-' + role + (isError ? ' ai-message-error' : '');

    var label = document.createElement('div');
    label.className = 'ai-message-label';
    label.textContent = role === 'user' ? t('pixel_ai_you') : t('pixel_ai_assistant');
    msgDiv.appendChild(label);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    contentDiv.textContent = content;
    msgDiv.appendChild(contentDiv);

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    return msgDiv;
  }

  function appendThinkingMessage() {
    if (!state.dom.messages) return null;
    var container = state.dom.messages;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message ai-message-assistant ai-message-thinking';
    msgDiv.id = 'ai-thinking-message';

    var label = document.createElement('div');
    label.className = 'ai-message-label';
    label.textContent = t('pixel_ai_assistant');
    msgDiv.appendChild(label);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    contentDiv.textContent = t('pixel_ai_thinking');
    msgDiv.appendChild(contentDiv);

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    return msgDiv;
  }

  function removeThinkingMessage() {
    var thinking = document.getElementById('ai-thinking-message');
    if (thinking && thinking.parentNode) {
      thinking.parentNode.removeChild(thinking);
    }
  }

  function appendStreamingMessage(role) {
    if (!state.dom.messages) return null;
    var container = state.dom.messages;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message ai-message-' + role;
    msgDiv.id = 'ai-streaming-message';

    var label = document.createElement('div');
    label.className = 'ai-message-label';
    label.textContent = role === 'user' ? t('pixel_ai_you') : t('pixel_ai_assistant');
    msgDiv.appendChild(label);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    contentDiv.textContent = '';
    msgDiv.appendChild(contentDiv);

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    state.streamingMessageEl = msgDiv;
    state.streamingContent = '';

    return msgDiv;
  }

  function updateStreamingMessage(content) {
    if (!state.streamingMessageEl) return;
    state.streamingContent = content;
    var contentDiv = state.streamingMessageEl.querySelector('.ai-message-content');
    if (contentDiv) {
      contentDiv.textContent = content;
    }
    if (state.dom.messages) {
      state.dom.messages.scrollTop = state.dom.messages.scrollHeight;
    }
  }

  function finalizeStreamingMessage() {
    if (state.streamingMessageEl) {
      state.streamingMessageEl.id = '';
      state.streamingMessageEl = null;
    }
    state.streamingContent = '';
    state.isStreaming = false;
  }

  // ============================================================
  // API 调用 / API Calls
  // ============================================================

  async function safeFetch(url, options) {
    try {
      return await fetch(url, options);
    } catch (e) {
      // 网络错误 / Network error
      var wrappedErr = new Error('NETWORK_ERROR');
      wrappedErr.status = 0;
      wrappedErr.detail = e && e.message ? e.message : 'Network request failed';
      // 检查是否是 URL 无效
      if (e && e.message && e.message.indexOf('Failed to construct URL') !== -1) {
        wrappedErr = new Error('INVALID_BASE_URL');
        wrappedErr.status = 0;
        wrappedErr.detail = e.message;
      }
      // 检查是否是 CORS 相关（通过消息特征判断）
      if (e && e.message && e.message.toLowerCase().indexOf('cors') !== -1) {
        wrappedErr.detail = e.message;
      }
      throw wrappedErr;
    }
  }

  async function callApi(userMessage, useStream) {
    var provider = getProvider(state.settings.provider);
    var apiType = provider.apiType;
    var baseUrl = getBaseUrl(state.settings.provider);
    var modelId = getModelId(state.settings.provider);
    var apiKey = state.settings.apiKey;

    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    if (useStream) {
      if (apiType === API_TYPES.OPENAI) {
        return callOpenAIStream(baseUrl, modelId, apiKey);
      } else if (apiType === API_TYPES.ANTHROPIC) {
        return callAnthropicStream(baseUrl, modelId, apiKey);
      } else if (apiType === API_TYPES.GOOGLE) {
        return callGoogleStream(baseUrl, modelId, apiKey);
      }
    } else {
      if (apiType === API_TYPES.OPENAI) {
        return callOpenAI(baseUrl, modelId, apiKey);
      } else if (apiType === API_TYPES.ANTHROPIC) {
        return callAnthropic(baseUrl, modelId, apiKey);
      } else if (apiType === API_TYPES.GOOGLE) {
        return callGoogle(baseUrl, modelId, apiKey);
      }
    }

    throw new Error('UNKNOWN_API_TYPE');
  }

  async function callOpenAI(baseUrl, model, apiKey) {
    var messages = buildOpenAIMessages();
    var response = await safeFetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    var data = await response.json();
    var content = '';
    if (data.choices && data.choices[0]) {
      if (data.choices[0].message && data.choices[0].message.content) {
        content = data.choices[0].message.content;
      } else if (data.choices[0].text) {
        content = data.choices[0].text;
      }
    }

    if (data.usage) {
      if (data.usage.prompt_tokens) state.promptTokens += data.usage.prompt_tokens;
      if (data.usage.completion_tokens) state.completionTokens += data.usage.completion_tokens;
      if (data.usage.total_tokens) {
        state.totalTokens += data.usage.total_tokens;
      } else if (data.usage.prompt_tokens && data.usage.completion_tokens) {
        state.totalTokens += data.usage.prompt_tokens + data.usage.completion_tokens;
      }
    }

    return content;
  }

  async function callAnthropic(baseUrl, model, apiKey) {
    var messages = buildAnthropicMessages();
    var response = await safeFetch(baseUrl + '/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: messages
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    var data = await response.json();
    var content = '';
    if (data.content && data.content.length > 0) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === 'text') {
          content += data.content[i].text;
        }
      }
    }

    if (data.usage) {
      if (data.usage.input_tokens) {
        state.promptTokens += data.usage.input_tokens;
        state.totalTokens += data.usage.input_tokens;
      }
      if (data.usage.output_tokens) {
        state.completionTokens += data.usage.output_tokens;
        state.totalTokens += data.usage.output_tokens;
      }
    }

    return content;
  }

  async function callGoogle(baseUrl, model, apiKey) {
    var contents = buildGoogleContents();
    var url = baseUrl + '/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
    var response = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    var data = await response.json();
    var content = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var parts = data.candidates[0].content.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].text) {
          content += parts[i].text;
        }
      }
    }

    if (data.usageMetadata) {
      if (data.usageMetadata.promptTokenCount) {
        state.promptTokens += data.usageMetadata.promptTokenCount;
        state.totalTokens += data.usageMetadata.promptTokenCount;
      }
      if (data.usageMetadata.candidatesTokenCount) {
        state.completionTokens += data.usageMetadata.candidatesTokenCount;
        state.totalTokens += data.usageMetadata.candidatesTokenCount;
      }
      if (data.usageMetadata.totalTokenCount) {
        state.totalTokens = state.promptTokens + state.completionTokens;
      }
    }

    return content;
  }

  async function parseSSE(response, onDelta, onDone) {
    if (!response.body) {
      throw new Error('NO_RESPONSE_BODY');
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    var fullContent = '';
    var usageData = null;

    try {
      while (true) {
        var result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;
          if (line.indexOf('data: ') !== 0) continue;

          var dataStr = line.substring(6);
          if (dataStr === '[DONE]') {
            if (onDone) onDone(fullContent, usageData);
            return { content: fullContent, usage: usageData };
          }

          try {
            var data = JSON.parse(dataStr);
            var delta = onDelta(data, fullContent);
            if (delta && typeof delta === 'string') {
              fullContent += delta;
            }
            if (data.usage) {
              usageData = data.usage;
            }
          } catch (e) {
            // 忽略解析失败的行
          }
        }
      }

      if (buffer) {
        var line = buffer.trim();
        if (line && line.indexOf('data: ') === 0) {
          var dataStr = line.substring(6);
          if (dataStr !== '[DONE]') {
            try {
              var data = JSON.parse(dataStr);
              var delta = onDelta(data, fullContent);
              if (delta && typeof delta === 'string') {
                fullContent += delta;
              }
              if (data.usage) {
                usageData = data.usage;
              }
            } catch (e) {
              // 忽略解析失败的行
            }
          }
        }
      }

      if (onDone) onDone(fullContent, usageData);
      return { content: fullContent, usage: usageData };
    } finally {
      reader.releaseLock();
    }
  }

  async function callOpenAIStream(baseUrl, model, apiKey) {
    var messages = buildOpenAIMessages();
    var response = await safeFetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
        stream_options: { include_usage: true }
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    var result = await parseSSE(response, function (data, currentContent) {
      if (data.choices && data.choices[0] && data.choices[0].delta) {
        var delta = data.choices[0].delta;
        if (delta.content) {
          updateStreamingMessage(currentContent + delta.content);
          return delta.content;
        }
      }
      return null;
    });

    if (result.usage) {
      var usage = result.usage;
      if (usage.prompt_tokens) state.promptTokens += usage.prompt_tokens;
      if (usage.completion_tokens) state.completionTokens += usage.completion_tokens;
      if (usage.total_tokens) {
        state.totalTokens += usage.total_tokens;
      } else if (usage.prompt_tokens && usage.completion_tokens) {
        state.totalTokens += usage.prompt_tokens + usage.completion_tokens;
      }
    }

    return result.content;
  }

  async function callAnthropicStream(baseUrl, model, apiKey) {
    var messages = buildAnthropicMessages();
    var response = await safeFetch(baseUrl + '/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    var fullContent = '';
    var inputTokens = 0;
    var outputTokens = 0;

    if (!response.body) {
      throw new Error('NO_RESPONSE_BODY');
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';

    try {
      while (true) {
        var result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;
          if (line.indexOf('data: ') !== 0) continue;

          var dataStr = line.substring(6);
          try {
            var data = JSON.parse(dataStr);

            if (data.type === 'message_start' && data.message && data.message.usage) {
              inputTokens = data.message.usage.input_tokens || 0;
            }

            if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
              fullContent += data.delta.text;
              updateStreamingMessage(fullContent);
            }

            if (data.type === 'message_delta' && data.usage) {
              outputTokens = data.usage.output_tokens || 0;
            }
          } catch (e) {
            // 忽略解析失败的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (inputTokens) {
      state.promptTokens += inputTokens;
      state.totalTokens += inputTokens;
    }
    if (outputTokens) {
      state.completionTokens += outputTokens;
      state.totalTokens += outputTokens;
    }

    return fullContent;
  }

  async function callGoogleStream(baseUrl, model, apiKey) {
    var contents = buildGoogleContents();
    var url = baseUrl + '/models/' + model + ':streamGenerateContent?key=' + encodeURIComponent(apiKey) + '&alt=sse';
    var response = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    var result = await parseSSE(response, function (data, currentContent) {
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        var parts = data.candidates[0].content.parts || [];
        var delta = '';
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].text) {
            delta += parts[i].text;
          }
        }
        if (delta) {
          updateStreamingMessage(currentContent + delta);
          return delta;
        }
      }
      return null;
    });

    if (result.usage) {
      var usage = result.usage;
      if (usage.promptTokenCount) {
        state.promptTokens += usage.promptTokenCount;
        state.totalTokens += usage.promptTokenCount;
      }
      if (usage.candidatesTokenCount) {
        state.completionTokens += usage.candidatesTokenCount;
        state.totalTokens += usage.candidatesTokenCount;
      }
      if (usage.totalTokenCount) {
        state.totalTokens = state.promptTokens + state.completionTokens;
      }
    }

    return result.content;
  }

  function buildOpenAIMessages() {
    var result = [];
    for (var i = 0; i < state.messages.length; i++) {
      var msg = state.messages[i];
      result.push({
        role: msg.role,
        content: msg.content
      });
    }
    return result;
  }

  function buildAnthropicMessages() {
    var result = [];
    for (var i = 0; i < state.messages.length; i++) {
      var msg = state.messages[i];
      if (msg.role === 'system') continue;
      result.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }
    return result;
  }

  function buildGoogleContents() {
    var result = [];
    for (var i = 0; i < state.messages.length; i++) {
      var msg = state.messages[i];
      if (msg.role === 'system') continue;
      result.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    return result;
  }

  async function handleApiError(response) {
    var status = response.status;
    var errorMsg = '';
    var errorType = 'UNKNOWN_ERROR';

    try {
      var data = await response.json();
      if (data.error && data.error.message) {
        errorMsg = data.error.message;
      } else if (data.error) {
        errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data.message) {
        errorMsg = data.message;
      } else if (data.error_msg) {
        errorMsg = data.error_msg;
      } else if (data.code && data.message) {
        errorMsg = '[' + data.code + '] ' + data.message;
      }
    } catch (e) {
      // 无法解析错误体 / unable to parse error body
    }

    // 如果没有解析到错误消息，尝试用 statusText
    if (!errorMsg && response.statusText) {
      errorMsg = response.statusText;
    }

    if (status === 401 || status === 403) {
      errorType = 'AUTH_ERROR';
    } else if (status === 429) {
      errorType = 'RATE_LIMIT';
    } else if (status === 400) {
      errorType = 'BAD_REQUEST';
    } else if (status === 404) {
      errorType = 'NOT_FOUND';
    } else if (status >= 500) {
      errorType = 'SERVER_ERROR';
    } else {
      errorType = 'UNKNOWN_ERROR';
    }

    var err = new Error(errorType);
    err.status = status;
    err.detail = errorMsg;
    throw err;
  }

  // ============================================================
  // 消息发送 / Message Sending
  // ============================================================

  async function sendMessage(text) {
    if (state.isLoading) return;
    if (!text || !text.trim()) return;

    var userContent = text.trim();
    state.messages.push({ role: 'user', content: userContent });
    appendMessage('user', userContent);

    if (state.dom.input) {
      state.dom.input.value = '';
    }

    state.isLoading = true;
    state.isStreaming = true;
    updateSendButtonState();

    appendThinkingMessage();

    try {
      var reply;
      var usedStream = true;

      try {
        removeThinkingMessage();
        appendStreamingMessage('assistant');

        reply = await callApi(userContent, true);

        if (!reply || !reply.trim()) {
          throw new Error('EMPTY_STREAM_RESPONSE');
        }
      } catch (streamErr) {
        usedStream = false;
        console.warn('[PixelAI] Stream failed, falling back to non-stream:', streamErr.message);

        if (state.streamingMessageEl && state.streamingMessageEl.parentNode) {
          state.streamingMessageEl.parentNode.removeChild(state.streamingMessageEl);
        }
        finalizeStreamingMessage();

        appendThinkingMessage();

        reply = await callApi(userContent, false);
        removeThinkingMessage();
      }

      state.messages.push({ role: 'assistant', content: reply });

      if (usedStream) {
        finalizeStreamingMessage();
      } else {
        appendMessage('assistant', reply);
      }

      renderTokenStats();
    } catch (e) {
      removeThinkingMessage();

      if (state.streamingMessageEl && state.streamingMessageEl.parentNode) {
        state.streamingMessageEl.parentNode.removeChild(state.streamingMessageEl);
      }
      finalizeStreamingMessage();

      // 控制台输出便于调试（不输出 API Key）/ console log for debugging (no API key)
      console.warn('[PixelAI] Error:', e.message, e.status || '', e.detail || '');
      var errorText = buildErrorMessage(e);
      appendMessage('assistant', errorText, true);
    }

    state.isLoading = false;
    state.isStreaming = false;
    updateSendButtonState();
  }

  function buildErrorMessage(e) {
    var lines = [];

    // 主错误消息 / main error message
    var mainMsg = t('pixel_ai_error_unknown');

    if (e.message === 'NO_API_KEY') {
      mainMsg = t('pixel_ai_no_key');
    } else if (e.message === 'AUTH_ERROR') {
      mainMsg = t('pixel_ai_error_auth');
    } else if (e.message === 'RATE_LIMIT') {
      mainMsg = t('pixel_ai_error_rate');
    } else if (e.message === 'BAD_REQUEST') {
      mainMsg = t('pixel_ai_error_bad_request');
    } else if (e.message === 'NOT_FOUND') {
      mainMsg = t('pixel_ai_error_not_found');
    } else if (e.message === 'SERVER_ERROR') {
      mainMsg = t('pixel_ai_error_server');
    } else if (e.message === 'INVALID_BASE_URL') {
      mainMsg = t('pixel_ai_error_invalid_base_url');
    } else if (e.message === 'NETWORK_ERROR' || isNetworkError(e)) {
      mainMsg = t('pixel_ai_error_network');
      // 尝试判断是否是 CORS 错误
      if (e.detail && e.detail.toLowerCase && e.detail.toLowerCase().indexOf('cors') !== -1) {
        mainMsg = t('pixel_ai_error_cors');
      }
      if (e.message && e.message.toLowerCase && e.message.toLowerCase().indexOf('cors') !== -1) {
        mainMsg = t('pixel_ai_error_cors');
      }
    }

    lines.push(mainMsg);

    // 状态码 / status code
    if (e.status) {
      lines.push(t('pixel_ai_error_status', { code: e.status }));
    }

    // 详细错误信息 / detailed error info
    if (e.detail && e.detail.length > 0 && e.detail.length < 500) {
      lines.push(t('pixel_ai_error_detail', { detail: e.detail }));
    } else if (e.detail && e.detail.length >= 500) {
      lines.push(t('pixel_ai_error_detail', { detail: e.detail.substring(0, 500) + '...' }));
    }

    return lines.join('\n');
  }

  function isNetworkError(e) {
    if (!e || !e.message) return false;
    var msg = e.message.toLowerCase();
    return msg.indexOf('failed to fetch') !== -1
      || msg.indexOf('networkerror') !== -1
      || msg.indexOf('typeerror') !== -1
      || msg.indexOf('load failed') !== -1
      || msg.indexOf('cors') !== -1
      || msg.indexOf('net::') !== -1;
  }

  function updateSendButtonState() {
    if (!state.dom.sendBtn) return;
    state.dom.sendBtn.disabled = state.isLoading;
    if (state.isLoading) {
      state.dom.sendBtn.classList.add('pixel-btn-disabled');
    } else {
      state.dom.sendBtn.classList.remove('pixel-btn-disabled');
    }
  }

  // ============================================================
  // 清空对话 / Clear Chat
  // ============================================================

  function clearChat() {
    state.messages = [];
    state.totalTokens = 0;
    state.promptTokens = 0;
    state.completionTokens = 0;
    if (state.dom.messages) {
      state.dom.messages.innerHTML = '';
    }
    renderTokenStats();
  }

  // ============================================================
  // 设置弹窗 / Settings Modal
  // ============================================================

  function openSettings() {
    if (!state.dom.settingsModal) return;

    loadSettings();

    renderProviderOptions();
    renderModelOptions();
    renderBaseUrlSection();

    if (state.dom.apiKeyInput) {
      state.dom.apiKeyInput.value = state.settings.apiKey || '';
      state.dom.apiKeyInput.type = state.showApiKey ? 'text' : 'password';
    }

    if (state.dom.toggleKeyBtn) {
      state.dom.toggleKeyBtn.textContent = state.showApiKey ? t('pixel_ai_settings_hide') : t('pixel_ai_settings_show');
    }

    state.dom.settingsModal.style.display = 'flex';
  }

  function closeSettings() {
    if (!state.dom.settingsModal) return;
    state.dom.settingsModal.style.display = 'none';
  }

  function toggleApiKeyVisibility() {
    state.showApiKey = !state.showApiKey;
    if (state.dom.apiKeyInput) {
      state.dom.apiKeyInput.type = state.showApiKey ? 'text' : 'password';
    }
    if (state.dom.toggleKeyBtn) {
      state.dom.toggleKeyBtn.textContent = state.showApiKey ? t('pixel_ai_settings_hide') : t('pixel_ai_settings_show');
    }
  }

  function onProviderChange() {
    if (!state.dom.providerSelect) return;
    state.settings.provider = state.dom.providerSelect.value;

    var provider = getProvider(state.settings.provider);
    var models = provider.models;
    if (models && models.length > 0 && !provider.customModel) {
      state.settings.model = models[0].id;
    }

    renderModelOptions();
    renderBaseUrlSection();
  }

  function saveSettingsFromModal() {
    if (state.dom.providerSelect) {
      state.settings.provider = state.dom.providerSelect.value;
    }

    var provider = getProvider(state.settings.provider);

    if (provider.customModel) {
      var customInput = document.getElementById('ai-model-custom-input');
      if (customInput) {
        state.settings.model = customInput.value.trim() || 'custom-model';
      }
    } else {
      if (state.dom.modelSelect) {
        state.settings.model = state.dom.modelSelect.value;
      }
    }

    if (state.dom.apiKeyInput) {
      state.settings.apiKey = state.dom.apiKeyInput.value.trim();
    }

    if (state.dom.baseUrlInput) {
      state.settings.baseUrl = state.dom.baseUrlInput.value.trim();
    }

    saveSettings();
    closeSettings();

    showToast(t('pixel_ai_settings_saved'));
  }

  function showToast(message) {
    var existing = document.getElementById('ai-toast');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var toast = document.createElement('div');
    toast.id = 'ai-toast';
    toast.className = 'pixel-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position: fixed',
      'top: 20px',
      'left: 50%',
      'transform: translateX(-50%)',
      'background: #2d2d44',
      'color: #ffd700',
      'padding: 10px 20px',
      'border: 2px solid #ffd700',
      'font-family: monospace',
      'font-size: 14px',
      'z-index: 10000',
      'image-rendering: pixelated'
    ].join(';');

    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2000);
  }

  // ============================================================
  // 事件绑定 / Event Binding
  // ============================================================

  function bindEvents() {
    if (state.dom.sendBtn) {
      state.dom.sendBtn.addEventListener('click', onSendClick);
    }

    if (state.dom.input) {
      state.dom.input.addEventListener('keydown', onInputKeydown);
    }

    if (state.dom.clearBtn) {
      state.dom.clearBtn.addEventListener('click', clearChat);
    }

    if (state.dom.settingsBtn) {
      state.dom.settingsBtn.addEventListener('click', openSettings);
    }

    if (state.dom.providerSelect) {
      state.dom.providerSelect.addEventListener('change', onProviderChange);
    }

    if (state.dom.toggleKeyBtn) {
      state.dom.toggleKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    }

    if (state.dom.saveBtn) {
      state.dom.saveBtn.addEventListener('click', saveSettingsFromModal);
    }

    if (state.dom.cancelBtn) {
      state.dom.cancelBtn.addEventListener('click', closeSettings);
    }

    if (state.dom.settingsModal) {
      state.dom.settingsModal.addEventListener('click', onModalBackdropClick);
    }

    document.addEventListener('languagechange', onLanguageChange);
  }

  function onSendClick() {
    if (!state.dom.input) return;
    sendMessage(state.dom.input.value);
  }

  function onInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendClick();
    }
  }

  function onModalBackdropClick(e) {
    if (e.target === state.dom.settingsModal) {
      closeSettings();
    }
  }

  function onLanguageChange() {
    renderProviderOptions();
    renderModelOptions();
    renderBaseUrlSection();
    renderTokenStats();

    if (state.dom.toggleKeyBtn) {
      state.dom.toggleKeyBtn.textContent = state.showApiKey ? t('pixel_ai_settings_hide') : t('pixel_ai_settings_show');
    }

    if (state.dom.input) {
      state.dom.input.placeholder = t('pixel_ai_placeholder');
    }
  }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================

  function init() {
    cacheDom();

    if (!state.dom.messages) return;

    loadSettings();
    bindEvents();

    renderTokenStats();

    if (state.dom.input) {
      state.dom.input.placeholder = t('pixel_ai_placeholder');
    }
  }

  // ============================================================
  // 导出接口 / Public API
  // ============================================================

  return {
    init: init,
    sendMessage: sendMessage,
    clearChat: clearChat,
    openSettings: openSettings,
    closeSettings: closeSettings
  };
})();
