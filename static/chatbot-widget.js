(function () {
  const STYLE_ID = 'chatbot-widget-style';
  const WIDGET_ID = 'chatbot-widget-root';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root { --cb-primary: #3B82F6; --cb-primary-dark: #2563EB; --cb-gray-50: #F9FAFB; --cb-gray-200: #E5E7EB; --cb-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); --cb-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
      
      .cb-floating-button {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483000;
        width: 60px; height: 60px; border-radius: 50%;
        background: var(--cb-primary);
        color: #fff; border: none; cursor: pointer;
        box-shadow: var(--cb-shadow-lg);
        display: flex; align-items: center; justify-content: center; font-size: 24px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .cb-floating-button:hover {
        transform: scale(1.1);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      }
      .cb-panel {
        position: fixed; bottom: 96px; right: 24px; z-index: 2147483000;
        width: 400px; height: 600px; max-height: 80vh; min-height: 500px;
        background: #fff; color: #1F2937;
        border-radius: 20px; box-shadow: var(--cb-shadow-lg);
        display: none; flex-direction: column; overflow: hidden;
        border: 1px solid var(--cb-gray-200);
        transform: translateY(20px) scale(0.95); opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .cb-floating-button.left { left: 24px; right: auto; }
      .cb-panel.left { bottom: 96px; left: 24px; right: auto; }
      .cb-panel.open { display: flex; transform: translateY(0) scale(1); opacity: 1; }
      
      .cb-header { 
        padding: 20px 24px; background: var(--cb-primary);
        color: #fff; display: flex; align-items: center; justify-content: space-between;
        border-radius: 20px 20px 0 0;
      }
      .cb-title { font-weight: 700; font-size: 18px; line-height: 1.2; }
      .cb-close { 
        background: rgba(255,255,255,0.1); border: 0; color: #fff;
        cursor: pointer; font-size: 20px; width: 32px; height: 32px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
      }
      .cb-close:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
      
      .cb-messages { 
        flex: 1; overflow-y: auto; padding: 20px; background: var(--cb-gray-50);
        -webkit-overflow-scrolling: touch;
      }
      .cb-message { 
        margin: 12px 0; line-height: 1.5; font-size: 14px;
        animation: messageSlideIn 0.3s ease-out;
      }
      @keyframes messageSlideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .cb-message.user { 
        background: var(--cb-primary);
        color: #fff; margin-left: 20%; padding: 12px 16px;
        border-radius: 18px 18px 4px 18px; box-shadow: var(--cb-shadow);
      }
      .cb-message.assistant { 
        background: #fff; margin-right: 20%; padding: 12px 16px;
        border-radius: 18px 18px 18px 4px; box-shadow: var(--cb-shadow);
        border: 1px solid var(--cb-primary); margin-top: 4px;
      }
      
      .cb-input { 
        display: flex; gap: 12px; padding: 20px;
        border-top: 1px solid var(--cb-gray-200); background: #fff; flex-shrink: 0;
      }
      .cb-input input { 
        flex: 1; padding: 12px 16px; border: 2px solid var(--cb-primary);
        border-radius: 24px; font-size: 14px; background: #fff;
        transition: all 0.2s ease;
      }
      .cb-input input:focus {
        outline: none; border-color: var(--cb-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      .cb-input button { 
        background: var(--cb-primary);
        color: #fff; border: none; border-radius: 50%;
        width: 44px; height: 44px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease; box-shadow: var(--cb-shadow);
        position: relative;
      }
      .cb-input button svg {
        width: 24px; height: 24px; fill: currentColor;
      }
      .cb-input button:hover { transform: scale(1.05); }
      
      @media (max-width: 480px) {
        .cb-panel { width: calc(100vw - 48px); right: 24px; left: 24px; }
        .cb-panel.left { left: 24px; right: 24px; }
        .cb-message.user { margin-left: 10%; }
        .cb-message.assistant { margin-right: 10%; }
      }
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
    const send = el('button', null, '');
    const sendIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sendIcon.setAttribute('viewBox', '0 0 24 24');
    sendIcon.innerHTML = '<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>';
    send.appendChild(sendIcon);
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
