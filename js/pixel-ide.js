/**
 * pixel-ide.js
 * 像素 IDE 模块 / Pixel IDE Module
 *
 * 功能：
 *   - Python/C++ 代码编辑器
 *   - 内置 Hello World 代码模板
 *   - 代码运行和输出展示
 *   - AI 辅助编程（流式输出）
 *   - 对话历史和代码文件管理
 *   - 中英文国际化支持
 */
window.PixelIDE = (function () {
  'use strict';

  const STORAGE_KEY_FILES = 'pixel_ide_files';
  const STORAGE_KEY_CONV = 'pixel_ide_conversations';

  const state = {
    currentLang: 'python',
    currentFileId: null,
    files: [],
    conversations: [],
    currentConvId: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingMessageEl: null,
    streamingContent: '',
    dom: {}
  };

  const DEFAULT_CODE = {
    python: '# Hello World\nprint("Hello, World!")\n',
    cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n'
  };

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

  function genId() {
    return 'ide-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function markdownToHtml(text) {
    if (!text) return '';
    var html = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function sanitizeHtml(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<script[^>]*>/gi, '');
  }

  // ============================================================
  // 文件管理 / File Management
  // ============================================================

  function loadFiles() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_FILES);
      if (saved) {
        state.files = JSON.parse(saved) || [];
      }
    } catch (e) {
      state.files = [];
    }
    if (state.files.length === 0) {
      createNewFile('python');
    }
  }

  function saveFiles() {
    try {
      if (state.currentFileId) {
        var file = getFile(state.currentFileId);
        if (file) {
          file.content = state.dom.editor.value;
          file.lang = state.currentLang;
          file.timestamp = Date.now();
        }
      }
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(state.files));
    } catch (e) {}
  }

  function getFile(fileId) {
    for (var i = 0; i < state.files.length; i++) {
      if (state.files[i].id === fileId) return state.files[i];
    }
    return null;
  }

  function createNewFile(lang) {
    var file = {
      id: genId(),
      name: (lang === 'python' ? 'untitled.py' : 'untitled.cpp'),
      lang: lang || state.currentLang,
      content: DEFAULT_CODE[lang || state.currentLang],
      timestamp: Date.now()
    };
    state.files.unshift(file);
    state.currentFileId = file.id;
    saveFiles();
    renderFilesList();
    loadFile(file);
  }

  function switchFile(fileId) {
    var file = getFile(fileId);
    if (!file) return;
    saveFiles();
    state.currentFileId = fileId;
    state.currentLang = file.lang;
    loadFile(file);
    renderFilesList();
  }

  function deleteFile(fileId) {
    var idx = -1;
    for (var i = 0; i < state.files.length; i++) {
      if (state.files[i].id === fileId) { idx = i; break; }
    }
    if (idx === -1) return;
    state.files.splice(idx, 1);
    if (state.currentFileId === fileId) {
      if (state.files.length > 0) {
        switchFile(state.files[0].id);
      } else {
        createNewFile(state.currentLang);
      }
    }
    saveFiles();
    renderFilesList();
  }

  function loadFile(file) {
    if (state.dom.editor) {
      state.dom.editor.value = file.content;
    }
    if (state.dom.langSelect) {
      state.dom.langSelect.value = file.lang;
    }
    if (state.dom.currentFile) {
      state.dom.currentFile.textContent = file.name;
    }
  }

  // ============================================================
  // 对话管理 / Conversation Management
  // ============================================================

  function loadConversations() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_CONV);
      if (saved) {
        state.conversations = JSON.parse(saved) || [];
      }
    } catch (e) {
      state.conversations = [];
    }
  }

  function saveConversations() {
    try {
      if (state.currentConvId) {
        var conv = getConversation(state.currentConvId);
        if (conv) {
          conv.messages = state.messages;
          conv.timestamp = Date.now();
        }
      }
      localStorage.setItem(STORAGE_KEY_CONV, JSON.stringify(state.conversations));
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
      title: t('pixel_ide_new_chat'),
      messages: [],
      timestamp: Date.now()
    };
    state.conversations.unshift(conv);
    state.currentConvId = conv.id;
    state.messages = [];
    saveConversations();
    renderConversationList();
    renderAIMessages();
    return conv;
  }

  function switchConversation(convId) {
    var conv = getConversation(convId);
    if (!conv) return;
    state.currentConvId = convId;
    state.messages = conv.messages || [];
    renderAIMessages();
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
    state.dom.editor = document.getElementById('ide-code-editor');
    state.dom.langSelect = document.getElementById('ide-lang-select');
    state.dom.runBtn = document.getElementById('btn-ide-run');
    state.dom.saveBtn = document.getElementById('btn-ide-save');
    state.dom.newBtn = document.getElementById('btn-ide-new');
    state.dom.currentFile = document.getElementById('ide-current-file');
    state.dom.output = document.getElementById('ide-output');
    state.dom.clearOutputBtn = document.getElementById('btn-ide-clear-output');

    state.dom.convTab = document.getElementById('btn-ide-conv-tab');
    state.dom.filesTab = document.getElementById('btn-ide-files-tab');
    state.dom.convList = document.getElementById('ide-conversation-list');
    state.dom.filesList = document.getElementById('ide-files-list');

    state.dom.aiMessages = document.getElementById('ide-ai-messages');
    state.dom.aiInput = document.getElementById('ide-ai-input');
    state.dom.aiSendBtn = document.getElementById('btn-ide-ai-send');
    state.dom.aiSettingsBtn = document.getElementById('btn-ide-ai-settings');
    state.dom.aiNewChatBtn = document.getElementById('btn-ide-ai-new-chat');

    state.dom.backBtn = document.getElementById('btn-back-to-pixel-programming');
  }

  // ============================================================
  // 渲染函数 / Render Functions
  // ============================================================

  function renderFilesList() {
    if (!state.dom.filesList) return;
    state.dom.filesList.innerHTML = '';

    for (var i = 0; i < state.files.length; i++) {
      var file = state.files[i];
      var item = document.createElement('div');
      item.className = 'pixel-ide-file-item' + (state.currentFileId === file.id ? ' active' : '');
      item.dataset.fileId = file.id;

      var name = document.createElement('div');
      name.className = 'pixel-ide-file-name';
      name.textContent = file.name;

      var meta = document.createElement('div');
      meta.className = 'pixel-ide-file-meta';
      meta.textContent = (file.lang === 'python' ? 'Python' : 'C++') + ' · ' + new Date(file.timestamp).toLocaleString();

      var delBtn = document.createElement('button');
      delBtn.className = 'pixel-btn';
      delBtn.textContent = '×';
      delBtn.style.float = 'right';
      delBtn.style.padding = '2px 6px';
      delBtn.style.fontSize = '12px';

      item.appendChild(delBtn);
      item.appendChild(name);
      item.appendChild(meta);

      (function(fileId) {
        item.addEventListener('click', function (e) {
          if (e.target !== delBtn) {
            switchFile(fileId);
          }
        });

        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteFile(fileId);
        });
      })(file.id);

      state.dom.filesList.appendChild(item);
    }
  }

  function renderConversationList() {
    if (!state.dom.convList) return;
    state.dom.convList.innerHTML = '';

    for (var i = 0; i < state.conversations.length; i++) {
      var conv = state.conversations[i];
      var item = document.createElement('div');
      item.className = 'pixel-ide-conv-item' + (state.currentConvId === conv.id ? ' active' : '');
      item.dataset.convId = conv.id;

      var title = document.createElement('div');
      title.className = 'pixel-ide-conv-title';
      title.textContent = conv.title;

      var meta = document.createElement('div');
      meta.className = 'pixel-ide-conv-meta';
      meta.textContent = new Date(conv.timestamp).toLocaleString() + ' · ' + conv.messages.length + ' ' + t('pixel_ide_messages');

      var delBtn = document.createElement('button');
      delBtn.className = 'pixel-btn';
      delBtn.textContent = '×';
      delBtn.style.float = 'right';
      delBtn.style.padding = '2px 6px';
      delBtn.style.fontSize = '12px';

      item.appendChild(delBtn);
      item.appendChild(title);
      item.appendChild(meta);

      (function(convId) {
        item.addEventListener('click', function (e) {
          if (e.target !== delBtn) {
            switchConversation(convId);
          }
        });

        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteConversation(convId);
        });
      })(conv.id);

      state.dom.convList.appendChild(item);
    }
  }

  function renderAIMessages() {
    if (!state.dom.aiMessages) return;
    state.dom.aiMessages.innerHTML = '';

    if (state.messages.length === 0) {
      var welcome = document.createElement('div');
      welcome.className = 'ai-welcome';
      welcome.innerHTML = '<div class="ai-welcome-icon">💻</div><p>' + escapeHtml(t('pixel_ide_ai_welcome')) + '</p>';
      state.dom.aiMessages.appendChild(welcome);
      return;
    }

    for (var i = 0; i < state.messages.length; i++) {
      renderSingleAIMessage(state.messages[i], i);
    }
  }

  function renderSingleAIMessage(msg, index) {
    if (!state.dom.aiMessages) return;
    var container = state.dom.aiMessages;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'pixel-ide-ai-message pixel-ide-ai-message-' + msg.role;
    msgDiv.dataset.msgIndex = index;

    var label = document.createElement('div');
    label.className = 'pixel-ide-ai-message-label';
    label.textContent = msg.role === 'user' ? t('pixel_ide_you') : t('pixel_ide_assistant');
    msgDiv.appendChild(label);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'pixel-ide-ai-message-content';
    if (msg.role === 'assistant') {
      contentDiv.innerHTML = sanitizeHtml(markdownToHtml(msg.content));
    } else {
      contentDiv.textContent = msg.content;
    }
    msgDiv.appendChild(contentDiv);

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  // ============================================================
  // 流式消息 / Streaming Messages
  // ============================================================

  function appendStreamingMessage(role) {
    if (!state.dom.aiMessages) return null;
    var msgDiv = document.createElement('div');
    msgDiv.className = 'pixel-ide-ai-message pixel-ide-ai-message-' + role;
    msgDiv.id = 'ide-streaming-message';

    var label = document.createElement('div');
    label.className = 'pixel-ide-ai-message-label';
    label.textContent = role === 'user' ? t('pixel_ide_you') : t('pixel_ide_assistant');
    msgDiv.appendChild(label);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'pixel-ide-ai-message-content';
    contentDiv.textContent = '';
    msgDiv.appendChild(contentDiv);

    state.dom.aiMessages.appendChild(msgDiv);
    state.dom.aiMessages.scrollTop = state.dom.aiMessages.scrollHeight;

    state.streamingMessageEl = msgDiv;
    state.streamingContent = '';
    return msgDiv;
  }

  function updateStreamingMessage(content) {
    if (!state.streamingMessageEl) return;
    state.streamingContent = content;
    var contentDiv = state.streamingMessageEl.querySelector('.pixel-ide-ai-message-content');
    if (contentDiv) {
      contentDiv.innerHTML = sanitizeHtml(markdownToHtml(content));
    }
    state.dom.aiMessages.scrollTop = state.dom.aiMessages.scrollHeight;
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

  async function callApi(streaming) {
    var apiKey = window.PixelAI ? window.PixelAI.getApiKey() : '';
    var provider = window.PixelAI ? window.PixelAI.getProviderId() : 'openai';
    var model = window.PixelAI ? window.PixelAI.getModelId() : 'gpt-4o-mini';

    if (!apiKey) {
      showToast(t('pixel_ide_no_api_key'));
      throw new Error('NO_API_KEY');
    }

    var baseUrl;
    if (window.PixelAI) {
      baseUrl = window.PixelAI.getBaseUrl();
    } else {
      baseUrl = 'https://api.openai.com/v1';
    }

    var messages = [];
    for (var i = 0; i < state.messages.length; i++) {
      messages.push({ role: state.messages[i].role, content: state.messages[i].content });
    }

    var response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: streaming,
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      var errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'API Error');
    }

    if (streaming) {
      var fullContent = '';
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

          for (var j = 0; j < lines.length; j++) {
            var line = lines[j].trim();
            if (!line || line.indexOf('data: ') !== 0) continue;
            var dataStr = line.substring(6);
            if (dataStr === '[DONE]') break;
            try {
              var data = JSON.parse(dataStr);
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                fullContent += data.choices[0].delta.content;
                updateStreamingMessage(fullContent);
              }
            } catch (e) {}
          }
        }
      } finally {
        reader.releaseLock();
      }
      return fullContent;
    } else {
      var data = await response.json();
      return data.choices[0].message.content;
    }
  }

  // ============================================================
  // 消息发送 / Message Sending
  // ============================================================

  async function sendAIMessage(text) {
    if (state.isLoading) return;
    if (!text || !text.trim()) return;

    if (!state.currentConvId) createConversation();

    var userContent = text.trim();
    state.messages.push({ role: 'user', content: userContent });

    var welcome = state.dom.aiMessages.querySelector('.ai-welcome');
    if (welcome) welcome.remove();
    renderSingleAIMessage(state.messages[state.messages.length - 1], state.messages.length - 1);

    if (state.dom.aiInput) state.dom.aiInput.value = '';

    updateConversationTitle();
    renderConversationList();

    await doApiCall();
  }

  async function doApiCall() {
    state.isLoading = true;
    state.isStreaming = true;
    updateAISendButtonState();

    try {
      var reply;
      var usedStream = true;

      try {
        appendStreamingMessage('assistant');
        reply = await callApi(true);
        if (!reply || !reply.trim()) throw new Error('EMPTY_STREAM_RESPONSE');
      } catch (streamErr) {
        usedStream = false;
        if (state.streamingMessageEl && state.streamingMessageEl.parentNode) {
          state.streamingMessageEl.parentNode.removeChild(state.streamingMessageEl);
        }
        finalizeStreamingMessage();
        reply = await callApi(false);
      }

      state.messages.push({ role: 'assistant', content: reply });

      if (usedStream) {
        finalizeStreamingMessage();
      } else {
        renderSingleAIMessage(state.messages[state.messages.length - 1], state.messages.length - 1);
      }

      saveConversations();
      renderConversationList();
    } catch (e) {
      if (state.streamingMessageEl && state.streamingMessageEl.parentNode) {
        state.streamingMessageEl.parentNode.removeChild(state.streamingMessageEl);
      }
      finalizeStreamingMessage();

      var errorMsg = e.message === 'NO_API_KEY' ? t('pixel_ide_no_api_key') : t('pixel_ide_api_error');
      showToast(errorMsg);

      state.messages.push({ role: 'assistant', content: 'Error: ' + e.message, isError: true });
      renderSingleAIMessage(state.messages[state.messages.length - 1], state.messages.length - 1);
      saveConversations();
    } finally {
      state.isLoading = false;
      updateAISendButtonState();
    }
  }

  // ============================================================
  // 代码运行 / Code Execution
  // ============================================================

  function runCode() {
    if (!state.dom.editor || !state.dom.output) return;

    var code = state.dom.editor.value;
    var lang = state.currentLang;
    var output = '';

    if (lang === 'python') {
      if (code.includes('print(')) {
        var matches = code.match(/print\(['"]([^'"]+)['"]\)/g);
        if (matches) {
          for (var i = 0; i < matches.length; i++) {
            var content = matches[i].match(/print\(['"]([^'"]+)['"]\)/);
            if (content) output += content[1] + '\n';
          }
        } else {
          output = t('pixel_ide_running_python') + '\n' + t('pixel_ide_simulated_output');
        }
      } else {
        output = t('pixel_ide_running_python') + '\n' + t('pixel_ide_simulated_output');
      }
    } else {
      if (code.includes('cout')) {
        var coutMatches = code.match(/cout\s*<<\s*['"]([^'"]+)['"]/g);
        if (coutMatches) {
          for (var j = 0; j < coutMatches.length; j++) {
            var coutContent = coutMatches[j].match(/cout\s*<<\s*['"]([^'"]+)['"]/);
            if (coutContent) output += coutContent[1] + '\n';
          }
        } else {
          output = t('pixel_ide_running_cpp') + '\n' + t('pixel_ide_simulated_output');
        }
      } else {
        output = t('pixel_ide_running_cpp') + '\n' + t('pixel_ide_simulated_output');
      }
    }

    state.dom.output.textContent = output;
    showToast(t('pixel_ide_run_success'));
  }

  // ============================================================
  // UI 更新 / UI Updates
  // ============================================================

  function updateAISendButtonState() {
    if (!state.dom.aiSendBtn) return;
    state.dom.aiSendBtn.disabled = state.isLoading;
    state.dom.aiSendBtn.textContent = state.isLoading ? t('pixel_ide_sending') : t('pixel_ide_ai_send');
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'pixel-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2000);
  }

  // ============================================================
  // 事件监听 / Event Listeners
  // ============================================================

  function bindEvents() {
    if (state.dom.langSelect) {
      state.dom.langSelect.addEventListener('change', function () {
        state.currentLang = this.value;
        saveFiles();
      });
    }

    if (state.dom.runBtn) {
      state.dom.runBtn.addEventListener('click', runCode);
    }

    if (state.dom.saveBtn) {
      state.dom.saveBtn.addEventListener('click', function () {
        saveFiles();
        showToast(t('pixel_ide_save_success'));
      });
    }

    if (state.dom.newBtn) {
      state.dom.newBtn.addEventListener('click', function () {
        createNewFile(state.currentLang);
      });
    }

    if (state.dom.clearOutputBtn) {
      state.dom.clearOutputBtn.addEventListener('click', function () {
        if (state.dom.output) state.dom.output.textContent = '';
      });
    }

    if (state.dom.convTab) {
      state.dom.convTab.addEventListener('click', function () {
        state.dom.convTab.classList.add('active');
        state.dom.filesTab.classList.remove('active');
        state.dom.convList.classList.remove('hidden');
        state.dom.filesList.classList.add('hidden');
      });
    }

    if (state.dom.filesTab) {
      state.dom.filesTab.addEventListener('click', function () {
        state.dom.filesTab.classList.add('active');
        state.dom.convTab.classList.remove('active');
        state.dom.filesList.classList.remove('hidden');
        state.dom.convList.classList.add('hidden');
      });
    }

    if (state.dom.aiSendBtn) {
      state.dom.aiSendBtn.addEventListener('click', function () {
        sendAIMessage(state.dom.aiInput.value);
      });
    }

    if (state.dom.aiInput) {
      state.dom.aiInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendAIMessage(this.value);
        }
      });
    }

    if (state.dom.aiNewChatBtn) {
      state.dom.aiNewChatBtn.addEventListener('click', createConversation);
    }

    if (state.dom.aiSettingsBtn) {
      state.dom.aiSettingsBtn.addEventListener('click', function () {
        if (window.PixelAI && window.PixelAI.openSettings) {
          window.PixelAI.openSettings();
        }
      });
    }

    if (state.dom.backBtn) {
      state.dom.backBtn.addEventListener('click', function () {
        saveFiles();
        saveConversations();
        if (window.App && window.App.navigateTo) {
          window.App.navigateTo('pixel-programming');
        }
      });
    }

    if (state.dom.editor) {
      state.dom.editor.addEventListener('input', function () {
        saveFiles();
      });
    }
  }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================

  function init() {
    cacheDom();
    loadFiles();
    loadConversations();
    bindEvents();
    createConversation();
    renderFilesList();
    renderConversationList();
  }

  return {
    init: init,
    getApiKey: function () { return window.PixelAI ? window.PixelAI.getApiKey() : ''; },
    getProviderId: function () { return window.PixelAI ? window.PixelAI.getProviderId() : 'openai'; },
    getModelId: function () { return window.PixelAI ? window.PixelAI.getModelId() : 'gpt-4o-mini'; },
    getBaseUrl: function () { return window.PixelAI ? window.PixelAI.getBaseUrl() : 'https://api.openai.com/v1'; }
  };

})();