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
    deepThinkingEnabled: false,
    deepThinkingContent: '',
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

  function createNewFile(lang, name) {
    var fileLang = lang || state.currentLang;
    var fileName = name || (fileLang === 'python' ? 'untitled.py' : 'untitled.cpp');
    var file = {
      id: genId(),
      name: fileName,
      lang: fileLang,
      content: DEFAULT_CODE[fileLang],
      timestamp: Date.now()
    };
    state.files.unshift(file);
    state.currentFileId = file.id;
    state.currentLang = fileLang;
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
    if (state.dom.currentLang) {
      state.dom.currentLang.textContent = file.lang === 'python' ? 'Python' : 'C++';
    }
    if (state.dom.currentFile) {
      state.dom.currentFile.textContent = file.name;
    }
  }

  // ============================================================
  // 新建文件对话框 / New File Dialog
  // ============================================================

  var newFileSelectedLang = 'python';

  function openNewFileDialog() {
    if (!state.dom.newFileModal) return;
    newFileSelectedLang = 'python';
    if (state.dom.newFileNameInput) {
      state.dom.newFileNameInput.value = '';
    }
    if (state.dom.newFileLangOptions) {
      state.dom.newFileLangOptions.forEach(function (opt) {
        opt.classList.toggle('active', opt.dataset.lang === 'python');
      });
    }
    state.dom.newFileModal.style.display = 'flex';
    if (state.dom.newFileNameInput) {
      setTimeout(function () { state.dom.newFileNameInput.focus(); }, 100);
    }
  }

  function closeNewFileDialog() {
    if (!state.dom.newFileModal) return;
    state.dom.newFileModal.style.display = 'none';
  }

  function selectNewFileLang(lang) {
    newFileSelectedLang = lang;
    if (state.dom.newFileLangOptions) {
      state.dom.newFileLangOptions.forEach(function (opt) {
        opt.classList.toggle('active', opt.dataset.lang === lang);
      });
    }
  }

  function confirmNewFile() {
    var name = state.dom.newFileNameInput ? state.dom.newFileNameInput.value.trim() : '';
    if (!name) {
      name = newFileSelectedLang === 'python' ? 'untitled.py' : 'untitled.cpp';
    } else {
      var ext = newFileSelectedLang === 'python' ? '.py' : '.cpp';
      if (!name.endsWith(ext)) {
        name += ext;
      }
    }
    createNewFile(newFileSelectedLang, name);
    closeNewFileDialog();
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
    state.dom.runBtn = document.getElementById('btn-ide-run');
    state.dom.saveBtn = document.getElementById('btn-ide-save');
    state.dom.newBtn = document.getElementById('btn-ide-new');
    state.dom.currentFile = document.getElementById('ide-current-file');
    state.dom.currentLang = document.getElementById('ide-current-lang');
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
    state.dom.aiDeepThinkingBtn = document.getElementById('btn-ide-ai-deep-thinking');

    state.dom.newFileModal = document.getElementById('ide-new-file-modal');
    state.dom.newFileNameInput = document.getElementById('ide-new-file-name');
    state.dom.newFileCancelBtn = document.getElementById('btn-ide-new-cancel');
    state.dom.newFileConfirmBtn = document.getElementById('btn-ide-new-confirm');
    state.dom.newFileLangOptions = document.querySelectorAll('.ide-lang-option');

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

    // 深度思考卡片（位于助手消息之前）/ Deep thinking card (before assistant message)
    if (msg.role === 'assistant' && msg.deepThinkingContent) {
      var card = document.createElement('div');
      card.className = 'pixel-ide-ai-deep-thinking-card';

      var header = document.createElement('div');
      header.className = 'pixel-ide-ai-deep-thinking-header';

      var title = document.createElement('span');
      title.className = 'pixel-ide-ai-deep-thinking-title';
      title.textContent = t('pixel_ide_deep_thinking_reasoning');
      header.appendChild(title);

      var toggle = document.createElement('button');
      toggle.className = 'pixel-ide-ai-deep-thinking-toggle';
      toggle.textContent = t('pixel_ide_deep_thinking_collapse');
      (function (cardEl, toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          cardEl.classList.toggle('collapsed');
          toggleBtn.textContent = cardEl.classList.contains('collapsed') ?
            t('pixel_ide_deep_thinking_expand') : t('pixel_ide_deep_thinking_collapse');
        });
      })(card, toggle);
      header.appendChild(toggle);
      card.appendChild(header);

      var thinkingContent = document.createElement('div');
      thinkingContent.className = 'pixel-ide-ai-deep-thinking-content';
      thinkingContent.innerHTML = sanitizeHtml(markdownToHtml(msg.deepThinkingContent));
      card.appendChild(thinkingContent);

      container.appendChild(card);
    }

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

    if (msg.role === 'assistant' && !msg.isError) {
      var codeBlocks = extractCodeBlocks(msg.content);
      if (codeBlocks.length > 0) {
        var applyDiv = document.createElement('div');
        applyDiv.className = 'pixel-ide-ai-code-actions';

        for (var ci = 0; ci < codeBlocks.length; ci++) {
          (function (code, lang) {
            var btn = document.createElement('button');
            btn.className = 'pixel-btn pixel-btn-sm';
            btn.textContent = t('pixel_ide_apply_code') + (codeBlocks.length > 1 ? ' (' + (ci + 1) + ')' : '');
            btn.addEventListener('click', function () {
              applyCodeToFile(code, lang);
            });
            applyDiv.appendChild(btn);
          })(codeBlocks[ci].code, codeBlocks[ci].lang);
        }

        msgDiv.appendChild(applyDiv);
      }
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  function extractCodeBlocks(text) {
    var blocks = [];
    if (!text) return blocks;
    var regex = /```(\w+)?\n([\s\S]*?)```/g;
    var match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push({ lang: match[1] || '', code: match[2] });
    }
    if (blocks.length === 0) {
      var pyRegex = /(?:python|py)\s*[:：]?\n([\s\S]+?)(?=\n\n|\n[A-Z]|$)/i;
      var pyMatch = text.match(pyRegex);
      if (pyMatch && pyMatch[1].trim().length > 20) {
        blocks.push({ lang: 'python', code: pyMatch[1].trim() });
      }
    }
    return blocks;
  }

  function getCurrentFile() {
    if (!state.currentFileId) return null;
    for (var i = 0; i < state.files.length; i++) {
      if (state.files[i].id === state.currentFileId) return state.files[i];
    }
    return null;
  }

  function applyCodeToFile(code, lang) {
    if (!state.currentFileId) {
      showToast(t('pixel_ide_no_file'));
      return;
    }
    var file = getCurrentFile();
    if (!file) return;

    if (lang && lang !== '') {
      var normalizedLang = lang.toLowerCase();
      if (normalizedLang === 'python' || normalizedLang === 'py') {
        if (file.lang !== 'python') {
          file.lang = 'python';
          file.name = file.name.replace(/\.(cpp|c|cc|cxx)$/, '.py');
        }
      } else if (['cpp', 'c++', 'c', 'cc', 'cxx'].indexOf(normalizedLang) !== -1) {
        if (file.lang !== 'cpp') {
          file.lang = 'cpp';
          file.name = file.name.replace(/\.py$/, '.cpp');
        }
      }
      state.currentLang = file.lang;
      if (state.dom.currentLang) {
        state.dom.currentLang.textContent = file.lang === 'python' ? 'Python' : 'C++';
      }
      if (state.dom.currentFile) {
        state.dom.currentFile.textContent = file.name;
      }
    }

    file.content = code;
    if (state.dom.editor) {
      state.dom.editor.value = code;
    }
    saveFiles();
    renderFilesList();
    showToast(t('pixel_ide_code_applied'));
  }

  function addApplyCodeButtons(msgElement, content) {
    if (!msgElement) return;
    var codeBlocks = extractCodeBlocks(content);
    if (codeBlocks.length === 0) return;

    var applyDiv = document.createElement('div');
    applyDiv.className = 'pixel-ide-ai-code-actions';

    for (var ci = 0; ci < codeBlocks.length; ci++) {
      (function (code, lang) {
        var btn = document.createElement('button');
        btn.className = 'pixel-btn pixel-btn-sm';
        btn.textContent = t('pixel_ide_apply_code') + (codeBlocks.length > 1 ? ' (' + (ci + 1) + ')' : '');
        btn.addEventListener('click', function () {
          applyCodeToFile(code, lang);
        });
        applyDiv.appendChild(btn);
      })(codeBlocks[ci].code, codeBlocks[ci].lang);
    }

    msgElement.appendChild(applyDiv);
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
    // 先查找普通消息内容区，再回退到深度思考内容区
    var contentDiv = state.streamingMessageEl.querySelector('.pixel-ide-ai-message-content');
    if (!contentDiv) contentDiv = state.streamingMessageEl.querySelector('.pixel-ide-ai-deep-thinking-content');
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

    if (!apiKey) {
      showToast(t('pixel_ide_no_api_key'));
      throw new Error('NO_API_KEY');
    }

    var messages = [];
    for (var i = 0; i < state.messages.length; i++) {
      messages.push({ role: state.messages[i].role, content: state.messages[i].content });
    }

    if (window.PixelAI && window.PixelAI.callApiWithMessages) {
      if (streaming) {
        return await window.PixelAI.callApiWithMessages(messages, true, updateStreamingMessage);
      } else {
        return await window.PixelAI.callApiWithMessages(messages, false);
      }
    }

    throw new Error('PixelAI not available');
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

      if (state.deepThinkingEnabled) {
        reply = await doDeepThinkingApiCall();
      } else {
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
      }

      state.messages.push({ role: 'assistant', content: reply, deepThinkingContent: state.deepThinkingContent });

      if (usedStream) {
        if (state.streamingMessageEl) {
          addApplyCodeButtons(state.streamingMessageEl, reply);
        }
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
      state.deepThinkingContent = '';
      updateAISendButtonState();
    }
  }

  // ============================================================
  // 深度思考 / Deep Thinking
  // ============================================================

  async function doDeepThinkingApiCall() {
    // 清除上一次的思考卡片（如有）
    if (state.dom.aiMessages) {
      var oldCard = state.dom.aiMessages.querySelector('#ide-ai-deep-thinking-card');
      if (oldCard) oldCard.remove();
    }

    var thinkingCard = appendDeepThinkingCard();
    state.deepThinkingContent = '';

    var thinkingPrompt = buildDeepThinkingPrompt(state.messages);
    var thinkingMessages = [{ role: 'system', content: thinkingPrompt }];
    for (var i = 0; i < state.messages.length; i++) {
      thinkingMessages.push({ role: state.messages[i].role, content: state.messages[i].content });
    }

    // 临时替换 state.messages 用于思考阶段调用
    var originalMessages = state.messages.slice();
    state.messages = thinkingMessages;

    // 将流式输出目标临时指向思考卡片
    state.streamingMessageEl = thinkingCard;
    state.streamingContent = '';

    var thinkingReply = '';
    try {
      thinkingReply = await callApi(true);
    } catch (e) {
      // 流式失败则回退非流式
      thinkingReply = await callApi(false);
      updateDeepThinkingCard(thinkingReply);
    } finally {
      state.messages = originalMessages;
    }

    state.deepThinkingContent = thinkingReply || '';
    // 清除流式状态，但保留卡片
    state.streamingMessageEl = null;
    state.streamingContent = '';

    // 最终回答的流式输出
    appendStreamingMessage('assistant');

    var finalPrompt = buildFinalResponsePrompt(thinkingReply);
    var finalMessages = [{ role: 'system', content: finalPrompt }];
    for (var j = 0; j < originalMessages.length; j++) {
      finalMessages.push({ role: originalMessages[j].role, content: originalMessages[j].content });
    }

    state.messages = finalMessages;

    try {
      return await callApi(true);
    } finally {
      state.messages = originalMessages;
    }
  }

  function buildDeepThinkingPrompt(messages) {
    var userMsg = messages[messages.length - 1].content;
    return '你是一个深度思考助手。请对用户的问题 "' + userMsg + '" 进行深度分析和推理。\n\n' +
      '请按照以下结构输出你的思考过程，并用【【符号】】框住整个思考内容：\n\n' +
      '【【\n' +
      '1. 问题分析：拆解问题的核心要点\n' +
      '2. 相关知识：回顾与问题相关的知识\n' +
      '3. 推理路径：逐步推导的逻辑过程\n' +
      '4. 可能的答案：列出几种可能的解答方向\n' +
      '5. 最优选择：分析哪种答案最合理\n' +
      '6. 结论：总结你的思考结果\n' +
      '】】\n\n' +
      '请详细思考，不要跳过任何步骤。你的思考过程将被用于生成最终回复。';
  }

  function buildFinalResponsePrompt(thinkingContent) {
    return '你是一个智能助手。我已经对用户的问题进行了深度思考，以下是思考过程：\n\n' +
      thinkingContent + '\n\n' +
      '请基于以上思考过程，用自然、友好的语言回答用户的问题。你的回答应该：\n' +
      '1. 直接回应用户的问题，不要提及思考过程\n' +
      '2. 语言流畅，逻辑清晰\n' +
      '3. 保持像素风格的可爱语气\n' +
      '4. 如果是技术问题，提供清晰的解释和示例';
  }

  function appendDeepThinkingCard() {
    if (!state.dom.aiMessages) return null;

    var card = document.createElement('div');
    card.id = 'ide-ai-deep-thinking-card';
    card.className = 'pixel-ide-ai-deep-thinking-card';

    var header = document.createElement('div');
    header.className = 'pixel-ide-ai-deep-thinking-header';

    var title = document.createElement('span');
    title.className = 'pixel-ide-ai-deep-thinking-title';
    title.textContent = t('pixel_ide_deep_thinking_reasoning');
    header.appendChild(title);

    var toggle = document.createElement('button');
    toggle.className = 'pixel-ide-ai-deep-thinking-toggle';
    toggle.textContent = t('pixel_ide_deep_thinking_collapse');
    (function (cardEl, toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        cardEl.classList.toggle('collapsed');
        toggleBtn.textContent = cardEl.classList.contains('collapsed') ?
          t('pixel_ide_deep_thinking_expand') : t('pixel_ide_deep_thinking_collapse');
      });
    })(card, toggle);
    header.appendChild(toggle);

    card.appendChild(header);

    var content = document.createElement('div');
    content.className = 'pixel-ide-ai-deep-thinking-content';
    content.textContent = t('pixel_ide_deep_thinking_thinking');
    card.appendChild(content);

    state.dom.aiMessages.appendChild(card);
    state.dom.aiMessages.scrollTop = state.dom.aiMessages.scrollHeight;

    return card;
  }

  function updateDeepThinkingCard(content) {
    var card = document.getElementById('ide-ai-deep-thinking-card');
    if (!card) return;
    var contentDiv = card.querySelector('.pixel-ide-ai-deep-thinking-content');
    if (contentDiv) {
      contentDiv.innerHTML = sanitizeHtml(markdownToHtml(content || ''));
    }
  }

  function toggleDeepThinking() {
    state.deepThinkingEnabled = !state.deepThinkingEnabled;
    if (state.dom.aiDeepThinkingBtn) {
      state.dom.aiDeepThinkingBtn.textContent = state.deepThinkingEnabled ?
        t('pixel_ide_deep_thinking_disable') : t('pixel_ide_deep_thinking_enable');
      state.dom.aiDeepThinkingBtn.classList.toggle('active', state.deepThinkingEnabled);
    }
  }

  // ============================================================
  // 代码运行 / Code Execution
  // ============================================================

  async function runCode() {
    if (!state.dom.editor || !state.dom.output) return;

    var code = state.dom.editor.value;
    var lang = state.currentLang;

    if (state.dom.runBtn) {
      state.dom.runBtn.disabled = true;
      state.dom.runBtn.textContent = t('pixel_ide_running');
    }

    state.dom.output.textContent = t('pixel_ide_running_code') + '...';

    try {
      var response = await fetch('http://127.0.0.1:8765/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          language: lang
        })
      });

      var result = await response.json();

      var output = '';
      if (result.stdout && result.stdout.trim()) {
        output += result.stdout;
      }
      if (result.stderr && result.stderr.trim()) {
        if (output) output += '\n';
        output += 'stderr:\n' + result.stderr;
      }
      if (!output) {
        output = result.success ? t('pixel_ide_run_success') : t('pixel_ide_run_failed');
      }

      state.dom.output.textContent = output;
      showToast(result.success ? t('pixel_ide_run_success') : t('pixel_ide_run_failed'));
    } catch (e) {
      state.dom.output.textContent = t('pixel_ide_run_error') + ': ' + e.message + '\n\n' +
        t('pixel_ide_run_hint');
      showToast(t('pixel_ide_run_error'));
    } finally {
      if (state.dom.runBtn) {
        state.dom.runBtn.disabled = false;
        state.dom.runBtn.textContent = t('pixel_ide_run');
      }
    }
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
        openNewFileDialog();
      });
    }

    if (state.dom.newFileCancelBtn) {
      state.dom.newFileCancelBtn.addEventListener('click', closeNewFileDialog);
    }

    if (state.dom.newFileConfirmBtn) {
      state.dom.newFileConfirmBtn.addEventListener('click', confirmNewFile);
    }

    if (state.dom.newFileLangOptions) {
      state.dom.newFileLangOptions.forEach(function (opt) {
        opt.addEventListener('click', function () {
          selectNewFileLang(this.dataset.lang);
        });
      });
    }

    if (state.dom.newFileNameInput) {
      state.dom.newFileNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          confirmNewFile();
        }
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

    if (state.dom.aiDeepThinkingBtn) {
      state.dom.aiDeepThinkingBtn.addEventListener('click', toggleDeepThinking);
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

  function onLanguageChange() {
    if (state.dom.aiDeepThinkingBtn) {
      state.dom.aiDeepThinkingBtn.textContent = state.deepThinkingEnabled ?
        t('pixel_ide_deep_thinking_disable') : t('pixel_ide_deep_thinking_enable');
      state.dom.aiDeepThinkingBtn.classList.toggle('active', state.deepThinkingEnabled);
    }
    renderAIMessages();
  }

  function init() {
    if (window.i18n && typeof window.i18n.applyToDOM === 'function') {
      window.i18n.applyToDOM();
    }
    cacheDom();
    loadFiles();
    loadConversations();
    bindEvents();
    createConversation();
    renderFilesList();
    renderConversationList();

    document.addEventListener('languagechange', onLanguageChange);
  }

  return {
    init: init,
    getApiKey: function () { return window.PixelAI ? window.PixelAI.getApiKey() : ''; },
    getProviderId: function () { return window.PixelAI ? window.PixelAI.getProviderId() : 'openai'; },
    getModelId: function () { return window.PixelAI ? window.PixelAI.getModelId() : 'gpt-4o-mini'; },
    getBaseUrl: function () { return window.PixelAI ? window.PixelAI.getBaseUrl() : 'https://api.openai.com/v1'; }
  };

})();