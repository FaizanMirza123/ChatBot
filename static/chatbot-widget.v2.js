(function(){
  const STYLE_ID='chatbot-widget-style';
  const WIDGET_ID='chatbot-widget-root';
  function injectStyles(){ let s=document.getElementById(STYLE_ID); if(!s){ s=document.createElement('style'); s.id=STYLE_ID; document.head.appendChild(s);} s.textContent=`
    #${WIDGET_ID}{--cb-primary:#0d6efd}
    .cb-floating-button{position:fixed;bottom:20px;right:20px;z-index:2147483000;width:56px;height:56px;border-radius:50%;background:var(--cb-primary,#0d6efd);color:#fff;border:none;cursor:pointer;box-shadow:0 6px 18px rgba(13,110,253,0.35);display:flex;align-items:center;justify-content:center;font-size:22px}
    .cb-panel{position:fixed;bottom:86px;right:20px;z-index:2147483000;width:380px;height:72vh;min-height:360px;background:#fff;color:#111;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,0.18);display:none;flex-direction:column;overflow:hidden;border:1px solid #e9ecef}
    .cb-panel.open{display:flex}
  .cb-header{padding:12px 14px;background:var(--cb-primary,#0d6efd);color:#fff;display:flex;align-items:center;justify-content:space-between}
  .cb-brand{display:flex;align-items:center;gap:8px}
  .cb-avatar{width:22px;height:22px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,0.3);border:1px solid rgba(0,0,0,0.05)}
    .cb-title{font-weight:700;font-size:15px}
    .cb-close{background:transparent;border:0;color:#fff;cursor:pointer;font-size:18px}
  .cb-section{padding:16px 16px;background:#fafafa;border-bottom:1px solid #e9ecef}
  .cb-section h2{margin:0 0 6px;font-size:18px;line-height:1.2;text-align:center}
  .cb-note{font-size:13px;color:#6c757d;text-align:center;margin:0 0 12px}
  .cb-form{display:flex;flex-direction:column;gap:14px;align-items:stretch;min-height:180px}
  .cb-form input,.cb-form textarea{padding:10px;border:1px solid #ced4da;border-radius:6px;font-size:14px;width:100%;box-sizing:border-box}
    .cb-btn{background:var(--cb-primary,#0d6efd);color:#fff;border:none;border-radius:6px;padding:10px 16px;cursor:pointer;align-self:center;margin-top:auto}
  @media (max-width:420px){.cb-btn{align-self:center;width:auto}}
    .cb-status{font-size:12px;margin-top:6px}
    .cb-status.error{color:#c1121f}
    .cb-status.ok{color:#198754}
  /* Make chat wrapper a flex column so messages can scroll and input stays pinned */
  .cb-chat{display:flex;flex-direction:column;flex:1;min-height:0}
  .cb-messages{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px;background:#f8f9fa}
    .cb-message{margin:8px 0;line-height:1.38;font-size:14px}
    .cb-message.user{background:#e7f1ff;margin-left:15%;padding:10px;border-radius:8px}
  .cb-message.assistant{margin-right:15%;display:flex;gap:8px;align-items:flex-start}
  .cb-message.assistant .cb-msg-avatar{width:20px;height:20px;border-radius:50%;object-fit:cover;flex:0 0 auto;border:1px solid rgba(0,0,0,0.05)}
  .cb-message.assistant .cb-msg-text{flex:1;background:#eef7e9;padding:10px;border-radius:8px}
    .cb-input{display:flex;gap:8px;padding:10px;border-top:1px solid #e9ecef;background:#fff;flex-shrink:0}
    .cb-input input{flex:1;padding:10px;border:1px solid #ced4da;border-radius:6px;font-size:14px}
    .cb-input button{background:var(--cb-primary,#0d6efd);color:#fff;border:none;border-radius:6px;padding:10px 12px;cursor:pointer}
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
  const brand=el('div','cb-brand'); const avatarImg=document.createElement('img'); avatarImg.className='cb-avatar'; avatarImg.style.display='inline-block'; avatarImg.src=DEFAULT_AVATAR; avatarImg.onerror=()=>{avatarImg.src=DEFAULT_AVATAR;}; const title=el('div','cb-title',cfg.title); brand.appendChild(avatarImg); brand.appendChild(title); const close=el('button','cb-close','×'); header.appendChild(brand); header.appendChild(close); panel.appendChild(header);
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
  const chatWrapper=el('div','cb-chat'); const messages=el('div','cb-messages'); const inputBar=el('div','cb-input'); const input=document.createElement('input'); input.placeholder='Type your message...'; const send=el('button',null,'➤'); inputBar.appendChild(input); inputBar.appendChild(send); chatWrapper.appendChild(messages); chatWrapper.appendChild(inputBar); panel.appendChild(chatWrapper);
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
  async function refreshConfig(){ try{ const wc=await api('widget-config'); if(!wc) return; dynamicFields=Array.isArray(wc.fields)?wc.fields:[]; rebuildFormFields(); if(wc.primary_color){ try{ root.style.setProperty('--cb-primary', wc.primary_color); }catch(_){} } if(wc.avatar_url){ let url=wc.avatar_url; if(/^\//.test(url) || !/^https?:/i.test(url)){ url=joinUrl(cfg.apiBase, url); } // preload & verify
      try{ const test=new Image(); test.crossOrigin='anonymous'; await new Promise((resolve,reject)=>{ test.onload=resolve; test.onerror=reject; test.src=url; }); botAvatarUrl=url; avatarImg.src=url; }catch(e){ botAvatarUrl=''; avatarImg.src=DEFAULT_AVATAR; try{ console.warn('[ChatbotWidget] Avatar failed to load:', url); }catch(_){} } } else { botAvatarUrl=''; avatarImg.src=DEFAULT_AVATAR; } const desired=!!wc.form_enabled; if(desired!==currentFormEnabled){ await applyFormEnabled(desired);} else { updateVisibility(); } }catch(_){ } }
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
