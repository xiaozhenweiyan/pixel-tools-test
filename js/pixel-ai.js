/**
 * pixel-ai.js
 * 像素 AI 聊天模块 / Pixel AI Chat Module
 *
 * 功能：
 *   - 支持 9 家模型提供商（OpenAI / Anthropic / Google / 通义千问 / 文心一言 / DeepSeek / Mistral / Groq / 自定义）
 *   - SSE 流式输出，失败自动回退非流式
 *   - 对话记录持久化到 localStorage（pixel_ai_conversations）
 *   - 左侧对话记录列表，可切换/删除
 *   - 消息可编辑（用户问题重发 / AI回答修改）
 *   - AI 回答支持 HTML 格式渲染（加粗/颜色等）
 *   - 自制滚动条
 *   - 创新功能：一键复制 / 重新生成 / 导出对话 / 提示词模板
 *   - Token 使用统计
 */
window.PixelAI = (function () {
  'use strict';

  // ============================================================
  // 常量 / Constants
  // ============================================================

  const STORAGE_KEY = 'pixel_ai_settings';
  const CONV_STORAGE_KEY = 'pixel_ai_conversations';

  const API_TYPES = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google'
  };

  const PROVIDERS = [
    { id: 'openai', nameKey: 'pixel_ai_provider_openai', apiType: API_TYPES.OPENAI, baseUrl: 'https://api.openai.com/v1',
      models: [
        { id: 'gpt-4o', nameKey: 'pixel_ai_model_gpt_4o' },
        { id: 'gpt-4o-mini', nameKey: 'pixel_ai_model_gpt_4o_mini' },
        { id: 'gpt-4-turbo', nameKey: 'pixel_ai_model_gpt_4_turbo' },
        { id: 'gpt-3.5-turbo', nameKey: 'pixel_ai_model_gpt_35_turbo' }
      ]},
    { id: 'anthropic', nameKey: 'pixel_ai_provider_anthropic', apiType: API_TYPES.ANTHROPIC, baseUrl: 'https://api.anthropic.com/v1',
      models: [
        { id: 'claude-3-5-sonnet-20240620', nameKey: 'pixel_ai_model_claude_35_sonnet' },
        { id: 'claude-3-opus-20240229', nameKey: 'pixel_ai_model_claude_3_opus' },
        { id: 'claude-3-haiku-20240307', nameKey: 'pixel_ai_model_claude_3_haiku' }
      ]},
    { id: 'google', nameKey: 'pixel_ai_provider_google', apiType: API_TYPES.GOOGLE, baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: [
        { id: 'gemini-1.5-pro', nameKey: 'pixel_ai_model_gemini_15_pro' },
        { id: 'gemini-1.5-flash', nameKey: 'pixel_ai_model_gemini_15_flash' },
        { id: 'gemini-1.0-pro', nameKey: 'pixel_ai_model_gemini_10_pro' }
      ]},
    { id: 'qwen', nameKey: 'pixel_ai_provider_qwen', apiType: API_TYPES.OPENAI, baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: [
        { id: 'qwen-max', nameKey: 'pixel_ai_model_qwen_max' },
        { id: 'qwen-plus', nameKey: 'pixel_ai_model_qwen_plus' },
        { id: 'qwen-turbo', nameKey: 'pixel_ai_model_qwen_turbo' },
        { id: 'qwen-long', nameKey: 'pixel_ai_model_qwen_long' }
      ]},
    { id: 'ernie', nameKey: 'pixel_ai_provider_ernie', apiType: API_TYPES.OPENAI, baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      models: [
        { id: 'ernie-4.0-8k', nameKey: 'pixel_ai_model_ernie_40' },
        { id: 'ernie-3.5-8k', nameKey: 'pixel_ai_model_ernie_35' },
        { id: 'ernie-lite-8k', nameKey: 'pixel_ai_model_ernie_lite' }
      ]},
    { id: 'deepseek', nameKey: 'pixel_ai_provider_deepseek', apiType: API_TYPES.OPENAI, baseUrl: 'https://api.deepseek.com/v1',
      models: [
        { id: 'deepseek-v4-pro', nameKey: 'pixel_ai_model_deepseek_v4_pro' },
        { id: 'deepseek-v4-flash', nameKey: 'pixel_ai_model_deepseek_v4_flash' },
        { id: 'deepseek-coder-v2', nameKey: 'pixel_ai_model_deepseek_coder_v2' }
      ]},
    { id: 'mistral', nameKey: 'pixel_ai_provider_mistral', apiType: API_TYPES.OPENAI, baseUrl: 'https://api.mistral.ai/v1',
      models: [
        { id: 'mistral-large-latest', nameKey: 'pixel_ai_model_mistral_large' },
        { id: 'mistral-medium-latest', nameKey: 'pixel_ai_model_mistral_medium' },
        { id: 'mistral-small-latest', nameKey: 'pixel_ai_model_mistral_small' }
      ]},
    { id: 'groq', nameKey: 'pixel_ai_provider_groq', apiType: API_TYPES.OPENAI, baseUrl: 'https://api.groq.com/openai/v1',
      models: [
        { id: 'llama-3.3-70b-versatile', nameKey: 'pixel_ai_model_groq_llama_33' },
        { id: 'mixtral-8x7b-32768', nameKey: 'pixel_ai_model_groq_mixtral' },
        { id: 'gemma-7b-it', nameKey: 'pixel_ai_model_groq_gemma' }
      ]},
    { id: 'custom', nameKey: 'pixel_ai_provider_custom', apiType: API_TYPES.OPENAI, baseUrl: '', customBaseUrl: true, customModel: true,
      models: [{ id: 'custom-model', nameKey: 'pixel_ai_provider_custom' }]}
  ];

  // ============================================================
  // 模块状态 / Module State
  // ============================================================

  const state = {
    settings: { provider: 'openai', model: 'gpt-4o-mini', apiKey: '', baseUrl: '' },
    conversations: [],
    currentConvId: null,
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
      if (PROVIDERS[i].id === providerId) return PROVIDERS[i];
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

  // 将 Markdown 转换为 HTML / Convert Markdown to HTML
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

  // 渲染 AI 回答的 HTML（移除 script 标签，保留格式化标签）/ Render AI HTML (strip scripts, keep formatting)
  function sanitizeHtml(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<script[^>]*>/gi, '');
  }

  function genId() {
    return 'conv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
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
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        provider: state.settings.provider,
        model: state.settings.model,
        apiKey: state.settings.apiKey,
        baseUrl: state.settings.baseUrl
      }));
    } catch (e) {}
  }

  // ============================================================
  // 对话记录持久化 / Conversation Persistence
  // ============================================================

  function loadConversations() {
    try {
      var saved = localStorage.getItem(CONV_STORAGE_KEY);
      if (saved) {
        state.conversations = JSON.parse(saved) || [];
      }
    } catch (e) {
      state.conversations = [];
    }
  }

  function saveConversations() {
    try {
      // 更新当前对话 / Update current conversation
      if (state.currentConvId) {
        var conv = getConversation(state.currentConvId);
        if (conv) {
          conv.messages = state.messages;
          conv.totalTokens = state.totalTokens;
          conv.timestamp = Date.now();
        }
      }
      localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(state.conversations));
    } catch (e) {}
  }

  function getConversation(convId) {
    for (var i = 0; i < state.conversations.length; i++) {
      if (state.conversations[i].id === convId) return state.conversations[i];
    }
    return null;
  }

  function createConversation() {
    var conv = {
      id: genId(),
      title: t('pixel_ai_new_chat'),
      messages: [],
      totalTokens: 0,
      timestamp: Date.now()
    };
    state.conversations.unshift(conv);
    state.currentConvId = conv.id;
    state.messages = [];
    state.totalTokens = 0;
    state.promptTokens = 0;
    state.completionTokens = 0;
    saveConversations();
    renderConversationList();
    renderMessages();
    renderTokenStats();
    return conv;
  }

  function switchConversation(convId) {
    var conv = getConversation(convId);
    if (!conv) return;
    state.currentConvId = convId;
    state.messages = conv.messages || [];
    state.totalTokens = conv.totalTokens || 0;
    state.promptTokens = 0;
    state.completionTokens = 0;
    renderMessages();
    renderTokenStats();
    renderConversationList();
  }

  function deleteConversation(convId) {
    var idx = -1;
    for (var i = 0; i < state.conversations.length; i++) {
      if (state.conversations[i].id === convId) { idx = i; break; }
    }
    if (idx === -1) return;
    state.conversations.splice(idx, 1);
    if (state.currentConvId === convId) {
      if (state.conversations.length > 0) {
        switchConversation(state.conversations[0].id);
      } else {
        createConversation();
      }
    }
    saveConversations();
    renderConversationList();
  }

  function updateConversationTitle() {
    if (!state.currentConvId) return;
    var conv = getConversation(state.currentConvId);
    if (!conv) return;
    // 从第一条用户消息生成标题 / Generate title from first user message
    for (var i = 0; i < state.messages.length; i++) {
      if (state.messages[i].role === 'user') {
        var title = state.messages[i].content.substring(0, 30);
        if (state.messages[i].content.length > 30) title += '...';
        conv.title = title;
        break;
      }
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
    state.dom.convList = document.getElementById('ai-conversation-list');
    state.dom.newChatBtn = document.getElementById('btn-ai-new-chat');
    state.dom.scrollbarTrack = document.getElementById('ai-scrollbar-track');
    state.dom.scrollbarThumb = document.getElementById('ai-scrollbar-thumb');
    state.dom.promptTemplates = document.getElementById('ai-prompt-templates');
    // 自制确认弹窗 / Custom confirm modal
    state.dom.confirmModal = document.getElementById('ai-confirm-modal');
    state.dom.confirmTitle = document.getElementById('ai-confirm-title');
    state.dom.confirmMessage = document.getElementById('ai-confirm-message');
    state.dom.confirmIcon = document.getElementById('ai-confirm-icon');
    state.dom.confirmOk = document.getElementById('btn-ai-confirm-ok');
    state.dom.confirmCancel = document.getElementById('btn-ai-confirm-cancel');
  }

  // ============================================================
  // 自制确认弹窗 / Custom Confirm Dialog
  // ============================================================

  // 显示自制确认弹窗，返回 Promise（true=确定，false=取消）
  // Show custom confirm dialog, returns Promise (true=OK, false=Cancel)
  function showConfirmDialog(options) {
    options = options || {};
    var message = options.message || '';
    var title = options.title || t('pixel_ai_confirm_title');
    var icon = options.icon || '⚠';
    var okText = options.okText || t('pixel_ai_confirm_ok');
    var cancelText = options.cancelText || t('pixel_ai_confirm_cancel');
    var danger = options.danger !== false; // 默认红色危险按钮 / Default red danger button

    return new Promise(function (resolve) {
      if (!state.dom.confirmModal) {
        // 回退到原生 confirm / Fallback to native confirm
        resolve(window.confirm(message));
        return;
      }

      // 设置内容 / Set content
      if (state.dom.confirmTitle) state.dom.confirmTitle.textContent = title;
      if (state.dom.confirmMessage) state.dom.confirmMessage.textContent = message;
      if (state.dom.confirmIcon) state.dom.confirmIcon.textContent = icon;
      if (state.dom.confirmOk) state.dom.confirmOk.textContent = okText;
      if (state.dom.confirmCancel) state.dom.confirmCancel.textContent = cancelText;

      // 危险样式切换 / Toggle danger style
      if (state.dom.confirmOk) {
        if (danger) {
          state.dom.confirmOk.classList.add('ai-confirm-ok-btn');
        } else {
          state.dom.confirmOk.classList.remove('ai-confirm-ok-btn');
        }
      }

      // 显示弹窗 / Show modal
      state.dom.confirmModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // 清理旧监听器 / Clean old listeners
      var okBtn = state.dom.confirmOk;
      var cancelBtn = state.dom.confirmCancel;
      var modal = state.dom.confirmModal;
      var newOk = okBtn.cloneNode(true);
      var newCancel = cancelBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOk, okBtn);
      cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
      state.dom.confirmOk = newOk;
      state.dom.confirmCancel = newCancel;

      function close(result) {
        state.dom.confirmModal.style.display = 'none';
        document.body.style.overflow = '';
        resolve(result);
      }

      newOk.addEventListener('click', function () { close(true); });
      newCancel.addEventListener('click', function () { close(false); });

      // 点击遮罩关闭 / Click backdrop to close
      modal.addEventListener('click', function (e) {
        if (e.target === modal) close(false);
      });

      // ESC 关闭 / ESC to close
      var escHandler = function (e) {
        if (e.key === 'Escape') {
          close(false);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
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
      if (provider.id === state.settings.provider) option.selected = true;
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
        if (model.id === state.settings.model) { option.selected = true; found = true; }
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
      if (state.dom.baseUrlInput) state.dom.baseUrlInput.value = state.settings.baseUrl || '';
    } else {
      state.dom.baseUrlSection.style.display = 'none';
    }
  }

  function renderTokenStats() {
    if (!state.dom.totalTokens) return;
    state.dom.totalTokens.textContent = state.totalTokens;
  }

  // 渲染对话列表 / Render conversation list
  function renderConversationList() {
    if (!state.dom.convList) return;
    var list = state.dom.convList;
    list.innerHTML = '';

    if (state.conversations.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ai-conv-empty';
      empty.textContent = t('pixel_ai_no_conversations');
      list.appendChild(empty);
      return;
    }

    for (var i = 0; i < state.conversations.length; i++) {
      var conv = state.conversations[i];
      var item = document.createElement('div');
      item.className = 'ai-conv-item' + (conv.id === state.currentConvId ? ' active' : '');
      item.dataset.convId = conv.id;

      var title = document.createElement('div');
      title.className = 'ai-conv-title';
      title.textContent = conv.title || t('pixel_ai_new_chat');
      item.appendChild(title);

      var meta = document.createElement('div');
      meta.className = 'ai-conv-meta';
      var msgCount = (conv.messages || []).length;
      var date = new Date(conv.timestamp);
      var dateStr = (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
      meta.textContent = msgCount + ' ' + t('pixel_ai_messages_count') + ' · ' + dateStr;
      item.appendChild(meta);

      var delBtn = document.createElement('button');
      delBtn.className = 'ai-conv-delete';
      delBtn.textContent = '×';
      delBtn.title = t('pixel_ai_delete_conv');
      delBtn.dataset.convId = conv.id;
      item.appendChild(delBtn);

      (function (id) {
        item.addEventListener('click', function (e) {
          if (e.target.classList.contains('ai-conv-delete')) return;
          switchConversation(id);
        });
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          showConfirmDialog({
            title: t('pixel_ai_confirm_delete_title'),
            message: t('pixel_ai_confirm_delete'),
            icon: '🗑',
            okText: t('pixel_ai_confirm_delete_ok')
          }).then(function (confirmed) {
            if (confirmed) {
              deleteConversation(id);
            }
          });
        });
      })(conv.id);

      list.appendChild(item);
    }
  }

  // 渲染所有消息 / Render all messages
  function renderMessages() {
    if (!state.dom.messages) return;
    state.dom.messages.innerHTML = '';

    if (state.messages.length === 0) {
      var welcome = document.createElement('div');
      welcome.className = 'ai-welcome';
      welcome.innerHTML = '<div class="ai-welcome-icon">🎮</div><p>' + escapeHtml(t('pixel_ai_welcome')) + '</p>';
      state.dom.messages.appendChild(welcome);
      updateScrollbar();
      return;
    }

    for (var i = 0; i < state.messages.length; i++) {
      renderSingleMessage(state.messages[i], i);
    }
    updateScrollbar();
  }

  // 渲染单条消息 / Render a single message
  function renderSingleMessage(msg, index) {
    if (!state.dom.messages) return;
    var container = state.dom.messages;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message ai-message-' + msg.role + (msg.isError ? ' ai-message-error' : '');
    msgDiv.dataset.msgIndex = index;

    var label = document.createElement('div');
    label.className = 'ai-message-label';
    label.textContent = msg.role === 'user' ? t('pixel_ai_you') : t('pixel_ai_assistant');
    msgDiv.appendChild(label);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    if (msg.role === 'assistant' && !msg.isError) {
      // AI 回答渲染 HTML（已 sanitize）/ AI response renders HTML (sanitized)
      contentDiv.innerHTML = sanitizeHtml(markdownToHtml(msg.content));
    } else {
      contentDiv.textContent = msg.content;
    }
    msgDiv.appendChild(contentDiv);

    // 消息操作按钮 / Message action buttons
    var actions = document.createElement('div');
    actions.className = 'ai-message-actions';

    if (msg.role === 'assistant' && !msg.isError) {
      // 复制按钮 / Copy button
      var copyBtn = document.createElement('button');
      copyBtn.className = 'ai-msg-btn ai-msg-copy';
      copyBtn.textContent = '📋 ' + t('pixel_ai_copy');
      copyBtn.addEventListener('click', function () {
        copyToClipboard(msg.content);
      });
      actions.appendChild(copyBtn);

      // 重新生成按钮 / Regenerate button
      var regenBtn = document.createElement('button');
      regenBtn.className = 'ai-msg-btn ai-msg-regen';
      regenBtn.textContent = '🔄 ' + t('pixel_ai_regenerate');
      regenBtn.addEventListener('click', function () {
        regenerateResponse(index);
      });
      actions.appendChild(regenBtn);
    }

    // 编辑按钮 / Edit button
    var editBtn = document.createElement('button');
    editBtn.className = 'ai-msg-btn ai-msg-edit';
    editBtn.textContent = '✏️ ' + t('pixel_ai_edit');
    editBtn.addEventListener('click', function () {
      enterEditMode(msgDiv, index);
    });
    actions.appendChild(editBtn);

    msgDiv.appendChild(actions);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    updateScrollbar();

    return msgDiv;
  }

  // 编辑模式 / Edit mode
  function enterEditMode(msgDiv, index) {
    var msg = state.messages[index];
    if (!msg) return;

    var contentDiv = msgDiv.querySelector('.ai-message-content');
    var actions = msgDiv.querySelector('.ai-message-actions');
    if (!contentDiv) return;

    var textarea = document.createElement('textarea');
    textarea.className = 'pixel-input ai-edit-textarea';
    textarea.rows = 4;
    textarea.value = msg.content;

    var btnWrap = document.createElement('div');
    btnWrap.className = 'ai-edit-buttons';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'pixel-btn ai-edit-save';
    saveBtn.textContent = t('pixel_ai_save');

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'pixel-btn ai-edit-cancel';
    cancelBtn.textContent = t('pixel_ai_cancel');

    btnWrap.appendChild(saveBtn);
    btnWrap.appendChild(cancelBtn);

    var originalHTML = contentDiv.innerHTML;
    contentDiv.innerHTML = '';
    contentDiv.appendChild(textarea);
    contentDiv.appendChild(btnWrap);
    if (actions) actions.style.display = 'none';
    textarea.focus();

    cancelBtn.addEventListener('click', function () {
      contentDiv.innerHTML = originalHTML;
      if (actions) actions.style.display = '';
    });

    saveBtn.addEventListener('click', function () {
          var newContent = textarea.value.trim();
          if (!newContent) return;

          if (msg.role === 'user') {
            // 用户消息：截断后续消息并重新发送 / User message: truncate and resend
            state.messages = state.messages.slice(0, index);
            saveConversations();
            renderMessages();
            sendMessage(newContent);
          } else {
            // AI 回答：直接更新内容 / AI response: update content directly
            msg.content = newContent;
            saveConversations();
            contentDiv.innerHTML = sanitizeHtml(markdownToHtml(newContent));
            if (actions) actions.style.display = '';
          }
        });
  }

  // 重新生成回答 / Regenerate response
  function regenerateResponse(assistantIndex) {
    if (state.isLoading) return;
    // 找到上一条用户消息 / Find the previous user message
    var userMsg = null;
    var userIndex = -1;
    for (var i = assistantIndex - 1; i >= 0; i--) {
      if (state.messages[i].role === 'user') {
        userMsg = state.messages[i];
        userIndex = i;
        break;
      }
    }
    if (!userMsg) return;

    // 截断到用户消息 / Truncate to user message
    state.messages = state.messages.slice(0, userIndex + 1);
    saveConversations();
    renderMessages();

    // 重新发送 / Resend
    doApiCall();
  }

  // 复制到剪贴板 / Copy to clipboard
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(t('pixel_ai_copied'));
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(t('pixel_ai_copied'));
    } catch (e) {
      showToast(t('pixel_ai_copy_failed'));
    }
    document.body.removeChild(ta);
  }

  // 导出对话为 Markdown / Export conversation as Markdown
  function exportConversation() {
    if (state.messages.length === 0) {
      showToast(t('pixel_ai_no_messages'));
      return;
    }

    var md = '# ' + (getConversation(state.currentConvId) ? getConversation(state.currentConvId).title : 'Pixel AI') + '\n\n';
    md += '> ' + t('pixel_ai_export_note') + '\n\n---\n\n';

    for (var i = 0; i < state.messages.length; i++) {
      var msg = state.messages[i];
      var role = msg.role === 'user' ? '🧑 ' + t('pixel_ai_you') : '🤖 ' + t('pixel_ai_assistant');
      md += '## ' + role + '\n\n' + msg.content + '\n\n---\n\n';
    }

    md += '\n*Token: ' + state.totalTokens + '*\n';

    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pixel-ai-chat-' + new Date().toISOString().slice(0, 10) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 提示词模板 / Prompt templates
  function fillPrompt(promptText) {
    if (!state.dom.input) return;
    state.dom.input.value = promptText;
    state.dom.input.focus();
  }

  // ============================================================
  // 自制滚动条 / Custom Scrollbar
  // ============================================================

  function updateScrollbar() {
    if (!state.dom.messages || !state.dom.scrollbarTrack || !state.dom.scrollbarThumb) return;
    var el = state.dom.messages;
    var trackHeight = state.dom.scrollbarTrack.clientHeight;
    var scrollHeight = el.scrollHeight;
    var clientHeight = el.clientHeight;

    if (scrollHeight <= clientHeight) {
      state.dom.scrollbarTrack.style.display = 'none';
      return;
    }

    state.dom.scrollbarTrack.style.display = '';
    var thumbHeight = Math.max(30, Math.floor((clientHeight / scrollHeight) * trackHeight));
    var maxScroll = scrollHeight - clientHeight;
    var scrollTop = el.scrollTop;
    var thumbTop = Math.floor((scrollTop / maxScroll) * (trackHeight - thumbHeight));

    state.dom.scrollbarThumb.style.height = thumbHeight + 'px';
    state.dom.scrollbarThumb.style.top = thumbTop + 'px';
  }

  function onMessagesScroll() {
    updateScrollbar();
  }

  function initCustomScrollbar() {
    if (!state.dom.messages) return;
    state.dom.messages.addEventListener('scroll', onMessagesScroll);

    if (state.dom.scrollbarThumb && state.dom.scrollbarTrack) {
      var isDragging = false;
      var startY = 0;
      var startThumbTop = 0;

      state.dom.scrollbarThumb.addEventListener('mousedown', function (e) {
        isDragging = true;
        startY = e.clientY;
        startThumbTop = parseInt(state.dom.scrollbarThumb.style.top) || 0;
        e.preventDefault();
      });

      document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        var trackHeight = state.dom.scrollbarTrack.clientHeight;
        var thumbHeight = state.dom.scrollbarThumb.clientHeight;
        var dy = e.clientY - startY;
        var newTop = Math.max(0, Math.min(trackHeight - thumbHeight, startThumbTop + dy));
        var maxScroll = state.dom.messages.scrollHeight - state.dom.messages.clientHeight;
        var scrollRatio = newTop / (trackHeight - thumbHeight);
        state.dom.messages.scrollTop = scrollRatio * maxScroll;
      });

      document.addEventListener('mouseup', function () {
        isDragging = false;
      });
    }
  }

  // ============================================================
  // 流式消息 / Streaming Messages
  // ============================================================

  function appendThinkingMessage() {
    if (!state.dom.messages) return null;
    // 移除欢迎信息 / Remove welcome
    var welcome = state.dom.messages.querySelector('.ai-welcome');
    if (welcome) welcome.remove();

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

    state.dom.messages.appendChild(msgDiv);
    state.dom.messages.scrollTop = state.dom.messages.scrollHeight;
    updateScrollbar();
    return msgDiv;
  }

  function removeThinkingMessage() {
    var thinking = document.getElementById('ai-thinking-message');
    if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
  }

  function appendStreamingMessage(role) {
    if (!state.dom.messages) return null;
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

    state.dom.messages.appendChild(msgDiv);
    state.dom.messages.scrollTop = state.dom.messages.scrollHeight;
    updateScrollbar();

    state.streamingMessageEl = msgDiv;
    state.streamingContent = '';
    return msgDiv;
  }

  function updateStreamingMessage(content) {
    if (!state.streamingMessageEl) return;
    state.streamingContent = content;
    var contentDiv = state.streamingMessageEl.querySelector('.ai-message-content');
    if (contentDiv) {
      // 流式输出时实时渲染 Markdown / Render Markdown in real-time during streaming
      try {
        contentDiv.innerHTML = sanitizeHtml(markdownToHtml(content));
      } catch (e) {
        // 转换失败时回退到纯文本 / Fallback to text on conversion error
        contentDiv.textContent = content;
      }
    }
    if (state.dom.messages) {
      state.dom.messages.scrollTop = state.dom.messages.scrollHeight;
      updateScrollbar();
    }
  }

  function finalizeStreamingMessage() {
    if (state.streamingMessageEl) {
      // 流式完成后渲染 HTML / Render HTML after streaming completes
      var contentDiv = state.streamingMessageEl.querySelector('.ai-message-content');
      if (contentDiv && state.streamingContent) {
        contentDiv.innerHTML = sanitizeHtml(markdownToHtml(state.streamingContent));
      }
      state.streamingMessageEl.id = '';
      state.streamingMessageEl = null;
    }
    state.streamingContent = '';
    state.isStreaming = false;
  }

  // ============================================================
  // API 调用 / API Calls (与原版一致 / Same as original)
  // ============================================================

  async function safeFetch(url, options) {
    try {
      return await fetch(url, options);
    } catch (e) {
      var wrappedErr = new Error('NETWORK_ERROR');
      wrappedErr.status = 0;
      wrappedErr.detail = e && e.message ? e.message : 'Network request failed';
      if (e && e.message && e.message.indexOf('Failed to construct URL') !== -1) {
        wrappedErr = new Error('INVALID_BASE_URL');
        wrappedErr.status = 0;
        wrappedErr.detail = e.message;
      }
      if (e && e.message && e.message.toLowerCase().indexOf('cors') !== -1) {
        wrappedErr.detail = e.message;
      }
      throw wrappedErr;
    }
  }

  async function callApi(useStream) {
    var provider = getProvider(state.settings.provider);
    var apiType = provider.apiType;
    var baseUrl = getBaseUrl(state.settings.provider);
    var modelId = getModelId(state.settings.provider);
    var apiKey = state.settings.apiKey;

    if (!apiKey) throw new Error('NO_API_KEY');

    if (useStream) {
      if (apiType === API_TYPES.OPENAI) return callOpenAIStream(baseUrl, modelId, apiKey);
      if (apiType === API_TYPES.ANTHROPIC) return callAnthropicStream(baseUrl, modelId, apiKey);
      if (apiType === API_TYPES.GOOGLE) return callGoogleStream(baseUrl, modelId, apiKey);
    } else {
      if (apiType === API_TYPES.OPENAI) return callOpenAI(baseUrl, modelId, apiKey);
      if (apiType === API_TYPES.ANTHROPIC) return callAnthropic(baseUrl, modelId, apiKey);
      if (apiType === API_TYPES.GOOGLE) return callGoogle(baseUrl, modelId, apiKey);
    }
    throw new Error('UNKNOWN_API_TYPE');
  }

  async function callOpenAI(baseUrl, model, apiKey) {
    var messages = buildOpenAIMessages();
    var response = await safeFetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: model, messages: messages })
    });
    if (!response.ok) await handleApiError(response);
    var data = await response.json();
    var content = '';
    if (data.choices && data.choices[0]) {
      if (data.choices[0].message && data.choices[0].message.content) content = data.choices[0].message.content;
      else if (data.choices[0].text) content = data.choices[0].text;
    }
    if (data.usage) {
      if (data.usage.prompt_tokens) state.promptTokens += data.usage.prompt_tokens;
      if (data.usage.completion_tokens) state.completionTokens += data.usage.completion_tokens;
      if (data.usage.total_tokens) state.totalTokens += data.usage.total_tokens;
      else if (data.usage.prompt_tokens && data.usage.completion_tokens) state.totalTokens += data.usage.prompt_tokens + data.usage.completion_tokens;
    }
    return content;
  }

  async function callAnthropic(baseUrl, model, apiKey) {
    var messages = buildAnthropicMessages();
    var response = await safeFetch(baseUrl + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model, max_tokens: 4096, messages: messages })
    });
    if (!response.ok) await handleApiError(response);
    var data = await response.json();
    var content = '';
    if (data.content && data.content.length > 0) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === 'text') content += data.content[i].text;
      }
    }
    if (data.usage) {
      if (data.usage.input_tokens) { state.promptTokens += data.usage.input_tokens; state.totalTokens += data.usage.input_tokens; }
      if (data.usage.output_tokens) { state.completionTokens += data.usage.output_tokens; state.totalTokens += data.usage.output_tokens; }
    }
    return content;
  }

  async function callGoogle(baseUrl, model, apiKey) {
    var contents = buildGoogleContents();
    var url = baseUrl + '/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
    var response = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents })
    });
    if (!response.ok) await handleApiError(response);
    var data = await response.json();
    var content = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var parts = data.candidates[0].content.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].text) content += parts[i].text;
      }
    }
    if (data.usageMetadata) {
      if (data.usageMetadata.promptTokenCount) { state.promptTokens += data.usageMetadata.promptTokenCount; state.totalTokens += data.usageMetadata.promptTokenCount; }
      if (data.usageMetadata.candidatesTokenCount) { state.completionTokens += data.usageMetadata.candidatesTokenCount; state.totalTokens += data.usageMetadata.candidatesTokenCount; }
      if (data.usageMetadata.totalTokenCount) state.totalTokens = state.promptTokens + state.completionTokens;
    }
    return content;
  }

  async function parseSSE(response, onDelta) {
    if (!response.body) throw new Error('NO_RESPONSE_BODY');
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
          if (!line || line.indexOf('data: ') !== 0) continue;
          var dataStr = line.substring(6);
          if (dataStr === '[DONE]') return { content: fullContent, usage: usageData };
          try {
            var data = JSON.parse(dataStr);
            var delta = onDelta(data, fullContent);
            if (delta && typeof delta === 'string') fullContent += delta;
            if (data.usage) usageData = data.usage;
          } catch (e) {}
        }
      }
      return { content: fullContent, usage: usageData };
    } finally {
      reader.releaseLock();
    }
  }

  async function callOpenAIStream(baseUrl, model, apiKey) {
    var messages = buildOpenAIMessages();
    var response = await safeFetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: model, messages: messages, stream: true, stream_options: { include_usage: true } })
    });
    if (!response.ok) await handleApiError(response);
    var result = await parseSSE(response, function (data, currentContent) {
      if (data.choices && data.choices[0] && data.choices[0].delta) {
        var delta = data.choices[0].delta;
        if (delta.content) { updateStreamingMessage(currentContent + delta.content); return delta.content; }
      }
      return null;
    });
    if (result.usage) {
      var usage = result.usage;
      if (usage.prompt_tokens) state.promptTokens += usage.prompt_tokens;
      if (usage.completion_tokens) state.completionTokens += usage.completion_tokens;
      if (usage.total_tokens) state.totalTokens += usage.total_tokens;
      else if (usage.prompt_tokens && usage.completion_tokens) state.totalTokens += usage.prompt_tokens + usage.completion_tokens;
    }
    return result.content;
  }

  async function callAnthropicStream(baseUrl, model, apiKey) {
    var messages = buildAnthropicMessages();
    var response = await safeFetch(baseUrl + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model, max_tokens: 4096, messages: messages, stream: true })
    });
    if (!response.ok) await handleApiError(response);
    var fullContent = '';
    var inputTokens = 0;
    var outputTokens = 0;
    if (!response.body) throw new Error('NO_RESPONSE_BODY');
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
          if (!line || line.indexOf('data: ') !== 0) continue;
          var dataStr = line.substring(6);
          try {
            var data = JSON.parse(dataStr);
            if (data.type === 'message_start' && data.message && data.message.usage) inputTokens = data.message.usage.input_tokens || 0;
            if (data.type === 'content_block_delta' && data.delta && data.delta.text) { fullContent += data.delta.text; updateStreamingMessage(fullContent); }
            if (data.type === 'message_delta' && data.usage) outputTokens = data.usage.output_tokens || 0;
          } catch (e) {}
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (inputTokens) { state.promptTokens += inputTokens; state.totalTokens += inputTokens; }
    if (outputTokens) { state.completionTokens += outputTokens; state.totalTokens += outputTokens; }
    return fullContent;
  }

  async function callGoogleStream(baseUrl, model, apiKey) {
    var contents = buildGoogleContents();
    var url = baseUrl + '/models/' + model + ':streamGenerateContent?key=' + encodeURIComponent(apiKey) + '&alt=sse';
    var response = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents })
    });
    if (!response.ok) await handleApiError(response);
    var result = await parseSSE(response, function (data, currentContent) {
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        var parts = data.candidates[0].content.parts || [];
        var delta = '';
        for (var i = 0; i < parts.length; i++) { if (parts[i].text) delta += parts[i].text; }
        if (delta) { updateStreamingMessage(currentContent + delta); return delta; }
      }
      return null;
    });
    if (result.usage) {
      var usage = result.usage;
      if (usage.promptTokenCount) { state.promptTokens += usage.promptTokenCount; state.totalTokens += usage.promptTokenCount; }
      if (usage.candidatesTokenCount) { state.completionTokens += usage.candidatesTokenCount; state.totalTokens += usage.candidatesTokenCount; }
      if (usage.totalTokenCount) state.totalTokens = state.promptTokens + state.completionTokens;
    }
    return result.content;
  }

  function buildOpenAIMessages() {
    var result = [];
    for (var i = 0; i < state.messages.length; i++) {
      result.push({ role: state.messages[i].role, content: state.messages[i].content });
    }
    return result;
  }

  function buildAnthropicMessages() {
    var result = [];
    for (var i = 0; i < state.messages.length; i++) {
      if (state.messages[i].role === 'system') continue;
      result.push({ role: state.messages[i].role === 'assistant' ? 'assistant' : 'user', content: state.messages[i].content });
    }
    return result;
  }

  function buildGoogleContents() {
    var result = [];
    for (var i = 0; i < state.messages.length; i++) {
      if (state.messages[i].role === 'system') continue;
      result.push({ role: state.messages[i].role === 'assistant' ? 'model' : 'user', parts: [{ text: state.messages[i].content }] });
    }
    return result;
  }

  async function handleApiError(response) {
    var status = response.status;
    var errorMsg = '';
    var errorType = 'UNKNOWN_ERROR';
    try {
      var data = await response.json();
      if (data.error && data.error.message) errorMsg = data.error.message;
      else if (data.error) errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      else if (data.message) errorMsg = data.message;
      else if (data.error_msg) errorMsg = data.error_msg;
    } catch (e) {}
    if (!errorMsg && response.statusText) errorMsg = response.statusText;
    if (status === 401 || status === 403) errorType = 'AUTH_ERROR';
    else if (status === 429) errorType = 'RATE_LIMIT';
    else if (status === 400) errorType = 'BAD_REQUEST';
    else if (status === 404) errorType = 'NOT_FOUND';
    else if (status >= 500) errorType = 'SERVER_ERROR';
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

    // 确保有当前对话 / Ensure there's a current conversation
    if (!state.currentConvId) createConversation();

    var userContent = text.trim();
    state.messages.push({ role: 'user', content: userContent });

    // 渲染用户消息 / Render user message
    var welcome = state.dom.messages.querySelector('.ai-welcome');
    if (welcome) welcome.remove();
    renderSingleMessage(state.messages[state.messages.length - 1], state.messages.length - 1);

    if (state.dom.input) state.dom.input.value = '';

    updateConversationTitle();
    renderConversationList();

    await doApiCall();
  }

  // 核心 API 调用（发送后）/ Core API call (after user message is added)
  async function doApiCall() {
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
        reply = await callApi(true);
        if (!reply || !reply.trim()) throw new Error('EMPTY_STREAM_RESPONSE');
      } catch (streamErr) {
        usedStream = false;
        if (state.streamingMessageEl && state.streamingMessageEl.parentNode) {
          state.streamingMessageEl.parentNode.removeChild(state.streamingMessageEl);
        }
        finalizeStreamingMessage();
        appendThinkingMessage();
        reply = await callApi(false);
        removeThinkingMessage();
      }

      state.messages.push({ role: 'assistant', content: reply });

      if (usedStream) {
        finalizeStreamingMessage();
        // 给流式消息添加操作按钮 / Add action buttons to streamed message
        addActionsToLastMessage();
      } else {
        renderSingleMessage(state.messages[state.messages.length - 1], state.messages.length - 1);
      }

      renderTokenStats();
      saveConversations();
      renderConversationList();
    } catch (e) {
      removeThinkingMessage();
      if (state.streamingMessageEl && state.streamingMessageEl.parentNode) {
        state.streamingMessageEl.parentNode.removeChild(state.streamingMessageEl);
      }
      finalizeStreamingMessage();

      var errorText = buildErrorMessage(e);
      state.messages.push({ role: 'assistant', content: errorText, isError: true });
      renderSingleMessage(state.messages[state.messages.length - 1], state.messages.length - 1);
      saveConversations();
    }

    state.isLoading = false;
    state.isStreaming = false;
    updateSendButtonState();
  }

  // 给最后一条流式消息添加操作按钮 / Add action buttons to last streamed message
  function addActionsToLastMessage() {
    var msgs = state.dom.messages.querySelectorAll('.ai-message');
    if (msgs.length === 0) return;
    var lastMsg = msgs[msgs.length - 1];
    var index = parseInt(lastMsg.dataset.msgIndex);
    if (isNaN(index)) index = state.messages.length - 1;

    var msg = state.messages[index];
    if (!msg) return;

    var actions = document.createElement('div');
    actions.className = 'ai-message-actions';

    if (msg.role === 'assistant' && !msg.isError) {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'ai-msg-btn ai-msg-copy';
      copyBtn.textContent = '📋 ' + t('pixel_ai_copy');
      copyBtn.addEventListener('click', function () { copyToClipboard(msg.content); });
      actions.appendChild(copyBtn);

      var regenBtn = document.createElement('button');
      regenBtn.className = 'ai-msg-btn ai-msg-regen';
      regenBtn.textContent = '🔄 ' + t('pixel_ai_regenerate');
      regenBtn.addEventListener('click', function () { regenerateResponse(index); });
      actions.appendChild(regenBtn);
    }

    var editBtn = document.createElement('button');
    editBtn.className = 'ai-msg-btn ai-msg-edit';
    editBtn.textContent = '✏️ ' + t('pixel_ai_edit');
    editBtn.addEventListener('click', function () { enterEditMode(lastMsg, index); });
    actions.appendChild(editBtn);

    lastMsg.appendChild(actions);
  }

  function buildErrorMessage(e) {
    var lines = [];
    var mainMsg = t('pixel_ai_error_unknown');
    if (e.message === 'NO_API_KEY') mainMsg = t('pixel_ai_no_key');
    else if (e.message === 'AUTH_ERROR') mainMsg = t('pixel_ai_error_auth');
    else if (e.message === 'RATE_LIMIT') mainMsg = t('pixel_ai_error_rate');
    else if (e.message === 'BAD_REQUEST') mainMsg = t('pixel_ai_error_bad_request');
    else if (e.message === 'NOT_FOUND') mainMsg = t('pixel_ai_error_not_found');
    else if (e.message === 'SERVER_ERROR') mainMsg = t('pixel_ai_error_server');
    else if (e.message === 'INVALID_BASE_URL') mainMsg = t('pixel_ai_error_invalid_base_url');
    else if (e.message === 'NETWORK_ERROR' || isNetworkError(e)) {
      mainMsg = t('pixel_ai_error_network');
      if (e.detail && e.detail.toLowerCase && e.detail.toLowerCase().indexOf('cors') !== -1) mainMsg = t('pixel_ai_error_cors');
    }
    lines.push(mainMsg);
    if (e.status) lines.push(t('pixel_ai_error_status', { code: e.status }));
    if (e.detail && e.detail.length > 0 && e.detail.length < 500) lines.push(t('pixel_ai_error_detail', { detail: e.detail }));
    else if (e.detail && e.detail.length >= 500) lines.push(t('pixel_ai_error_detail', { detail: e.detail.substring(0, 500) + '...' }));
    return lines.join('\n');
  }

  function isNetworkError(e) {
    if (!e || !e.message) return false;
    var msg = e.message.toLowerCase();
    return msg.indexOf('failed to fetch') !== -1 || msg.indexOf('networkerror') !== -1
      || msg.indexOf('typeerror') !== -1 || msg.indexOf('load failed') !== -1
      || msg.indexOf('cors') !== -1 || msg.indexOf('net::') !== -1;
  }

  function updateSendButtonState() {
    if (!state.dom.sendBtn) return;
    state.dom.sendBtn.disabled = state.isLoading;
    if (state.isLoading) state.dom.sendBtn.classList.add('pixel-btn-disabled');
    else state.dom.sendBtn.classList.remove('pixel-btn-disabled');
  }

  // ============================================================
  // 清空对话 / Clear Chat
  // ============================================================

  function clearChat() {
    if (state.messages.length === 0) return;
    showConfirmDialog({
      title: t('pixel_ai_confirm_clear_title'),
      message: t('pixel_ai_confirm_clear'),
      icon: '🗑',
      okText: t('pixel_ai_confirm_clear_ok')
    }).then(function (confirmed) {
      if (!confirmed) return;

      // 清空当前对话的消息 / Clear current conversation messages
      state.messages = [];
      state.totalTokens = 0;
      state.promptTokens = 0;
      state.completionTokens = 0;

      if (state.currentConvId) {
        var conv = getConversation(state.currentConvId);
        if (conv) {
          conv.messages = [];
          conv.totalTokens = 0;
          conv.title = t('pixel_ai_new_chat');
        }
      }
      saveConversations();
      renderMessages();
      renderTokenStats();
      renderConversationList();
    });
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
    if (state.dom.apiKeyInput) state.dom.apiKeyInput.type = state.showApiKey ? 'text' : 'password';
    if (state.dom.toggleKeyBtn) state.dom.toggleKeyBtn.textContent = state.showApiKey ? t('pixel_ai_settings_hide') : t('pixel_ai_settings_show');
  }

  function onProviderChange() {
    if (!state.dom.providerSelect) return;
    state.settings.provider = state.dom.providerSelect.value;
    var provider = getProvider(state.settings.provider);
    var models = provider.models;
    if (models && models.length > 0 && !provider.customModel) state.settings.model = models[0].id;
    renderModelOptions();
    renderBaseUrlSection();
  }

  function saveSettingsFromModal() {
    if (state.dom.providerSelect) state.settings.provider = state.dom.providerSelect.value;
    var provider = getProvider(state.settings.provider);
    if (provider.customModel) {
      var customInput = document.getElementById('ai-model-custom-input');
      if (customInput) state.settings.model = customInput.value.trim() || 'custom-model';
    } else {
      if (state.dom.modelSelect) state.settings.model = state.dom.modelSelect.value;
    }
    if (state.dom.apiKeyInput) state.settings.apiKey = state.dom.apiKeyInput.value.trim();
    if (state.dom.baseUrlInput) state.settings.baseUrl = state.dom.baseUrlInput.value.trim();
    saveSettings();
    closeSettings();
    showToast(t('pixel_ai_settings_saved'));
  }

  function showToast(message) {
    var existing = document.getElementById('ai-toast');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var toast = document.createElement('div');
    toast.id = 'ai-toast';
    toast.className = 'pixel-toast';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#2d2d44;color:#ffd700;padding:10px 20px;border:2px solid #ffd700;font-family:monospace;font-size:14px;z-index:10000;image-rendering:pixelated';
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2000);
  }

  // ============================================================
  // 事件绑定 / Event Binding
  // ============================================================

  function bindEvents() {
    if (state.dom.sendBtn) state.dom.sendBtn.addEventListener('click', onSendClick);
    if (state.dom.input) state.dom.input.addEventListener('keydown', onInputKeydown);
    if (state.dom.clearBtn) state.dom.clearBtn.addEventListener('click', clearChat);
    if (state.dom.settingsBtn) state.dom.settingsBtn.addEventListener('click', openSettings);
    if (state.dom.providerSelect) state.dom.providerSelect.addEventListener('change', onProviderChange);
    if (state.dom.toggleKeyBtn) state.dom.toggleKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    if (state.dom.saveBtn) state.dom.saveBtn.addEventListener('click', saveSettingsFromModal);
    if (state.dom.cancelBtn) state.dom.cancelBtn.addEventListener('click', closeSettings);
    if (state.dom.settingsModal) state.dom.settingsModal.addEventListener('click', onModalBackdropClick);
    if (state.dom.newChatBtn) state.dom.newChatBtn.addEventListener('click', createConversation);

    // 导出对话按钮 / Export button
    var exportBtn = document.getElementById('btn-ai-export');
    if (exportBtn) exportBtn.addEventListener('click', exportConversation);

    // 提示词模板 / Prompt templates
    if (state.dom.promptTemplates) {
      var chips = state.dom.promptTemplates.querySelectorAll('.prompt-chip');
      for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener('click', function () {
          var promptKey = this.dataset.promptKey;
          var promptText = promptKey ? t(promptKey) : this.dataset.prompt;
          fillPrompt(promptText);
        });
      }
    }

    // 侧边栏切换（移动端）/ Sidebar toggle (mobile)
    var sidebarToggle = document.getElementById('btn-ai-sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        var sidebar = document.querySelector('.pixel-ai-sidebar');
        if (sidebar) sidebar.classList.toggle('open');
      });
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
    if (e.target === state.dom.settingsModal) closeSettings();
  }

  function onLanguageChange() {
    renderProviderOptions();
    renderModelOptions();
    renderBaseUrlSection();
    renderTokenStats();
    renderConversationList();
    renderMessages();
    if (state.dom.toggleKeyBtn) state.dom.toggleKeyBtn.textContent = state.showApiKey ? t('pixel_ai_settings_hide') : t('pixel_ai_settings_show');
    if (state.dom.input) state.dom.input.placeholder = t('pixel_ai_placeholder');
  }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================

  function init() {
    cacheDom();
    if (!state.dom.messages) return;

    loadSettings();
    loadConversations();
    initCustomScrollbar();
    bindEvents();

    // 加载或创建对话 / Load or create conversation
    if (state.conversations.length > 0) {
      switchConversation(state.conversations[0].id);
    } else {
      createConversation();
    }

    renderTokenStats();
    if (state.dom.input) state.dom.input.placeholder = t('pixel_ai_placeholder');
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
