(function () {
  const STYLE_ID = 'chatbot-widget-style';
  const WIDGET_ID = 'chatbot-widget-root';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .cb-floating-button {
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483000;
        width: 56px; height: 56px; border-radius: 50%;
        background: #0d6efd; color: #fff; border: none; cursor: pointer;
        box-shadow: 0 6px 18px rgba(13,110,253,0.35);
        display: flex; align-items: center; justify-content: center; font-size: 22px;
      }
      .cb-panel {
        position: fixed; bottom: 86px; right: 20px; z-index: 2147483000;
        width: 360px; max-height: 70vh; background: #fff; color: #111;
        border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,0.18);
        display: none; flex-direction: column; overflow: hidden;
        border: 1px solid #e9ecef;
      }
      .cb-panel.open { display: flex; }
      .cb-header { padding: 10px 12px; background: #0d6efd; color: #fff; display:flex; align-items:center; justify-content: space-between; }
      .cb-title { font-weight: 600; font-size: 14px; }
      .cb-close { background: transparent; border: 0; color: #fff; cursor: pointer; font-size: 18px; }
      .cb-messages { flex: 1; overflow-y: auto; padding: 12px; background: #f8f9fa; }
      .cb-message { margin: 8px 0; padding: 10px; border-radius: 8px; line-height: 1.35; font-size: 14px; }
      .cb-message.user { background: #e7f1ff; margin-left: 15%; }
      .cb-message.assistant { background: #eef7e9; margin-right: 15%; }
      .cb-input { display:flex; gap:8px; padding: 10px; border-top: 1px solid #e9ecef; }
      .cb-input input { flex:1; padding: 10px; border:1px solid #ced4da; border-radius: 6px; font-size: 14px; }
      .cb-input button { background:#0d6efd; color:#fff; border:none; border-radius:6px; padding: 10px 12px; cursor:pointer; }
      .cb-sessions { padding: 8px 10px; background: #fff; border-bottom: 1px solid #e9ecef; display:flex; gap:6px; overflow-x:auto; }
      .cb-session { background:#6f42c1; color:#fff; border:none; border-radius: 100px; padding:4px 8px; font-size: 11px; cursor:pointer; }
      .cb-session.active { background:#198754; }
    `;
    document.head.appendChild(style);
  }

  function createWidgetRoot() {
    if (document.getElementById(WIDGET_ID)) return document.getElementById(WIDGET_ID);
    const root = document.createElement('div');
    root.id = WIDGET_ID;
    document.body.appendChild(root);
    return root;
  }

  function ChatbotWidget(opts) {
    const cfg = Object.assign({
      apiBase: '/', // e.g., 'https://api.example.com'
      title: 'ChatBot',
    }, opts || {});

    // Ensure apiBase ends with a trailing slash
    if (typeof cfg.apiBase === 'string') {
      if (!cfg.apiBase.endsWith('/')) cfg.apiBase = cfg.apiBase + '/';
    } else {
      cfg.apiBase = '/';
    }

  // single-session mode: no per-user/per-session state

    function el(tag, cls, text) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    }

    function getClientId() {
      try {
        const key = 'chat_client_id';
        let id = localStorage.getItem(key);
        if (!id) {
          id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
          localStorage.setItem(key, id);
        }
        return id;
      } catch (_) {
        return 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      }
    }

    async function api(path, options) {
      const opts = Object.assign({}, options || {});
      opts.headers = Object.assign({}, opts.headers || {}, { 'X-Client-Id': getClientId() });
      const res = await fetch(cfg.apiBase + path, opts);
      if (!res.ok) throw new Error((await res.text()) || ('HTTP ' + res.status));
      return res.json();
    }

  // no startSession/loadSessions/renderSessions in single-session mode

    function addMessage(role, content) {
      const m = el('div', 'cb-message ' + role);
      m.textContent = content;
      messages.appendChild(m);
      messages.scrollTop = messages.scrollHeight;
    }

    async function loadMessages() {
      messages.innerHTML = '';
      const data = await api('messages');
      (data.messages || []).forEach(m => addMessage(m.role, m.content));
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage('user', text);
      input.value = '';
      try {
        const data = await api('chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, client_id: getClientId() })
        });
        addMessage('assistant', (data.used_faq ? '📚 ' : '') + data.reply);
      } catch (e) {
        console.error('Send message failed:', e);
        addMessage('assistant', 'Error: ' + (e && e.message ? e.message : 'Failed to reach API'));
      }
    }
    // DOM
    const root = createWidgetRoot();
    root.innerHTML = '';

    const btn = el('button', 'cb-floating-button', '💬');
    const panel = el('div', 'cb-panel');
    const header = el('div', 'cb-header');
    const title = el('div', 'cb-title', cfg.title);
    const close = el('button', 'cb-close', '×');

    // Visitor Info Form (optional; email required if saving)
    const formSection = el('div', null);
    formSection.style.padding = '16px';
    formSection.style.background = '#fafafa';
    formSection.style.borderBottom = '1px solid #e9ecef';
    const formTitle = el('div', null, 'Visitor Info');
    formTitle.style.fontWeight = 'bold';
    formTitle.style.marginBottom = '8px';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your name (optional)';
    nameInput.style.marginRight = '8px';
    nameInput.style.width = '40%';
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Your email (required to save)';
    emailInput.style.marginRight = '8px';
    emailInput.style.width = '40%';
    const saveBtn = el('button', null, 'Save');
    saveBtn.style.background = '#0d6efd';
    saveBtn.style.color = '#fff';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.padding = '8px 16px';
    saveBtn.style.cursor = 'pointer';
    const formStatus = el('div', null, '');
    formStatus.style.color = '#d63384';
    formStatus.style.fontSize = '13px';
    formStatus.style.marginTop = '6px';

    formSection.appendChild(formTitle);
    formSection.appendChild(nameInput);
    formSection.appendChild(emailInput);
    formSection.appendChild(saveBtn);
    formSection.appendChild(formStatus);

    // Chat UI
    const messages = el('div', 'cb-messages');
    const inputBar = el('div', 'cb-input');
    const input = document.createElement('input');
    input.placeholder = 'Type your message...';
    const send = el('button', null, 'Send');
    inputBar.appendChild(input);
    inputBar.appendChild(send);

    header.appendChild(title);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(formSection);
    panel.appendChild(messages);
    panel.appendChild(inputBar);
    root.appendChild(btn);
    root.appendChild(panel);

    btn.onclick = () => panel.classList.toggle('open');
    close.onclick = () => panel.classList.remove('open');
    send.onclick = sendMessage;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

    // Save visitor info (optional)
    saveBtn.onclick = async function () {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        formStatus.textContent = 'Please enter a valid email.';
        formStatus.style.color = '#d63384';
        return;
      }
      try {
        await api('lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, client_id: getClientId() })
        });
        formStatus.textContent = 'Saved';
        formStatus.style.color = '#198754';
      } catch (e) {
        formStatus.textContent = 'Error: ' + (e && e.message ? e.message : 'Could not save info');
        formStatus.style.color = '#d63384';
      }
    };

    // Prefill form if lead exists
    (async function prefillForm() {
      try {
        const lead = await api('lead');
        if (lead && lead.email) {
          nameInput.value = lead.name || '';
          emailInput.value = lead.email || '';
          formStatus.textContent = '';
        }
      } catch (e) {
        // no saved lead; leave blank
      }
    })();

    // Initial load
    injectStyles();
    loadMessages().catch(e => console.warn('Widget init: could not load messages', e));

    // public API
    return {
      open: () => panel.classList.add('open'),
      close: () => panel.classList.remove('open')
    };
  }

  // Expose factory
  window.createChatbotWidget = function (options) {
    injectStyles();
    return new ChatbotWidget(options);
  };
})();
