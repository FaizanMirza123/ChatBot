(function(){
  const STYLE_ID='chatbot-widget-style';
  const WIDGET_ID='chatbot-widget-root';
  function injectStyles(){ if(document.getElementById(STYLE_ID)) return; const s=document.createElement('style'); s.id=STYLE_ID; s.textContent=`
    .cb-floating-button{position:fixed;bottom:20px;right:20px;z-index:2147483000;width:56px;height:56px;border-radius:50%;background:#0d6efd;color:#fff;border:none;cursor:pointer;box-shadow:0 6px 18px rgba(13,110,253,0.35);display:flex;align-items:center;justify-content:center;font-size:22px}
  .cb-panel{position:fixed;bottom:86px;right:20px;z-index:2147483000;width:380px;height:72vh;min-height:360px;background:#fff;color:#111;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,0.18);display:none;flex-direction:column;overflow:hidden;border:1px solid #e9ecef}
    .cb-panel.open{display:flex}
    .cb-header{padding:12px 14px;background:#0d6efd;color:#fff;display:flex;align-items:center;justify-content:space-between}
    .cb-title{font-weight:700;font-size:15px}
    .cb-close{background:transparent;border:0;color:#fff;cursor:pointer;font-size:18px}
    .cb-section{padding:12px 14px;background:#fafafa;border-bottom:1px solid #e9ecef}
    .cb-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .cb-form input{padding:10px;border:1px solid #ced4da;border-radius:6px;font-size:14px;flex:1 1 calc(50% - 12px);min-width:120px}
    .cb-btn{background:#0d6efd;color:#fff;border:none;border-radius:6px;padding:10px 16px;cursor:pointer;flex:0 0 88px}
    @media (max-width:420px){.cb-form input{flex:1 1 100%}.cb-btn{flex:1 1 100%}}
    .cb-status{font-size:12px;margin-top:6px}
    .cb-status.error{color:#c1121f}
    .cb-status.ok{color:#198754}
  /* Make chat wrapper a flex column so messages can scroll and input stays pinned */
  .cb-chat{display:flex;flex-direction:column;flex:1;min-height:0}
  .cb-messages{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px;background:#f8f9fa}
    .cb-message{margin:8px 0;padding:10px;border-radius:8px;line-height:1.38;font-size:14px}
    .cb-message.user{background:#e7f1ff;margin-left:15%}
    .cb-message.assistant{background:#eef7e9;margin-right:15%}
  .cb-input{display:flex;gap:8px;padding:10px;border-top:1px solid #e9ecef;background:#fff;flex-shrink:0}
    .cb-input input{flex:1;padding:10px;border:1px solid #ced4da;border-radius:6px;font-size:14px}
    .cb-input button{background:#0d6efd;color:#fff;border:none;border-radius:6px;padding:10px 12px;cursor:pointer}
  `; document.head.appendChild(s);}  
  function createRoot(){ let existing=document.getElementById(WIDGET_ID); if(existing) return existing; const r=document.createElement('div'); r.id=WIDGET_ID; document.body.appendChild(r); return r; }
  function ChatbotWidget(opts){
    const inferredBase=(()=>{ try{ const cur=document.currentScript||Array.from(document.scripts||[]).find(s=>/chatbot-widget\.v2\.js(\?|$)/.test(s.src)); if(cur){ const dataBase=cur.getAttribute('data-api-base')||(cur.dataset?cur.dataset.apiBase:''); if(dataBase) return dataBase; if(window.ChatbotWidgetApiBase) return String(window.ChatbotWidgetApiBase); if(cur.src){ const u=new URL(cur.src,window.location.href); return u.origin+'/'; } } }catch(_){ } return (window.location&&window.location.origin?window.location.origin:'')+'/'; })();
    const cfg=Object.assign({apiBase: inferredBase, title:'ChatBot'}, opts||{}); if(typeof cfg.apiBase==='string'){ if(!cfg.apiBase.endsWith('/')) cfg.apiBase+='/'; } else { cfg.apiBase=inferredBase; }
    function el(t,c,tx){ const e=document.createElement(t); if(c) e.className=c; if(tx) e.textContent=tx; return e; }
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
    function addMessage(role,content){ const m=el('div','cb-message '+role); m.textContent=content; messages.appendChild(m); messages.scrollTop=messages.scrollHeight; }
    async function loadMessages(){ messages.innerHTML=''; try{ const data=await api('messages'); (data&&data.messages||[]).forEach(m=>addMessage(m.role,m.content)); }catch(_){ }}
    // Inflight control helpers (declared here for access)
    let inflightCtrl=null; let isSending=false; let typingNode=null; let typingTimer=null;
    function setSendingMode(active){ isSending=!!active; if(typeof input!=='undefined') input.disabled=isSending; if(typeof send!=='undefined'){ send.textContent=isSending?'⏹':'➤'; send.title=isSending?'Stop':'Send'; } }
    function startTyping(){ stopTyping(); typingNode=el('div','cb-message assistant','…'); messages.appendChild(typingNode); messages.scrollTop=messages.scrollHeight; let dots=1; typingTimer=setInterval(()=>{ if(!typingNode) return; dots=(dots%3)+1; typingNode.textContent=''.padStart(dots,'.'); },400); }
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
    const title=el('div','cb-title',cfg.title); const close=el('button','cb-close','×'); header.appendChild(title); header.appendChild(close); panel.appendChild(header);
    // Form (gated + dynamic)
    const formSection=el('div','cb-section'); formSection.style.display='none';
    const formTitle=el('div',null,'Visitor Info'); formTitle.style.fontWeight='bold'; formTitle.style.marginBottom='8px';
    const formRow=el('div','cb-form');
    const saveBtn=el('button','cb-btn','Save');
    const formStatus=el('div','cb-status');
    formSection.appendChild(formTitle); formSection.appendChild(formRow); formRow.appendChild(saveBtn); formSection.appendChild(formStatus); panel.appendChild(formSection);
    let dynamicFields=[]; // fetched config fields
    function rebuildFormFields(){
      // keep save button and status at end
      while(formRow.firstChild && formRow.firstChild!==saveBtn){ formRow.removeChild(formRow.firstChild); }
      const sorted=[...dynamicFields].sort((a,b)=> (a.order||0)-(b.order||0));
      sorted.forEach(f=>{
        const inputEl = (f.type==='textarea')? document.createElement('textarea'): document.createElement('input');
        if(f.type!=='textarea') inputEl.type = (f.type==='email'||f.type==='number')?f.type:'text';
        inputEl.placeholder = f.placeholder || f.label || f.name;
        inputEl.dataset.fieldName = f.name;
        inputEl.style.flex='1 1 calc(50% - 12px)';
        inputEl.style.minWidth='120px';
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
  async function refreshConfig(){ try{ const wc=await api('widget-config'); if(!wc) return; dynamicFields=Array.isArray(wc.fields)?wc.fields:[]; rebuildFormFields(); const desired=!!wc.form_enabled; if(desired!==currentFormEnabled){ await applyFormEnabled(desired);} else { updateVisibility(); } }catch(_){ } }
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
