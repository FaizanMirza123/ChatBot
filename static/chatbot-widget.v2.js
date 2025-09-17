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
      transform:translateY(20px) scale(0.95);
      opacity:0;
      transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .cb-panel.open{
      display:flex;transform:translateY(0) scale(1);opacity:1;
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
    }
    .cb-form input,.cb-form textarea{
      padding:12px 16px;border:2px solid var(--cb-primary);
      border-radius:12px;font-size:14px;width:100%;
      box-sizing:border-box;transition:all 0.2s ease;
      background:#fff;
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
      animation:messageSlideIn 0.3s ease-out;
    }
    @keyframes messageSlideIn{
      from{opacity:0;transform:translateY(10px)}
      to{opacity:1;transform:translateY(0)}
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
    }
    
    @media (max-width:480px){
      .cb-panel{width:calc(100vw - 48px);right:24px;left:24px}
      .cb-panel.left{left:24px;right:24px}
      .cb-message.user{margin-left:10%}
      .cb-message.assistant{margin-right:10%}
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
    function addMessage(role,content){
      if(role==='assistant'){
        const m=el('div','cb-message assistant');
        const av=document.createElement('img'); av.className='cb-msg-avatar'; av.src=botAvatarUrl||DEFAULT_AVATAR; av.alt='';
        const t=el('div','cb-msg-text',content);
        m.appendChild(av); m.appendChild(t);
        messages.appendChild(m);
      } else {
        const m=el('div','cb-message '+role,content);
        messages.appendChild(m);
      }
      messages.scrollTop=messages.scrollHeight;
    }
    async function loadMessages(){ messages.innerHTML=''; try{ const data=await api('messages'); (data&&data.messages||[]).forEach(m=>addMessage(m.role,m.content)); }catch(_){ }}
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
      if(currentFormEnabled && !leadSaved) return; const text=input.value.trim(); if(!text) return;
      addMessage('user',text); input.value=''; setSendingMode(true); inflightCtrl=new AbortController(); startTyping();
      try{
        const data=await api('chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,client_id:getClientId()}), signal: inflightCtrl.signal});
        stopTyping(); addMessage('assistant',(data.used_faq?'📚 ':'')+data.reply);
      }catch(e){ stopTyping(); if(e && (e.name==='AbortError' || /aborted/i.test(String(e)))){ addMessage('assistant','(stopped)'); } else { addMessage('assistant','Error: '+(e&&e.message?e.message:'Failed to reach API')); } }
      finally { setSendingMode(false); inflightCtrl=null; }
    }
    // DOM
    const root=createRoot(); root.innerHTML='';
    const btn=el('button','cb-floating-button','💬');
    const panel=el('div','cb-panel');
  const header=el('div','cb-header');
  const brand=el('div','cb-brand'); const avatarImg=document.createElement('img'); avatarImg.className='cb-avatar'; avatarImg.style.display='inline-block'; avatarImg.src=DEFAULT_AVATAR; avatarImg.onerror=()=>{avatarImg.src=DEFAULT_AVATAR;}; const brandInfo=el('div','cb-brand-info'); const title=el('div','cb-title',cfg.title); brandInfo.appendChild(title); brand.appendChild(avatarImg); brand.appendChild(brandInfo); const close=el('button','cb-close','×'); header.appendChild(brand); header.appendChild(close); panel.appendChild(header);
    // Form (gated + dynamic)
    const formSection=el('div','cb-section'); formSection.style.display='none';
  const formTitle=el('h2',null,'Visitor Info');
  const formNote=el('div','cb-note','Kindly Provide you Creds incase we break off in between the chat');
    const formRow=el('div','cb-form');
    const saveBtn=el('button','cb-btn','Save');
    const formStatus=el('div','cb-status');
  formSection.appendChild(formTitle); formSection.appendChild(formNote); formSection.appendChild(formRow); formRow.appendChild(saveBtn); formSection.appendChild(formStatus); panel.appendChild(formSection);
  let dynamicFields=[]; // fetched config fields
  let botAvatarUrl='';
    function rebuildFormFields(){
      // keep save button and status at end
      while(formRow.firstChild && formRow.firstChild!==saveBtn){ formRow.removeChild(formRow.firstChild); }
      const sorted=[...dynamicFields].sort((a,b)=> (a.order||0)-(b.order||0));
      sorted.forEach(f=>{
        const inputEl = (f.type==='textarea')? document.createElement('textarea'): document.createElement('input');
        if(f.type!=='textarea') inputEl.type = (f.type==='email'||f.type==='number')?f.type:'text';
        inputEl.placeholder = f.placeholder || f.label || f.name;
        inputEl.dataset.fieldName = f.name;
        // full-width handled by CSS
        formRow.insertBefore(inputEl, saveBtn);
      });
    }
  // Chat wrapper
  const chatWrapper=el('div','cb-chat'); const messages=el('div','cb-messages'); const inputBar=el('div','cb-input'); const input=document.createElement('input'); input.placeholder='Type your message...'; const send=el('button',null,''); const sendIcon=document.createElementNS('http://www.w3.org/2000/svg','svg'); sendIcon.setAttribute('viewBox','0 0 24 24'); sendIcon.innerHTML='<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>'; send.appendChild(sendIcon); inputBar.appendChild(input); inputBar.appendChild(send); chatWrapper.appendChild(messages); chatWrapper.appendChild(inputBar); panel.appendChild(chatWrapper);
    root.appendChild(btn); root.appendChild(panel);
  let currentFormEnabled=null; let leadSaved=false;
    // Visibility logic:
    // 1. Form feature disabled => show chat only.
    // 2. Enabled & not saved => show form only (gate chat).
    // 3. Enabled & saved => hide form (no re-submit) show chat.
    function updateVisibility(){
      if(currentFormEnabled){
        if(leadSaved){
          formSection.style.display='none';
          chatWrapper.style.display='flex';
          saveBtn.disabled=true;
        } else {
          formSection.style.display='block';
          chatWrapper.style.display='none';
          saveBtn.disabled=false;
        }
      } else {
        formSection.style.display='none';
        chatWrapper.style.display='flex';
      }
    }
  function getFieldEl(name){ return Array.from(formRow.querySelectorAll('[data-field-name]')).find(i=>i.dataset.fieldName===name); }
  async function loadLead(){ try{ const lead=await api('lead'); if(lead && lead.email){ const nameEl=getFieldEl('name'); const emailEl=getFieldEl('email'); if(nameEl) nameEl.value=lead.name||''; if(emailEl) emailEl.value=lead.email||''; leadSaved=true; updateVisibility(); } }catch(_){ } }
  async function applyFormEnabled(flag){ if(flag){ if(currentFormEnabled===null){ await loadLead(); } } else { leadSaved=true; } currentFormEnabled=flag; updateVisibility(); }
  async function refreshConfig(){ 
    try{ 
      const wc=await api('widget-config'); 
      if(!wc) return; 
      
      // Update form fields
      dynamicFields=Array.isArray(wc.fields)?wc.fields:[]; 
      rebuildFormFields(); 
      
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
      
      // Update starter questions (if implemented)
      if(wc.starter_questions !== undefined){ 
        // This would need additional implementation for starter questions
        // For now, we'll just store the setting
        console.log('Starter questions enabled:', wc.starter_questions);
      }
      
      // Update form enabled state
      const desired=!!wc.form_enabled; 
      if(desired!==currentFormEnabled){ 
        await applyFormEnabled(desired);
      } else { 
        updateVisibility(); 
      } 
    }catch(e){ 
      console.warn('[ChatbotWidget] Failed to refresh config:', e);
    } 
  }
  (async()=>{ await refreshConfig(); })();
    let poll=null; function startPoll(){ if(poll) return; poll=setInterval(refreshConfig,20000);} function stopPoll(){ if(poll){ clearInterval(poll); poll=null; }}
    btn.onclick=async()=>{ const was=panel.classList.contains('open'); if(!was){ await refreshConfig().catch(()=>{});} panel.classList.toggle('open'); if(!was) startPoll(); else stopPoll(); };
    close.onclick=()=>{ panel.classList.remove('open'); stopPoll(); };
  try{ window.addEventListener('storage', e=>{ if(e && e.key==='widget_config_version'){ refreshConfig(); }}); }catch(_){ }
  send.onclick=()=>{ if(isSending){ abortRequest(); } else { sendMessage(); } };
  input.addEventListener('keydown',e=>{ if(e.key==='Enter' && !isSending) sendMessage(); if(e.key==='Escape' && isSending) abortRequest(); });
    async function saveLead(){
      if(leadSaved) return;
      const data={};
      let emailValid=true;
      dynamicFields.forEach(f=>{
        const el=getFieldEl(f.name);
        if(!el) return;
        const val=(el.value||'').trim();
        if(f.required && !val){ emailValid=false; }
        data[f.name]=val;
      });
      const emailVal=data.email;
      // Basic required + email validation if email field present
      if(dynamicFields.some(f=>f.name==='email' && f.required)){
        if(!emailVal || !/\S+@\S+\.\S+/.test(emailVal)) emailValid=false;
      }
      if(!emailValid){ formStatus.textContent='Please fill required fields correctly.'; formStatus.className='cb-status error'; return; }
      try{
        saveBtn.disabled=true;
        if(emailVal){
          await api('lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.name||'',email:emailVal,client_id:getClientId()})});
        } else {
          // fallback generic submission
          await api('form/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        }
        leadSaved=true;
        formStatus.textContent='Saved';
        formStatus.className='cb-status ok';
        updateVisibility();
      }catch(e){ saveBtn.disabled=false; formStatus.textContent='Error: '+(e&&e.message?e.message:'Could not save info'); formStatus.className='cb-status error'; }
    }
    saveBtn.onclick=saveLead;
    injectStyles(); loadMessages().catch(()=>{});
    return { open:()=>{ panel.classList.add('open'); startPoll(); }, close:()=>{ panel.classList.remove('open'); stopPoll(); } };
  }
  window.createChatbotWidget=function(options){ injectStyles(); return new ChatbotWidget(options); };
})();
