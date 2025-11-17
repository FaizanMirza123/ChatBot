(function(){
  const STYLE_ID='chatbot-widget-style';
  const WIDGET_ID='chatbot-widget-root';
  function injectStyles(){ let s=document.getElementById(STYLE_ID); if(!s){ s=document.createElement('style'); s.id=STYLE_ID; document.head.appendChild(s);} s.textContent=`
    #${WIDGET_ID}{--cb-primary:#3B82F6;--cb-primary-dark:#2563EB;--cb-primary-light:#DBEAFE;--cb-gray-50:#F9FAFB;--cb-gray-100:#F3F4F6;--cb-gray-200:#E5E7EB;--cb-gray-300:#D1D5DB;--cb-gray-400:#9CA3AF;--cb-gray-500:#6B7280;--cb-gray-600:#4B5563;--cb-gray-700:#374151;--cb-gray-800:#1F2937;--cb-gray-900:#111827;--cb-shadow-sm:0 1px 2px 0 rgba(0,0,0,0.05);--cb-shadow:0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px 0 rgba(0,0,0,0.06);--cb-shadow-md:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);--cb-shadow-lg:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05);--cb-shadow-xl:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04)}
    
    .cb-floating-button{
      position:fixed;bottom:24px;right:24px;z-index:2147483000;
      width:60px;height:60px;border-radius:50%;
      background:var(--cb-primary);
      color:#fff;border:none;cursor:pointer;
      box-shadow:var(--cb-shadow-lg),0 0 0 0 rgba(59,130,246,0.4);
      display:flex;align-items:center;justify-content:center;font-size:24px;
      transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
      transform:scale(1);
    }
    
    .cb-welcome-tooltip{
      position:fixed;bottom:96px;right:24px;z-index:2147483001;
      background:#fff;color:var(--cb-gray-800);
      border-radius:12px;box-shadow:var(--cb-shadow-lg);
      padding:12px 16px;max-width:280px;font-size:14px;
      border:1px solid var(--cb-gray-200);
      transform:translateY(20px) scale(0.95);opacity:0;
      transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
      pointer-events:none;
    }
    .cb-welcome-tooltip.show{
      transform:translateY(0) scale(1);opacity:1;
    }
    .cb-welcome-tooltip.left{
      right:auto;left:24px;
    }
    .cb-welcome-tooltip::after{
      content:'';position:absolute;bottom:-8px;right:20px;
      width:0;height:0;border-left:8px solid transparent;
      border-right:8px solid transparent;border-top:8px solid #fff;
    }
    .cb-welcome-tooltip.left::after{
      right:auto;left:20px;
    }
    
    .cb-starter-questions{
      padding:16px;border-bottom:1px solid var(--cb-gray-200);
      background:#f0f9ff !important;
      border:2px solid #3b82f6 !important;
      display:block !important;
      flex:1;overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      max-height:calc(100vh - 300px);
    }
    .cb-starter-title{
      font-size:14px;font-weight:600;color:var(--cb-gray-700);
      margin-bottom:12px;
    }
    .cb-starter-grid{
      display:grid;grid-template-columns:1fr 1fr;gap:8px;
      flex:1;overflow-y:auto;
      -webkit-overflow-scrolling:touch;
    }
    .cb-starter-question{
      background:#fff;border:1px solid var(--cb-gray-300);
      border-radius:8px;padding:8px 12px;font-size:13px;
      color:var(--cb-gray-700);cursor:pointer;transition:all 0.2s ease;
      text-align:left;word-wrap:break-word;
      min-height:40px;display:flex;align-items:center;
    }
    .cb-starter-question:hover{
      background:var(--cb-primary);color:#fff;border-color:var(--cb-primary);
    }
    .cb-starter-question:active{
      transform:scale(0.98);
    }
    .cb-floating-button:hover{
      transform:scale(1.1);
      box-shadow:var(--cb-shadow-xl),0 0 0 8px rgba(59,130,246,0.1);
    }
    .cb-floating-button:active{transform:scale(0.95)}
    
    .cb-panel{
      position:fixed;bottom:96px;right:24px;z-index:2147483000;
      width:400px;height:600px;max-height:80vh;min-height:500px;
      background:#fff;color:var(--cb-gray-800);
      border-radius:20px;box-shadow:var(--cb-shadow-xl);
      display:none;flex-direction:column;overflow:hidden;
      border:1px solid var(--cb-gray-200);
    }
    .cb-panel-content{
      flex:1;display:flex;flex-direction:column;min-height:0;
    }
    .cb-panel.open{
      display:flex;
    }
    
    .cb-floating-button.left{left:24px;right:auto}
    .cb-panel.left{bottom:96px;left:24px;right:auto}
    
    .cb-header{
      padding:20px 24px;background:var(--cb-primary);
      color:#fff;display:flex;align-items:center;justify-content:space-between;
      border-radius:20px 20px 0 0;
    }
    .cb-brand{display:flex;align-items:center;gap:12px}
    .cb-brand-info{display:flex;flex-direction:column;gap:2px}
    .cb-avatar{
      width:40px;height:40px;border-radius:50%;
      object-fit:cover;background:#fff;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);
      border:3px solid rgba(255,255,255,0.2);
    }
    .cb-title{font-weight:700;font-size:18px;line-height:1.2}
    .cb-subheading{font-size:13px;opacity:0.9;font-weight:400;line-height:1.2}
    .cb-close{
      background:rgba(255,255,255,0.1);border:0;color:#fff;
      cursor:pointer;font-size:20px;width:32px;height:32px;
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      transition:all 0.2s ease;
    }
    .cb-close:hover{background:rgba(255,255,255,0.2);transform:scale(1.1)}
    
    .cb-section{
      padding:24px;background:var(--cb-gray-50);
      border-bottom:1px solid var(--cb-gray-200);
    }
    .cb-section h2{
      margin:0 0 8px;font-size:20px;line-height:1.3;
      text-align:center;color:var(--cb-gray-800);
    }
    .cb-note{
      font-size:14px;color:var(--cb-gray-500);
      text-align:center;margin:0 0 16px;line-height:1.5;
    }
    .cb-form{
      display:flex;flex-direction:column;gap:16px;
      align-items:stretch;min-height:200px;
      flex:1;overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      padding-right:8px;max-height:calc(100vh - 300px);
    }
    .cb-form input,.cb-form textarea{
      padding:12px 16px;border:2px solid var(--cb-primary);
      border-radius:12px;font-size:14px;width:100%;
      box-sizing:border-box;transition:all 0.2s ease;
      background:#fff;
      flex-shrink:0;
    }
    .cb-form input:focus,.cb-form textarea:focus{
      outline:none;border-color:var(--cb-primary);
      box-shadow:0 0 0 3px rgba(59,130,246,0.1);
    }
    .cb-btn{
      background:var(--cb-primary);
      color:#fff;border:none;border-radius:12px;
      padding:12px 24px;cursor:pointer;align-self:center;
      margin-top:auto;font-weight:600;font-size:14px;
      transition:all 0.2s ease;box-shadow:var(--cb-shadow);
    }
    .cb-btn:hover{
      transform:translateY(-1px);box-shadow:var(--cb-shadow-md);
    }
    .cb-btn:active{transform:translateY(0)}
    .cb-btn:disabled{
      opacity:0.6;cursor:not-allowed;transform:none;
    }
    
    .cb-status{
      font-size:13px;margin-top:8px;padding:8px 12px;
      border-radius:8px;text-align:center;font-weight:500;
    }
    .cb-status.error{
      color:#DC2626;background:#FEF2F2;border:1px solid #FECACA;
    }
    .cb-status.ok{
      color:#059669;background:#ECFDF5;border:1px solid #A7F3D0;
    }
    
    .cb-chat{
      display:flex;flex-direction:column;flex:1;min-height:0;
    }
    .cb-messages{
      flex:1;min-height:0;overflow-y:auto;
      -webkit-overflow-scrolling:touch;padding:20px;
      background:var(--cb-gray-50);
    }
    .cb-message{
      margin:12px 0;line-height:1.5;font-size:14px;
    }
    .cb-message.user{
      background:var(--cb-primary);
      color:#fff;margin-left:20%;padding:12px 16px;
      border-radius:18px 18px 4px 18px;
      box-shadow:var(--cb-shadow);
    }
    .cb-message.assistant{
      margin-right:20%;display:flex;gap:12px;align-items:flex-start;
    }
    .cb-message.assistant .cb-msg-avatar{
      width:32px;height:32px;border-radius:50%;
      object-fit:cover;flex:0 0 auto;
      border:2px solid var(--cb-gray-200);
      box-shadow:var(--cb-shadow-sm);
      margin-top:4px;
    }
    .cb-message.assistant .cb-msg-text{
      flex:1;background:#fff;padding:12px 16px;
      border-radius:18px 18px 18px 4px;
      box-shadow:var(--cb-shadow);border:1px solid var(--cb-primary);
      margin-top:4px;
    }
    .cb-message a,.cb-message.assistant .cb-msg-text a{
      color:var(--cb-primary);
      text-decoration:underline;
      cursor:pointer;
      word-break:break-all;
    }
    .cb-message a:hover,.cb-message.assistant .cb-msg-text a:hover{
      color:var(--cb-primary-dark);
      text-decoration:underline;
    }
    
    .cb-input{
      display:flex;gap:12px;padding:20px;
      border-top:1px solid var(--cb-gray-200);
      background:#fff;flex-shrink:0;
    }
    .cb-input input{
      flex:1;padding:12px 16px;border:2px solid var(--cb-primary);
      border-radius:24px;font-size:14px;background:#fff;
      transition:all 0.2s ease;
    }
    .cb-input input:focus{
      outline:none;border-color:var(--cb-primary);
      box-shadow:0 0 0 3px rgba(59,130,246,0.1);
    }
    .cb-input button{
      background:var(--cb-primary);
      color:#fff;border:none;border-radius:50%;
      width:44px;height:44px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.2s ease;box-shadow:var(--cb-shadow);
      position:relative;
    }
    .cb-input button svg{
      width:24px;height:24px;fill:currentColor;
    }
    .cb-input button:hover{
      transform:scale(1.05);box-shadow:var(--cb-shadow-md);
    }
    .cb-input button:active{transform:scale(0.95)}
    
    .cb-branding{
      padding:12px 20px;font-size:12px;color:var(--cb-gray-400);
      text-align:center;border-top:1px solid var(--cb-gray-200);
      background:var(--cb-gray-50);font-weight:500;
      flex-shrink:0;z-index:10;position:relative;
    }
    
    @media (max-width:480px){
      .cb-panel{width:calc(100vw - 48px);right:24px;left:24px}
      .cb-panel.left{left:24px;right:24px}
      .cb-message.user{margin-left:10%}
      .cb-message.assistant{margin-right:10%}
      .cb-starter-grid{grid-template-columns:1fr;gap:12px}
      .cb-questions-container{grid-template-columns:1fr;gap:12px}
      .cb-form{max-height:calc(100vh - 250px)}
      .cb-starter-questions{max-height:calc(100vh - 250px)}
    }
  `; }  
  function createRoot(){ let existing=document.getElementById(WIDGET_ID); if(existing) return existing; const r=document.createElement('div'); r.id=WIDGET_ID; document.body.appendChild(r); return r; }
  function ChatbotWidget(opts){
    const inferredBase=(()=>{ try{ const cur=document.currentScript||Array.from(document.scripts||[]).find(s=>/chatbot-widget\.v2\.js(\?|$)/.test(s.src)); if(cur){ const dataBase=cur.getAttribute('data-api-base')||(cur.dataset?cur.dataset.apiBase:''); if(dataBase) return dataBase; if(window.ChatbotWidgetApiBase) return String(window.ChatbotWidgetApiBase); if(cur.src){ const u=new URL(cur.src,window.location.href); return u.origin+'/'; } } }catch(_){ } return (window.location&&window.location.origin?window.location.origin:'')+'/'; })();
    const cfg=Object.assign({apiBase: inferredBase, title:'ChatBot'}, opts||{}); if(typeof cfg.apiBase==='string'){ if(!cfg.apiBase.endsWith('/')) cfg.apiBase+='/'; } else { cfg.apiBase=inferredBase; }
    function el(t,c,tx){ const e=document.createElement(t); if(c) e.className=c; if(tx) e.textContent=tx; return e; }
    const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,'+
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7a5cff"/><stop offset="100%" stop-color="#4ea1ff"/></linearGradient></defs><rect rx="14" ry="14" width="64" height="64" fill="url(#g)"/><circle cx="22" cy="28" r="6" fill="#fff"/><circle cx="42" cy="28" r="6" fill="#fff"/><rect x="20" y="42" width="24" height="6" rx="3" fill="#fff" opacity=".9"/></svg>');
    function getClientId(){ try{ const k='chat_client_id'; let id=localStorage.getItem(k); if(!id){ id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'anon-'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem(k,id);} return id; } catch(_){ return 'anon-'+Math.random().toString(36).slice(2)+Date.now().toString(36);} }
    function joinUrl(base,path){ if(!base) return path; if(!base.endsWith('/')) base+='/'; return base + String(path).replace(/^\/+/, ''); }
    async function api(path,options){
      const o=Object.assign({},options||{}); o.headers=Object.assign({},o.headers||{'X-Client-Id':getClientId()});
      const url=joinUrl(cfg.apiBase, path);
      const res=await fetch(url, Object.assign({mode:'cors'},o));
      if(res.ok) return res.status===204? null : await res.json();
      // Single /api fallback if 404 and not already using /api
      if(res.status===404 && !/\/api\//.test(url)){ const apiUrl=url.replace(/(https?:\/\/[^/]+)(\/.*)?/, (m,origin,rest)=> origin + '/api' + (rest||'')); const r2=await fetch(apiUrl,Object.assign({mode:'cors'},o)); if(r2.ok) return r2.status===204? null : await r2.json(); }
      throw new Error((await res.text().catch(()=>''))||('HTTP '+res.status));
    }
    function linkifyText(text){
      if(!text || typeof text!=='string') return null;
      const urlRegex=/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)|(www\.[^\s<>"{}|\\^`\[\]]+)/gi;
      const parts=[];
      let lastIndex=0;
      let match;
      const textStr=String(text);
      while((match=urlRegex.exec(textStr))!==null){
        if(match.index>lastIndex) parts.push({type:'text',content:textStr.substring(lastIndex,match.index)});
        let url=match[0];
        let displayText=url;
        const trailingPunct=/[.,!?;:]+$/.exec(url);
        if(trailingPunct){
          url=url.substring(0,url.length-trailingPunct[0].length);
          displayText=url;
        }
        if(!url.match(/^https?:\/\//i)) url='https://'+url;
        try{
          new URL(url);
          parts.push({type:'link',url:url,text:displayText,trailing:trailingPunct?trailingPunct[0]:''});
        }catch(e){
          parts.push({type:'text',content:match[0]});
        }
        lastIndex=match.index+match[0].length;
      }
      if(lastIndex<textStr.length) parts.push({type:'text',content:textStr.substring(lastIndex)});
      if(parts.length===0) return null;
      const frag=document.createDocumentFragment();
      parts.forEach(p=>{
        if(p.type==='link'){
          const a=document.createElement('a');
          a.href=p.url;
          a.textContent=p.text;
          a.target='_blank';
          a.rel='noopener noreferrer';
          a.style.color='var(--cb-primary)';
          a.style.textDecoration='underline';
          a.style.cursor='pointer';
          frag.appendChild(a);
          if(p.trailing) frag.appendChild(document.createTextNode(p.trailing));
        }else{
          frag.appendChild(document.createTextNode(p.content));
        }
      });
      return frag;
    }
    function addMessage(role,content){
      if(!content) content='';
      const contentStr=String(content);
      if(role==='assistant'){
        const m=el('div','cb-message assistant');
        const av=document.createElement('img'); av.className='cb-msg-avatar'; av.src=botAvatarUrl||DEFAULT_AVATAR; av.alt='';
        const t=el('div','cb-msg-text');
        const linked=linkifyText(contentStr);
        if(linked && linked.nodeType===11) t.appendChild(linked); else t.textContent=contentStr;
        m.appendChild(av); m.appendChild(t);
        messages.appendChild(m);
      } else {
        const m=el('div','cb-message '+role);
        const linked=linkifyText(contentStr);
        if(linked && linked.nodeType===11) m.appendChild(linked); else m.textContent=contentStr;
        messages.appendChild(m);
      }
      messages.scrollTop=messages.scrollHeight;
    }
    async function loadMessages(){ 
      console.log('Loading messages...');
      const clientId = getClientId();
      console.log('Using client ID:', clientId);
      messages.innerHTML=''; 
      try{ 
        const data=await api('messages'); 
        console.log('Loaded messages data:', data);
        if(data && data.messages && Array.isArray(data.messages)) {
          console.log('Found', data.messages.length, 'messages');
          data.messages.forEach((m, index) => {
            console.log(`Message ${index + 1}:`, m.role, m.content);
            addMessage(m.role, m.content);
          });
        } else {
          console.log('No messages found or invalid data structure');
        }
      }catch(e){ 
        console.error('Failed to load messages:', e);
      }
    }
    // Inflight control helpers (declared here for access)
    let inflightCtrl=null; let isSending=false; let typingNode=null; let typingTimer=null;
    function setSendingMode(active){ isSending=!!active; if(typeof input!=='undefined') input.disabled=isSending; if(typeof send!=='undefined'){ send.textContent=isSending?'⏹':'➤'; send.title=isSending?'Stop':'Send'; } }
    function startTyping(){
      stopTyping();
  typingNode=el('div','cb-message assistant');
  { const av=document.createElement('img'); av.className='cb-msg-avatar'; av.src=botAvatarUrl||DEFAULT_AVATAR; av.alt=''; typingNode.appendChild(av); }
      const bubble=el('div','cb-msg-text','…');
      typingNode.appendChild(bubble);
      messages.appendChild(typingNode);
      messages.scrollTop=messages.scrollHeight;
      let dots=1; typingTimer=setInterval(()=>{ if(!typingNode) return; dots=(dots%3)+1; bubble.textContent=''.padStart(dots,'.'); },400);
    }
  function stopTyping(){ if(typingTimer){ clearInterval(typingTimer); typingTimer=null; } if(typingNode&&typingNode.parentNode){ typingNode.parentNode.removeChild(typingNode);} typingNode=null; }
  function abortRequest(){ if(inflightCtrl){ inflightCtrl.abort(); } }
    async function sendMessage(){
      const text=input.value.trim(); if(!text) return;
      addMessage('user',text); input.value=''; setSendingMode(true); inflightCtrl=new AbortController(); startTyping();
      try{
        const data=await api('chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,client_id:getClientId()}), signal: inflightCtrl.signal});
        stopTyping(); addMessage('assistant',(data.used_faq?'📚 ':'')+data.reply);
      }catch(e){ 
        stopTyping(); 
        if(e && (e.name==='AbortError' || /aborted/i.test(String(e)))){ 
          addMessage('assistant','(stopped)'); 
        } else { 
          // Use custom server error message if available
          const errorMsg = (window.messagingConfig && window.messagingConfig.server_error_message) 
            ? window.messagingConfig.server_error_message 
            : 'Error: '+(e&&e.message?e.message:'Failed to reach API');
          addMessage('assistant', errorMsg); 
        } 
      }
      finally { setSendingMode(false); inflightCtrl=null; }
    }
    // DOM
    const root=createRoot(); root.innerHTML='';
    const btn=el('button','cb-floating-button','💬');
    const panel=el('div','cb-panel');
  const header=el('div','cb-header');
  const brand=el('div','cb-brand'); const avatarImg=document.createElement('img'); avatarImg.className='cb-avatar'; avatarImg.style.display='inline-block'; avatarImg.src=DEFAULT_AVATAR; avatarImg.onerror=()=>{avatarImg.src=DEFAULT_AVATAR;}; const brandInfo=el('div','cb-brand-info'); const title=el('div','cb-title',cfg.title); brandInfo.appendChild(title); brand.appendChild(avatarImg); brand.appendChild(brandInfo); const close=el('button','cb-close','×'); header.appendChild(brand); header.appendChild(close); panel.appendChild(header);
    // User form screen (shown first)
    const formScreen=el('div','cb-form-screen');
    formScreen.style.cssText=`
      display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
      padding:20px;text-align:center;flex:1;min-height:0;
      overflow-y:auto;-webkit-overflow-scrolling:touch;
    `;
    
    // Starter questions screen (shown after form)
    const starterScreen=el('div','cb-starter-screen');
    starterScreen.style.cssText=`
      display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
      padding:20px;text-align:center;flex:1;min-height:0;
      overflow-y:auto;-webkit-overflow-scrolling:touch;
    `;
  
  // Chat wrapper (shown after question selection)
  const chatWrapper=el('div','cb-chat'); 
  chatWrapper.style.display='none'; // Hidden initially
  const messages=el('div','cb-messages'); 
  const inputBar=el('div','cb-input'); 
  const input=document.createElement('input'); 
  input.placeholder='Type your message...'; 
  const send=el('button',null,''); 
  const sendIcon=document.createElementNS('http://www.w3.org/2000/svg','svg'); 
  sendIcon.setAttribute('viewBox','0 0 24 24'); 
  sendIcon.innerHTML='<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>'; 
  send.appendChild(sendIcon); 
  inputBar.appendChild(input); 
  inputBar.appendChild(send); 
  chatWrapper.appendChild(messages); 
  chatWrapper.appendChild(inputBar); 
  
    panel.appendChild(formScreen);
    panel.appendChild(starterScreen);
    panel.appendChild(chatWrapper);
    root.appendChild(btn); root.appendChild(panel);
  // Form removed - always show chat
  
  function showWelcomeMessage() {
    console.log('showWelcomeMessage called', window.messagingConfig);
    if(!window.messagingConfig || !window.messagingConfig.show_welcome) {
      console.log('Welcome message disabled or no config');
      return;
    }
    
    // Remove existing tooltip if any
    const existingTooltip = document.querySelector('.cb-welcome-tooltip');
    if(existingTooltip) {
      existingTooltip.remove();
    }
    
    const welcomeMsg = window.messagingConfig.welcome_message || "Hey there, how can I help you?";
    const tooltip = el('div', 'cb-welcome-tooltip');
    tooltip.textContent = welcomeMsg;
    
    // Position tooltip based on widget position
    const isLeft = btn.classList.contains('left');
    if(isLeft) {
      tooltip.classList.add('left');
    }
    
    document.body.appendChild(tooltip);
    
    // Show tooltip immediately with animation
    tooltip.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      if(tooltip && tooltip.parentNode) {
        tooltip.classList.remove('show');
        setTimeout(() => {
          if(tooltip && tooltip.parentNode) {
            tooltip.remove();
          }
        }, 200); // Reduced animation time
      }
    }, 4000);
  }
  
  function showUserFormScreen() {
    console.log('=== SHOWING USER FORM SCREEN ===');
    console.log('window.widgetConfig:', window.widgetConfig);
    console.log('localStorage chatbot_form_submitted:', localStorage.getItem('chatbot_form_submitted'));
    
    // Check if user has already submitted form
    const hasSubmittedForm = localStorage.getItem('chatbot_form_submitted');
    if(hasSubmittedForm === 'true') {
      console.log('User has already submitted form, checking starter questions');
      showStarterQuestionsScreen();
      return;
    }
    
    // Check if form is enabled
    if(!window.widgetConfig || !window.widgetConfig.form_enabled) {
      console.log('Form not enabled, checking starter questions');
      console.log('widgetConfig form_enabled:', window.widgetConfig?.form_enabled);
      showStarterQuestionsScreen();
      return;
    }
    
    // Clear form screen
    formScreen.innerHTML = '';
    
    // Get form fields
    const fields = window.widgetConfig.fields || [];
    if(fields.length === 0) {
      console.log('No form fields, checking starter questions');
      showStarterQuestionsScreen();
      return;
    }
    
    // Create title
    const title = el('div', 'cb-form-title');
    title.textContent = 'Let\'s get started!';
    title.style.cssText = `
      font-size: 24px; font-weight: 700; color: var(--cb-gray-800);
      margin-bottom: 8px;
    `;
    
    // Create subtitle
    const subtitle = el('div', 'cb-form-subtitle');
    subtitle.textContent = 'Please fill out this quick form to continue';
    subtitle.style.cssText = `
      font-size: 16px; color: var(--cb-gray-600);
      margin-bottom: 32px;
    `;
    
    // Create form
    const form = el('form', 'cb-user-form');
    form.style.cssText = `
      display: flex; flex-direction: column; gap: 20px;
      width: 100%; max-width: 400px; text-align: left;
      flex-shrink: 0;
    `;
    
    // Create form fields
    fields.forEach((field, index) => {
      const fieldContainer = el('div', 'cb-form-field');
      fieldContainer.style.cssText = `
        display: flex; flex-direction: column; gap: 8px;
      `;
      
      // Label
      const label = el('label', 'cb-form-label');
      label.textContent = field.label;
      if(field.required) {
        label.textContent += ' *';
      }
      label.style.cssText = `
        font-size: 14px; font-weight: 600; color: var(--cb-gray-700);
      `;
      
      // Input
      const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
      input.type = field.type === 'textarea' ? 'text' : field.type;
      input.name = field.name;
      input.placeholder = field.placeholder || '';
      input.required = field.required;
      input.style.cssText = `
        padding: 12px 16px; border: 2px solid var(--cb-gray-300);
        border-radius: 8px; font-size: 14px; color: var(--cb-gray-800);
        background: #fff; transition: border-color 0.2s ease;
        font-family: inherit;
      `;
      
      if(field.type === 'textarea') {
        input.rows = 3;
        input.style.resize = 'vertical';
      }
      
      // Focus effects
      input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--cb-primary)';
        input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      });
      
      input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--cb-gray-300)';
        input.style.boxShadow = 'none';
      });
      
      fieldContainer.appendChild(label);
      fieldContainer.appendChild(input);
      form.appendChild(fieldContainer);
    });
    
    // Submit button
    const submitBtn = el('button', 'cb-form-submit');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Continue';
    submitBtn.style.cssText = `
      padding: 14px 24px; background: var(--cb-primary);
      color: #fff; border: none; border-radius: 8px;
      font-size: 16px; font-weight: 600; cursor: pointer;
      transition: all 0.2s ease; margin-top: 8px;
    `;
    
    // Hover effects
    submitBtn.addEventListener('mouseenter', () => {
      submitBtn.style.background = 'var(--cb-primary-dark)';
      submitBtn.style.transform = 'translateY(-1px)';
      submitBtn.style.boxShadow = 'var(--cb-shadow-md)';
    });
    
    submitBtn.addEventListener('mouseleave', () => {
      submitBtn.style.background = 'var(--cb-primary)';
      submitBtn.style.transform = 'translateY(0)';
      submitBtn.style.boxShadow = 'none';
    });
    
    form.appendChild(submitBtn);
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Form submitted');
      
      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        // Collect form data
        const formData = new FormData(form);
        const data = {};
        fields.forEach(field => {
          data[field.name] = formData.get(field.name) || '';
        });
        
        console.log('Submitting form data:', data);
        
        // Submit form with timeout
        console.log('Calling API with data:', data);
        const submitPromise = api('form/submit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Client-ID': getClientId()
          },
          body: JSON.stringify(data)
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Form submission timeout')), 5000)
        );
        
        const response = await Promise.race([submitPromise, timeoutPromise]);
        
        console.log('API response:', response);
        console.log('Form submitted successfully');
        
        // Mark form as submitted
        localStorage.setItem('chatbot_form_submitted', 'true');
        
        // Show starter questions
        console.log('Form submitted, showing starter questions screen');
        
        // Reset form button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
        
        showStarterQuestionsScreen();
        
      } catch (error) {
        console.error('Form submission failed:', error);
        
        // Show error message
        const errorMsg = el('div', 'cb-form-error');
        errorMsg.textContent = 'Error submitting form. Please try again.';
        errorMsg.style.cssText = `
          color: #dc2626; background: #fef2f2; border: 1px solid #fecaca;
          padding: 12px; border-radius: 8px; margin-top: 16px;
          font-size: 14px; text-align: center;
        `;
        form.appendChild(errorMsg);
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
        
        // Remove error message after 3 seconds
        setTimeout(() => {
          if(errorMsg.parentNode) {
            errorMsg.remove();
          }
        }, 3000);
      }
    });
    
    // Assemble the screen
    formScreen.appendChild(title);
    formScreen.appendChild(subtitle);
    formScreen.appendChild(form);
    
    // Show form screen, hide others
    formScreen.style.display = 'flex';
    starterScreen.style.display = 'none';
    chatWrapper.style.display = 'none';
    
    console.log('User form screen created and shown');
  }
  
  function showStarterQuestionsScreen() {
    console.log('=== SHOWING STARTER QUESTIONS SCREEN ===');
    console.log('Starter questions data:', window.starterQuestions);
    console.log('starterQuestions enabled:', window.starterQuestions?.enabled);
    
    // Check if user has already seen starter questions
    const hasSeenStarterQuestions = localStorage.getItem('chatbot_starter_seen');
    console.log('hasSeenStarterQuestions:', hasSeenStarterQuestions);
    if(hasSeenStarterQuestions === 'true') {
      console.log('User has already seen starter questions, showing chat directly');
      showChatScreen();
      return;
    }
    
    // Clear starter screen
    starterScreen.innerHTML = '';
    
    // Check if we have starter questions
    if(!window.starterQuestions || !window.starterQuestions.enabled) {
      console.log('No starter questions or disabled, showing chat directly');
      console.log('starterQuestions exists:', !!window.starterQuestions);
      console.log('starterQuestions enabled:', window.starterQuestions?.enabled);
      console.log('Calling showChatScreen()...');
      
      // Show chat screen immediately
      showChatScreen();
      return;
    }
    
    // Get questions from the dynamic array
    const questions = (window.starterQuestions.questions || []).filter(q => q && q.trim());
    
    console.log('Questions to show:', questions);
    
    if(questions.length === 0) {
      console.log('No questions, showing chat directly');
      showChatScreen();
      return;
    }
    
    // Create title
    const title = el('div', 'cb-starter-title');
    title.textContent = 'How can I help you today?';
    title.style.cssText = `
      font-size: 24px; font-weight: 700; color: var(--cb-gray-800);
      margin-bottom: 8px;
    `;
    
    // Create subtitle
    const subtitle = el('div', 'cb-starter-subtitle');
    subtitle.textContent = 'Choose a question to get started:';
    subtitle.style.cssText = `
      font-size: 16px; color: var(--cb-gray-600);
      margin-bottom: 32px;
    `;
    
    // Create questions container
    const questionsContainer = el('div', 'cb-questions-container');
    questionsContainer.style.cssText = `
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      width: 100%; max-width: 500px; flex-shrink: 0;
      flex: 1; overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-right: 8px;
    `;
    
    // Create question buttons
    questions.forEach((question, index) => {
      const btn = el('button', 'cb-question-btn');
      btn.textContent = question;
      btn.style.cssText = `
        padding: 16px 20px; background: #fff; border: 2px solid var(--cb-primary);
        border-radius: 12px; cursor: pointer; text-align: left;
        font-size: 14px; color: var(--cb-gray-700); transition: all 0.2s ease;
        box-shadow: var(--cb-shadow-sm); min-height: 60px;
        display: flex; align-items: center; justify-content: center;
      `;
      
      // Simple hover effects (no transform)
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--cb-primary)';
        btn.style.color = '#fff';
        btn.style.boxShadow = 'var(--cb-shadow-md)';
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#fff';
        btn.style.color = 'var(--cb-gray-700)';
        btn.style.boxShadow = 'var(--cb-shadow-sm)';
      });
      
      // Click handler
      btn.addEventListener('click', () => {
        console.log('Question clicked:', question);
        // Mark that user has seen starter questions
        localStorage.setItem('chatbot_starter_seen', 'true');
        // Send question and show chat
        sendQuestionAndShowChat(question);
      });
      
      questionsContainer.appendChild(btn);
    });
    
    // Add skip button
    const skipBtn = el('button', 'cb-skip-btn');
    skipBtn.textContent = 'Skip and start chatting';
    skipBtn.style.cssText = `
      margin-top: 24px; padding: 12px 24px; background: transparent;
      border: 1px solid var(--cb-gray-300); border-radius: 8px;
      cursor: pointer; font-size: 14px; color: var(--cb-gray-600);
      transition: all 0.2s ease;
    `;
    
    skipBtn.addEventListener('click', () => {
      console.log('Skip clicked, showing chat');
      // Mark that user has seen starter questions
      localStorage.setItem('chatbot_starter_seen', 'true');
      showChatScreen();
    });
    
    // Assemble the screen
    starterScreen.appendChild(title);
    starterScreen.appendChild(subtitle);
    starterScreen.appendChild(questionsContainer);
    starterScreen.appendChild(skipBtn);
    
    // Show starter screen, hide others (no animation)
    formScreen.style.display = 'none';
    starterScreen.style.display = 'flex';
    starterScreen.style.opacity = '1';
    starterScreen.style.transform = 'none';
    starterScreen.style.visibility = 'visible';
    chatWrapper.style.display = 'none';
    
    console.log('Starter questions screen created and shown');
    console.log('starterScreen display:', starterScreen.style.display);
    console.log('starterScreen computed display:', window.getComputedStyle(starterScreen).display);
  }
  
  function showChatScreen() {
    console.log('=== SHOWING CHAT SCREEN ===');
    console.log('formScreen display:', formScreen.style.display);
    console.log('starterScreen display:', starterScreen.style.display);
    console.log('chatWrapper display before:', chatWrapper.style.display);
    
    // Load messages first
    loadMessages().catch(e => console.error('Failed to load messages:', e));
    
    // Instant transition (no animation)
    formScreen.style.display = 'none';
    starterScreen.style.display = 'none';
    chatWrapper.style.display = 'flex';
    chatWrapper.style.opacity = '1';
    chatWrapper.style.transform = 'none';
    
    // Force visibility
    chatWrapper.style.visibility = 'visible';
    chatWrapper.style.position = 'relative';
    
    console.log('chatWrapper display after:', chatWrapper.style.display);
    console.log('chatWrapper computed style:', window.getComputedStyle(chatWrapper).display);
    console.log('chatWrapper visibility:', window.getComputedStyle(chatWrapper).visibility);
  }
  
  function sendQuestionAndShowChat(question) {
    console.log('Sending question and showing chat:', question);
    
    // Show chat screen first
    showChatScreen();
    
    // Add user message
    addMessage('user', question);
    
    // Send to bot
    setSendingMode(true);
    inflightCtrl = new AbortController();
    startTyping();
    
    api('chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, client_id: getClientId() }),
      signal: inflightCtrl.signal
    }).then(data => {
      stopTyping();
      addMessage('assistant', (data.used_faq ? '📚 ' : '') + data.reply);
    }).catch(e => {
      stopTyping();
      const errorMsg = (window.messagingConfig && window.messagingConfig.server_error_message)
        ? window.messagingConfig.server_error_message
        : 'Error: ' + (e && e.message ? e.message : 'Failed to reach API');
      addMessage('assistant', errorMsg);
    }).finally(() => {
      setSendingMode(false);
    });
  }
  // Form functions removed
  async function refreshConfig(){ 
    try{ 
      const wc=await api('widget-config'); 
      if(!wc) return;
      
      // Set global widget config
      window.widgetConfig = wc;
      console.log('Widget config loaded:', wc);
      
      // Load messaging configuration
      let messagingConfig = null;
      try {
        messagingConfig = await api('messaging-config');
        window.messagingConfig = messagingConfig;
      } catch (e) {
        console.warn('Failed to load messaging config:', e);
      }
      
      // Load starter questions configuration
      let starterQuestions = null;
      try {
        starterQuestions = await api('starter-questions');
        window.starterQuestions = starterQuestions;
        console.log('Loaded starter questions:', starterQuestions);
      } catch (e) {
        console.warn('Failed to load starter questions:', e);
      } 
      
      // Update primary color
      if(wc.primary_color){ 
        try{ root.style.setProperty('--cb-primary', wc.primary_color); }catch(_){} 
      } 
      
      // Update avatar
      if(wc.avatar_url){ 
        let url=wc.avatar_url; 
        if(/^\//.test(url) || !/^https?:/i.test(url)){ 
          url=joinUrl(cfg.apiBase, url); 
        } 
        // preload & verify
        try{ 
          const test=new Image(); 
          test.crossOrigin='anonymous'; 
          await new Promise((resolve,reject)=>{ test.onload=resolve; test.onerror=reject; test.src=url; }); 
          botAvatarUrl=url; 
          avatarImg.src=url; 
        }catch(e){ 
          botAvatarUrl=''; 
          avatarImg.src=DEFAULT_AVATAR; 
          try{ console.warn('[ChatbotWidget] Avatar failed to load:', url); }catch(_){} 
        } 
      } else { 
        botAvatarUrl=''; 
        avatarImg.src=DEFAULT_AVATAR; 
      } 
      
      // Update bot name
      if(wc.bot_name){ 
        title.textContent=wc.bot_name; 
      } 
      
      // Update widget icon
      if(wc.widget_icon){ 
        btn.textContent=wc.widget_icon; 
      }
      
      // Update widget position
      if(wc.widget_position){ 
        const isLeft = wc.widget_position === 'left';
        if(isLeft){
          btn.classList.add('left');
          panel.classList.add('left');
        } else {
          btn.classList.remove('left');
          panel.classList.remove('left');
        }
      }
      
      // Update subheading
      if(wc.subheading){ 
        // Add subheading to brandInfo if it doesn't exist
        let subheadingEl = header.querySelector('.cb-subheading');
        if(!subheadingEl){
          subheadingEl = el('div', 'cb-subheading');
          brandInfo.appendChild(subheadingEl);
        }
        subheadingEl.textContent = wc.subheading;
      }
      
      // Update input placeholder
      if(wc.input_placeholder){ 
        input.placeholder = wc.input_placeholder; 
      }
      
      
      // Update branding visibility
      if(wc.show_branding !== undefined){ 
        // Add branding element if it doesn't exist
        let brandingEl = panel.querySelector('.cb-branding');
        if(!brandingEl && wc.show_branding){
          brandingEl = el('div', 'cb-branding');
          brandingEl.style.padding = '8px 12px';
          brandingEl.style.fontSize = '11px';
          brandingEl.style.color = '#6c757d';
          brandingEl.style.textAlign = 'center';
          brandingEl.style.borderTop = '1px solid #e9ecef';
          brandingEl.style.background = '#f8f9fa';
          brandingEl.textContent = 'Powered by DiPietro & Associates';
          panel.appendChild(brandingEl);
        }
        if(brandingEl){
          brandingEl.style.display = wc.show_branding ? 'block' : 'none';
        }
      }
      
      // Update open by default
      if(wc.open_by_default){ 
        panel.classList.add('open'); 
        startPoll(); 
      }
      
      // Store messaging config for later use
      if(messagingConfig) {
        console.log('Storing messaging config:', messagingConfig);
        window.messagingConfig = messagingConfig;
        
        // Show welcome tooltip on initial load if enabled
        if(messagingConfig.show_welcome && !panel.classList.contains('open')) {
          console.log('Scheduling welcome message display');
          setTimeout(() => {
            showWelcomeMessage();
          }, 500); // Reduced delay for faster response
        }
      } else {
        console.log('No messaging config loaded');
      }
      
      // Store starter questions for later use
      if(starterQuestions) {
        console.log('Storing starter questions:', starterQuestions);
        window.starterQuestions = starterQuestions;
      } else {
        console.log('No starter questions loaded');
      }
      
      // Update starter questions (if implemented)
      if(wc.starter_questions !== undefined){ 
        // This would need additional implementation for starter questions
        // For now, we'll just store the setting
        console.log('Starter questions enabled:', wc.starter_questions);
      }
      
      // Form removed - always show chat 
    }catch(e){ 
      console.warn('[ChatbotWidget] Failed to refresh config:', e);
    } 
  }
  (async()=>{ await refreshConfig(); })();
    let poll=null; function startPoll(){ if(poll) return; poll=setInterval(refreshConfig,30000);} function stopPoll(){ if(poll){ clearInterval(poll); poll=null; }}
    btn.onclick=async()=>{ 
      const was=panel.classList.contains('open'); 
      if(!was){ 
        // Show panel immediately for better UX
        panel.classList.toggle('open'); 
        
        // Hide welcome tooltip immediately
        const existingTooltip = document.querySelector('.cb-welcome-tooltip');
        if(existingTooltip) {
          existingTooltip.classList.remove('show');
          existingTooltip.remove(); // Remove immediately instead of delayed
        }
        
        // Show user form screen immediately
        showUserFormScreen();
        
        // Refresh config in background (non-blocking)
        refreshConfig().catch(()=>{});
        
        startPoll();
      } else {
        panel.classList.toggle('open'); 
        stopPoll(); 
      }
    };
    
    // Show welcome tooltip on hover
    btn.addEventListener('mouseenter', () => {
      if(!panel.classList.contains('open') && window.messagingConfig && window.messagingConfig.show_welcome) {
        showWelcomeMessage();
      }
    });
    
    // Hide welcome tooltip when mouse leaves
    btn.addEventListener('mouseleave', () => {
      const existingTooltip = document.querySelector('.cb-welcome-tooltip');
      if(existingTooltip) {
        existingTooltip.classList.remove('show');
        setTimeout(() => {
          if(existingTooltip && existingTooltip.parentNode) {
            existingTooltip.remove();
          }
        }, 300);
      }
    });
    close.onclick=()=>{ panel.classList.remove('open'); stopPoll(); };
  try{ window.addEventListener('storage', e=>{ if(e && e.key==='widget_config_version'){ refreshConfig(); }}); }catch(_){ }
  send.onclick=()=>{ if(isSending){ abortRequest(); } else { sendMessage(); } };
  input.addEventListener('keydown',e=>{ if(e.key==='Enter' && !isSending) sendMessage(); if(e.key==='Escape' && isSending) abortRequest(); });
    // Form functions removed
    injectStyles(); loadMessages().catch(()=>{});
    return { 
        open:()=>{ panel.classList.add('open'); startPoll(); }, 
        close:()=>{ panel.classList.remove('open'); stopPoll(); },
        resetStarterQuestions:()=>{ localStorage.removeItem('chatbot_starter_seen'); console.log('Starter questions flag reset'); },
        resetForm:()=>{ localStorage.removeItem('chatbot_form_submitted'); console.log('Form submission flag reset'); },
        resetAll:()=>{ localStorage.removeItem('chatbot_form_submitted'); localStorage.removeItem('chatbot_starter_seen'); console.log('All flags reset'); },
        clearStorage:()=>{ localStorage.clear(); console.log('All localStorage cleared'); },
        testStarterQuestions:()=>{ 
          console.log('=== TESTING STARTER QUESTIONS ===');
          console.log('window.starterQuestions:', window.starterQuestions);
          console.log('starterScreen element:', starterScreen);
          console.log('starterScreen display:', starterScreen.style.display);
          console.log('starterScreen computed display:', window.getComputedStyle(starterScreen).display);
          showStarterQuestionsScreen();
        },
        debugFlow:()=>{ 
          console.log('=== DEBUG FLOW ===');
          console.log('widgetConfig:', window.widgetConfig);
          console.log('starterQuestions:', window.starterQuestions);
          console.log('formScreen display:', formScreen.style.display);
          console.log('starterScreen display:', starterScreen.style.display);
          console.log('chatWrapper display:', chatWrapper.style.display);
          console.log('localStorage form_submitted:', localStorage.getItem('chatbot_form_submitted'));
          console.log('localStorage starter_seen:', localStorage.getItem('chatbot_starter_seen'));
        },
        resetFormButton:()=>{
          const submitBtn = document.querySelector('.cb-form button[type="submit"]');
          if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continue';
            console.log('Form button reset');
          } else {
            console.log('Form button not found');
          }
        }
    };
  }
  window.createChatbotWidget=function(options){ injectStyles(); return new ChatbotWidget(options); };
})();
