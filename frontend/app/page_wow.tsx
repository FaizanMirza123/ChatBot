"use client";
import { useState, type ReactNode } from 'react';
import { clsx } from 'clsx';

const NavItem = ({ label, active=false, onClick }: { label: string; active?: boolean; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className={clsx('sidebar-link w-full text-left', active && 'active')}>{label}</button>
);

export default function Page() {
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [activeSub, setActiveSub] = useState<'sources' | 'guidelines' | null>(null);
  const [selectedMain, setSelectedMain] = useState<'training' | 'settings' | 'connect' | 'inbox' | 'analytics'>('settings');
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr] block">
      {/* Sidebar */}
      <aside className="bg-sidebar text-white px-3 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="brand-ring">
            <div className="brand-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
                <rect x="4" y="7" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="9" cy="12" r="1" fill="currentColor"/>
                <circle cx="15" cy="12" r="1" fill="currentColor"/>
                <path d="M12 4v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <span className="text-white font-bold text-lg tracking-wide">Botify</span>
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          <NavItem label="Training" active={selectedMain==='training'} onClick={()=> setTrainingOpen(o=>!o)} />
          {trainingOpen && (
            <div className="space-y-1 pl-2">
              <button type="button" className={clsx('sidebar-subitem w-full text-left', activeSub==='sources' && 'active')} onClick={()=> { setSelectedMain('training'); setActiveSub('sources'); }}>Sources</button>
              <button type="button" className={clsx('sidebar-subitem w-full text-left', activeSub==='guidelines' && 'active')} onClick={()=> { setSelectedMain('training'); setActiveSub('guidelines'); }}>Guidelines</button>
            </div>
          )}
          <NavItem label="Settings" active={selectedMain==='settings'} onClick={()=> { setSelectedMain('settings'); setActiveSub(null); }} />
          <NavItem label="Connect" active={selectedMain==='connect'} onClick={()=> setSelectedMain('connect')} />
          <NavItem label="Inbox" active={selectedMain==='inbox'} onClick={()=> setSelectedMain('inbox')} />
          <NavItem label="Analytics" active={selectedMain==='analytics'} onClick={()=> setSelectedMain('analytics')} />
        </nav>
        {/* Removed Help Center / Contact Sales / Submit a Ticket per request */}
      </aside>

      {/* Main */}
      <main className="bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button className="btn btn-ghost">Share</button>
          <button className="btn btn-primary">Test bot</button>
        </div>

        <div className="px-6 pb-6">
          {selectedMain==='training' ? (
            activeSub === 'guidelines' ? <GuidelinesView /> : <SourcesView />
          ) : selectedMain==='settings' ? (
            <SettingsView />
          ) : selectedMain==='connect' ? (
            <ConnectView />
          ) : selectedMain==='inbox' ? (
            <InboxView />
          ) : selectedMain==='analytics' ? (
            <AnalyticsView />
          ) : (
            <SettingsView />
          )}
        </div>
      </main>
    </div>
  );
}

function SettingsView(){
  const [tab, setTab] = useState<'general'|'appearance'|'messaging'|'starter'|'user'>('general');
  const labelFor = {
    general: 'General', appearance: 'Appearance', messaging: 'Messaging', starter: 'Starter questions', user: 'User form'
  } as const;
  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-4">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        {/* Left settings nav */}
        <div className="bg-white rounded-xl border border-gray-200 p-2 h-fit">
          {([
              {k:'general', t:'General'},
              {k:'appearance', t:'Appearance'},
              {k:'messaging', t:'Messaging'},
              {k:'starter', t:'Starter questions'},
              {k:'user', t:'User form'},
            ] as {k: typeof tab, t: string}[]).map(({k,t}) => (
            <button
              key={k}
              type="button"
              onClick={()=> setTab(k)}
              className={clsx(
                'w-full text-left rounded-lg px-3 py-2 text-[13px]',
                tab===k && 'bg-gray-100 font-semibold text-gray-700 shadow-sm'
              )}
            >{t}</button>
          ))}
        </div>
        {/* Right content area */}
        <div className="rounded-xl border border-gray-200 shadow-card overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-[16px] font-semibold">
              {tab==='appearance'
                ? 'Customize the appearance of your bot as per your needs'
                : tab==='messaging'
                ? 'Customize and fine-tune the message settings of your bot'
                : tab==='user'
                ? 'Choose what data to collect from your users before they chat'
                : 'Configure your bot according to your needs'}
            </h2>
          </div>
          {tab==='general' && <SettingsGeneral />}
          {tab==='appearance' && <SettingsAppearance />}
          {tab==='messaging' && <SettingsMessaging />}
          {tab==='starter' && <SettingsStarter />}
          {tab==='user' && <SettingsUserForm />}
          {tab!=='general' && tab!=='appearance' && tab!=='messaging' && tab!=='starter' && tab!=='user' && (
            <div className="p-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-600 text-[14px]">
                {labelFor[tab]} settings are not implemented yet in this prototype.
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button className="btn btn-ghost">Discard changes</button>
            <button className="btn btn-primary">Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsGeneral(){
  return (
    <div className="p-6 grid gap-6">
      <div className="space-y-2">
        <label className="label">Bot name</label>
        <p className="text-[13px] text-gray-500">Give your bot a friendly name. Only for internal reference.</p>
        <input className="input" defaultValue="Botify" />
      </div>
      <div className="space-y-2">
        <label className="label">Description</label>
        <p className="text-[13px] text-gray-500">Bot description for internal references</p>
        <input className="input" placeholder="" />
      </div>
    </div>
  );
}

function SettingsAppearance(){
  const [color, setColor] = useState<string>('#6b4eff');
  const [widgetIcon, setWidgetIcon] = useState<string>('💬');
  const [position, setPosition] = useState<'left'|'right'>('right');
  const [showBranding, setShowBranding] = useState<boolean>(true);
  const [openByDefault, setOpenByDefault] = useState<boolean>(false);
  const [starterQuestions, setStarterQuestions] = useState<boolean>(true);

  const colorOptions = ['#6b4eff','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#a855f7','#f43f5e','#8b5cf6'];
  const iconOptions = ['💬','🤖','🗨️','💭','📨','🔮','✨','🧠'];

  return (
    <div className="p-6 grid gap-6">
      <div className="space-y-2">
        <label className="label">Bot name on the widget</label>
        <p className="text-[13px] text-gray-500">Bot name to be displayed in the chatbot</p>
        <input className="input" defaultValue="Botify" />
      </div>

      <div className="space-y-2">
        <label className="label">Subheading (optional)</label>
        <p className="text-[13px] text-gray-500">Chatbot Subheading to be displayed in the chatbot</p>
        <input className="input" placeholder="Our bot answers instantly" defaultValue="Our bot answers instantly" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <UploadField label="Botsonic branding on the widget" hint="Company Logo to be displayed on the chatbot header" />
        <UploadField label="Bot Avatar" hint="Chatbot Picture to be displayed in the chatbot" />
      </div>

      <div className="space-y-2">
        <label className="label">Accent Colour</label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map(c => (
            <button key={c} type="button" onClick={()=> setColor(c)} className={clsx('w-7 h-7 rounded-md border', color===c ? 'ring-2 ring-offset-2 ring-primary-500 border-transparent' : 'border-gray-300')} style={{backgroundColor: c}} aria-label={`Pick color ${c}`} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Widget icon</label>
        <div className="flex flex-wrap gap-2">
          {iconOptions.map(ic => (
            <button key={ic} type="button" onClick={()=> setWidgetIcon(ic)} className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center text-[18px] bg-white', widgetIcon===ic ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200')}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Widget position</label>
        <div className="flex items-center gap-3">
          <OptionCard label="Left" active={position==='left'} onClick={()=> setPosition('left')} />
          <OptionCard label="Right" active={position==='right'} onClick={()=> setPosition('right')} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Input Placeholder</label>
        <p className="text-[13px] text-gray-500">Chatbot Input Placeholder to be displayed in the chatbot</p>
        <input className="input" defaultValue="Send a message..." />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ToggleRow label="Botsonic branding on the widget" description="Hide/Show Botsonic banner at the bottom" value={showBranding} onChange={setShowBranding} />
        <ToggleRow label="Widget is open by default" description="Open/Close widget when user engage for the first time" value={openByDefault} onChange={setOpenByDefault} />
      </div>

      <ToggleRow label="Starter Questions" description="Show floating Starter Questions" value={starterQuestions} onChange={setStarterQuestions} />
    </div>
  );
}

function UploadField({label, hint}:{label:string; hint:string}){
  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      <p className="text-[13px] text-gray-500">{hint}</p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xl text-gray-400 bg-gray-50">⬆️</div>
        <button className="btn btn-ghost">Upload</button>
      </div>
    </div>
  );
}

function OptionCard({label, active, onClick}:{label:string; active?:boolean; onClick?:()=>void}){
  return (
    <button type="button" onClick={onClick} className={clsx('w-28 h-20 rounded-xl border flex items-center justify-center text-[13px]', active ? 'border-primary-500 ring-2 ring-primary-200 bg-white' : 'border-gray-200 bg-gray-50')}>{label}</button>
  );
}

function ToggleRow({label, description, value, onChange}:{label:string; description:string; value:boolean; onChange:(v:boolean)=>void}){
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-[13px] text-gray-500">{description}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

/** PURE TAILWIND TOGGLE **/
function Toggle({value, onChange}:{value:boolean; onChange:(v:boolean)=>void}){
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={()=> onChange(!value)}
      className={clsx(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200',
        value ? 'bg-gradient-to-br from-primary-500 to-indigo-500' : 'bg-gray-200'
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-black/5 transition-transform duration-200',
          value ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function SettingsStarter(){
  return (
    <div className="p-6">
      {/* Header description with Learn more */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[15px] font-semibold">These will be shown upfront to your user as nudges. You can style the answers using markdown.</div>
          <div className="text-[13px] text-gray-500">Note: Now you can use @ to add variables. <button className="text-primary-500">Learn more</button></div>
        </div>
        <button className="btn btn-ghost">Learn more</button>
      </div>

      <button className="inline-flex items-center gap-2 rounded-lg border border-primary-500 text-primary-600 px-4 py-2 text-sm font-semibold">
        <span className="text-[16px]">+</span>
        Add new Starter question
      </button>
    </div>
  );
}

function SettingsUserForm(){
  type Field = { id: string; type: 'Text'|'Email'|'Phone'; label: string; required: boolean };
  const [enableForm, setEnableForm] = useState(true);
  const [enableCaptcha, setEnableCaptcha] = useState(false);
  const [fields, setFields] = useState<Field[]>([
    { id: '1', type: 'Text', label: 'name', required: true },
    { id: '2', type: 'Email', label: 'email', required: true },
  ]);

  const addField = () => {
    const id = String(Date.now());
    setFields(prev => [...prev, { id, type: 'Text', label: '', required: false }]);
  };
  const updateField = (id:string, patch: Partial<Field>) => {
    setFields(prev => prev.map(f => f.id===id ? { ...f, ...patch } : f));
  };
  const removeField = (id:string) => setFields(prev => prev.filter(f=>f.id!==id));

  return (
    <div className="p-6 grid gap-6">
      <Row title="Enable user form" description="Enable or disable user form">
        <Toggle value={enableForm} onChange={setEnableForm} />
      </Row>
      {/* <Row title="Enable Captcha" description="Prevent automated spam and fraudulent activities">
        <Toggle value={enableCaptcha} onChange={setEnableCaptcha} />
      </Row> */}

      <div>
        <div className="text-[15px] font-semibold mb-2">Form</div>
        <div className="text-[13px] text-gray-500 mb-4">Build your form here</div>

        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.id} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div className="grid md:grid-cols-[24px_200px_1fr_auto_auto] items-center gap-4">
                <div className="text-gray-400 cursor-grab">⋮⋮</div>
                <div>
                  <div className="label mb-1">Field type</div>
                  <Select value={f.type} onChange={(v)=> updateField(f.id, { type: v as Field['type'] })} options={['Text','Email','Phone']} />
                </div>
                <div>
                  <div className="label mb-1">Field label</div>
                  <input className="input" value={f.label} onChange={e=> updateField(f.id, { label: e.target.value })} />
                </div>
                {/* Replaced peer/checkbox with shared Toggle for consistency */}
                <div className="inline-flex items-center gap-2 text-[13px] text-gray-600">
                  <Toggle value={f.required} onChange={(v)=> updateField(f.id, { required: v })} />
                  <span>Required</span>
                </div>
                <button className="text-gray-400" aria-label="Delete" onClick={()=> removeField(f.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button type="button" onClick={addField} className="inline-flex items-center gap-2 rounded-lg border border-primary-500 text-primary-600 px-4 py-2 text-sm font-semibold">
            <span className="text-[16px]">+</span>
            Add new
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsMessaging(){
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [conversational, setConversational] = useState(true);
  const [strictFaq, setStrictFaq] = useState(true);
  const [respLen, setRespLen] = useState<'Short'|'Medium'|'Long'>('Medium');
  const [suggestFollowups, setSuggestFollowups] = useState(false);
  const [allowImages, setAllowImages] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [postFeedback, setPostFeedback] = useState(true);
  const [multilingual, setMultilingual] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeMsg, setWelcomeMsg] = useState("Hey there, how can I help you?");
  const [noSourceMsg, setNoSourceMsg] = useState("The bot is yet to be trained, please add the data and train the bot.");
  const [serverErrMsg, setServerErrMsg] = useState("Apologies, there seems to be a server error.");

  return (
    <div className="p-6 grid gap-6">
      <Row title="AI Model" description="Select a model to power your bot" trailing={<button className="btn btn-ghost">{aiModel}</button>} />

      <Row title={<span>Conversational Mode <Badge>New</Badge></span>} description="Segment bot's responses into shorter, more readable messages. The entire response still counts as one message">
        <Toggle value={conversational} onChange={setConversational} />
      </Row>

      <Row title="Strict FAQ Responses" description="When enabled, responses are limited to exact FAQ content. Disable to allow more comprehensive answers with additional context beyond FAQ's exact content.">
        <Toggle value={strictFaq} onChange={setStrictFaq} />
      </Row>

      <Row title="Response Length" description="Select the response length of your bot" trailing={<Select value={respLen} onChange={(v)=> setRespLen(v as any)} options={['Short','Medium','Long']} />} />

      <Row title="Suggest Follow Up Questions" description="If enabled, we will suggest 2 new follow up questions from your knowledge base">
        <Toggle value={suggestFollowups} onChange={setSuggestFollowups} />
      </Row>

      <Row title="Allow Image Usage" description="Allows the bot to use the scraped images for training and response generation">
        <Toggle value={allowImages} onChange={setAllowImages} />
      </Row>

      <Row title="Show sources with the response" description="Hide/Show sources along with responses">
        <Toggle value={showSources} onChange={setShowSources} />
      </Row>

      <Row title="Post chat feedback" description="Hide/Show post chat feedback">
        <Toggle value={postFeedback} onChange={setPostFeedback} />
      </Row>

      <Row title="Multilingual Support" description="If disabled, the bot will stick to the selected language">
        <Toggle value={multilingual} onChange={setMultilingual} />
      </Row>

      <Row title="Show floating welcome message" description="Toggle visibility of the Welcome Message">
        <Toggle value={showWelcome} onChange={setShowWelcome} />
      </Row>

      <div className="space-y-2">
        <label className="label">Welcome Message</label>
        <p className="text-[13px] text-gray-500">Customize the welcome message that is shown to your customers</p>
        <input className="input" value={welcomeMsg} onChange={e=> setWelcomeMsg(e.target.value)} />
        <div className="text-[12px] text-gray-500">Note: Now you can use @ to add variables. <button className="text-primary-500">Learn more</button></div>
      </div>

      <div className="space-y-2">
        <label className="label">Message shown when no Source is added</label>
        <input className="input" value={noSourceMsg} onChange={e=> setNoSourceMsg(e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="label">Message shown when there is a Server Error</label>
        <input className="input" value={serverErrMsg} onChange={e=> setServerErrMsg(e.target.value)} />
      </div>
    </div>
  );
}

function Row({title, description, children, trailing}:{title: ReactNode; description: ReactNode; children?: ReactNode; trailing?: ReactNode;}){
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-[13px] text-gray-500">{description}</div>
        </div>
        {trailing ? trailing : children}
      </div>
    </div>
  );
}

function Badge({children}:{children: ReactNode}){
  return <span className="ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 align-middle">{children}</span>;
}

function Select({value, onChange, options}:{value:string; onChange:(v:string)=>void; options:string[];}){
  return (
    <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] bg-white" value={value} onChange={e=> onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SourcesView(){
  const [tab, setTab] = useState<'files'|'faqs'>('files');
  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-4">Sources</h1>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-6 text-[14px] text-gray-600">
          <button className={clsx('relative px-2 py-3', tab==='files' && 'text-primary-500')} onClick={()=>setTab('files')}>
            <span className="inline-flex items-center gap-2"><span className="text-[18px]">📄</span> Files</span>
            {tab==='files' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500" />}
          </button>
          <button className={clsx('relative px-2 py-3', tab==='faqs' && 'text-primary-500')} onClick={()=>setTab('faqs')}>
            <span className="inline-flex items-center gap-2"><span className="text-[18px]">❓</span> FAQs</span>
            {tab==='faqs' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500" />}
          </button>
        </div>
      </div>

      {tab==='files' ? <FilesSection/> : <FaqsSection/>}
    </div>
  );
}

function FilesSection(){
  return (
    <div className="pt-6 space-y-6">
      <h3 className="text-[15px] font-semibold">Upload files to train Botsonic on your data</h3>
      {/* Dropzone */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="rounded-lg border-2 border-dashed border-gray-200 h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-gray-500">⤴</div>
            <div className="text-primary-500 font-medium">Click to upload</div>
            <div className="text-[13px] text-gray-500">or drag and drop</div>
            <div className="text-[12px] text-gray-500 mt-1">Up to 100 MB in size. PDF, DOC, DOCX, TXT</div>
          </div>
        </div>
      </div>
      <button className="btn btn-primary w-max">Upload and train</button>

      {/* Files table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 font-semibold">Files</div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <div className="min-w-[900px] grid grid-cols-[1fr_140px_140px_140px_180px_40px] px-6 py-3 text-[13px] text-gray-500">
              <div>Name</div><div>Type</div><div>Visibility</div><div>Status</div><div>Updated</div><div></div>
            </div>
            <div className="min-w-[900px] border-t border-gray-100 px-6 py-4 grid grid-cols-[1fr_140px_140px_140px_180px_40px] items-center text-[14px]">
              <div className="truncate">School_Teacher_Knowledge_Base.pdf</div>
              <div className="text-gray-500">PDF</div>
              <div>
                <Toggle value={true} onChange={()=>{}} />
              </div>
              <div><span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-[12px] px-2 py-1">Trained</span></div>
              <div className="text-gray-500">a few seconds ago</div>
              <div className="text-gray-400">⋯</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}

function FaqsSection(){
  return (
    <div className="pt-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">FAQs Example</div>
          <div className="text-[13px] text-gray-500">You can download the attachment example and use them as a starting point for your file</div>
        </div>
        <button className="btn btn-ghost">Download</button>
      </div>
      {/* Dropzone */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="rounded-lg border-2 border-dashed border-gray-200 h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-gray-500">⤴</div>
            <div className="text-primary-500 font-medium">Click to upload</div>
            <div className="text-[13px] text-gray-500">or drag and drop</div>
            <div className="text-[12px] text-gray-500 mt-1">Up to 100 MB in size. CSV (See Template above).</div>
          </div>
        </div>
      </div>
      <button className="btn btn-primary w-max">Upload and train</button>

      <div>
        <h3 className="text-[15px] font-semibold">Added FAQs</h3>
        <p className="text-[13px] text-gray-500">You can style the answers using markdown.</p>
      </div>
    </div>
  );
}

function GuidelinesView(){
  return (
    <div>
      {/* Header with action */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-semibold">Guidelines Manager</h1>
        <button className="btn btn-ghost pl-[30px]">Learn more</button>
      </div>
      <p className="text-[14px] text-gray-600 mb-6">Fine tune your bot's automatically generated responses by adding customized instructions</p>
      
      {/* Empty state card */}
      <div className="rounded-xl border border-gray-200 p-8 bg-white">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 flex items-center justify-center">
          <div className="max-w-xl text-center">
            <div className="mx-auto mb-6 w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl text-gray-400">☁️</div>
            <div className="text-[18px] font-semibold mb-2">Start by adding a guideline</div>
            <div className="text-[14px] text-gray-500">Any guideline you create will be shown here<br/>Start creating by clicking on Add new</div>
            <div className="mt-6">
              <button className="btn btn-primary inline-flex items-center gap-2"><span className="text-lg">+</span> Add new</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectView(){
  const [embedKind, setEmbedKind] = useState<'js'|'iframe'>('iframe');
  const code = embedKind==='js'
    ? `\n<script>\n  (function (w, d, s, o, f, js, fjs) {\n    w["botsonic_widget"] = o;\n    w[o] = w[o] || function () { (w[o].q = w[o].q || []).push(arguments); };\n    (js = d.createElement(s)), (fjs = d.getElementsByTagName(s)[0]);\n    js.id = o; js.src = f; js.async = 1; fjs.parentNode.insertBefore(js, fjs);\n  })(window, document, "script", "Botsonic", "https://chatbot.dipietroassociates.com/api/CDN/botsonic.min.js");\n  Botsonic("init", { serviceBaseUrl: "https://chatbot.dipietroassociates.com/api", token: "YOUR_TOKEN" });\n</script>`
    : `\n<iframe style="height:100vh;width:100vw" frameBorder="0"\n  src="https://chatbot.dipietroassociates.com/api/CDN/index.html?service-base-url=https%3A%2F%2Fchatbot.dipietroassociates.com%2Fapi&token=YOUR_TOKEN&origin=https%3A%2F%2Fchatbot.dipietroassociates.com%2Fapi&instance-name=Botsonic&standalone=true&page-url=https%3A%2F%2Fchatbot.dipietroassociates.com%2Fapi%2Fbots%2F5d02de95-db80-47e2-a7d2-443c146d07bc%2Fconnect">\n</iframe>`;
  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-4">Connect</h1>
      <div className="rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-[16px] font-semibold">Connect with your website visitors</h2>
          <button className="btn btn-ghost">{embedKind==='iframe' ? 'Learn more about using iFrame' : 'Learn more about using Embed Script'}</button>
        </div>
        <div className="p-6 grid gap-6">
          {/* Tabs */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1 w-max">
            <button onClick={()=> setEmbedKind('js')} className={clsx('px-4 py-1.5 rounded-md text-sm', embedKind==='js' ? 'bg-white shadow font-medium' : 'text-gray-600')}>Javascript</button>
            <button onClick={()=> setEmbedKind('iframe')} className={clsx('px-4 py-1.5 rounded-md text-sm', embedKind==='iframe' ? 'bg-white shadow font-medium' : 'text-gray-600')}>iFrame</button>
          </div>

          {/* Alert */}
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-[13px] p-3">
            Please add allowed hosts for widget to work, it’s mandatory for both JavaScript and iFrame
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-[13px] text-gray-600">{embedKind==='iframe' ? (
              <span>Replace <a className="text-primary-500" href="#">https://chatbot.dipietroassociates.com/api</a> with your website name.</span>
            ) : (
              <span>Paste the code snippet below in your HTML code where you want to display the Botsonic chatbot.</span>
            )}</div>
            <button className="btn btn-ghost">Manage allowed hosts</button>
          </div>

          {/* Code block */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 relative">
            <pre className="overflow-auto text-[12px] text-gray-800 whitespace-pre-wrap"><code>{code}</code></pre>
            <button className="absolute top-3 right-3 btn btn-ghost text-[12px]">Copy</button>
          </div>

          {embedKind==='iframe' && (
            <div className="rounded-lg border border-purple-300 bg-purple-50 text-purple-800 text-[13px] p-4">
              <div className="font-medium mb-1">Note:</div>
              To track the bot's performance across different pages on your website, replace
              <span className="mx-1 text-primary-600">https://chatbot.dipietroassociates.com/api/bots/5d02de95-db80-47e2-a7d2-443c146d07bc/connect</span>
              in 'page-url' with your website's URL.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InboxView(){
  const [tab, setTab] = useState<'chats'|'users'>('chats');
  const chats = [
    { id: 'c1', title: 'Hello', preview: 'hello', ago: '1 day ago' },
    { id: 'c2', title: 'Hello', preview: 'hello my name is john', ago: '1 day ago' },
    { id: 'c3', title: 'Hello', preview: 'you cant help me', ago: '1 day ago' },
  ];
  const [activeChat, setActiveChat] = useState(chats[0].id);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-semibold">Inbox</h1>
        <button className="btn btn-ghost">Export all data</button>
      </div>

      <div className="mb-4 inline-flex bg-gray-100 rounded-lg p-1">
        <button onClick={()=>setTab('chats')} className={clsx('px-4 py-1.5 rounded-md text-sm', tab==='chats' ? 'bg-white shadow font-medium' : 'text-gray-600')}>Chats</button>
        <button onClick={()=>setTab('users')} className={clsx('px-4 py-1.5 rounded-md text-sm', tab==='users' ? 'bg-white shadow font-medium' : 'text-gray-600')}>Users</button>
      </div>

      {tab==='chats' ? (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_320px] gap-6">
          {/* Left: chat list */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-600">
                <span>🔎</span>
                <input placeholder="Search by IP" className="flex-1 outline-none" />
                <button className="text-primary-500">🔔<span className="sr-only">Filter</span></button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {chats.map(c => (
                <button key={c.id} onClick={()=> setActiveChat(c.id)} className={clsx('w-full text-left px-4 py-3', activeChat===c.id && 'bg-primary-50 border-l-4 border-primary-500')}> 
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-[12px] text-gray-500">{c.ago}</div>
                  </div>
                  <div className="text-[13px] text-gray-600">{c.preview}</div>
                  <div className="text-[12px] text-gray-500 mt-1">🌐 Browser</div>
                </button>
              ))}
            </div>
          </div>

          {/* Middle: conversation */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
              <div className="font-semibold">Hello</div>
              <button className="text-red-600 text-sm">Block IP</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="bg-gray-100 rounded-lg px-3 py-2">hello</div>
                <button className="text-gray-400">⋯</button>
              </div>
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-primary-50 text-gray-800 rounded-lg px-4 py-3 max-w-xl">
                  Hello! How can I assist you today? If you have any questions or need information, feel free to ask. I'm here to help!
                </div>
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">🤖</div>
              </div>
            </div>
          </div>

          {/* Right: user info */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-semibold">User info</div>
              <div className="p-6 space-y-3 text-[14px]">
                <InfoRow label="name" value="Hello" />
                <InfoRow label="email" value="helloworld@wow.com" copy />
                <InfoRow label="User ID" value="68c2c22df514e89ffd70541d" copy />
                <InfoRow label="IP address" value="104.28.244.125" copy />
                <InfoRow label="Chat ID" value="1395a540-598d-496c-8b3b-..." copy />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-semibold">Interaction</div>
              <div className="p-6 text-[14px]">Recorded at<br/><span className="text-gray-600">12:42 11 September 2025</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[640px] grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px] items-center bg-gray-50 px-6 py-3 text-[13px] text-gray-600">
              <div>name</div><div>email</div><div>Recorded at</div><div className="text-right">Chats</div>
            </div>
            <div className="min-w-[640px] px-6 py-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px] items-center text-[14px]">
              <div>Hello</div>
              <div>helloworld@wow.com</div>
              <div>9/11/2025, 5:35:57 PM</div>
              <div className="text-right text-gray-600">3 chats</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({label, value, copy}:{label:string; value:string; copy?:boolean}){
  return (
    <div>
      <div className="text-[12px] text-gray-500">{label}</div>
      <div className="flex items-center gap-2">
        <div>{value}</div>
        {copy && <button className="text-gray-400">📋</button>}
      </div>
    </div>
  );
}

function AnalyticsView(){
  const [range, setRange] = useState('Last 7 days');
  const points = [0,0,0,0,0.2,1.0,2.0,1.2,0.1];
  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-4">Analytics</h1>

      {/* Controls */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] bg-white" value={range} onChange={e=> setRange(e.target.value)}>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>This month</option>
        </select>
        <button className="btn btn-primary">Export Analytics Data</button>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
        <div className="text-[18px] font-semibold mb-2">Summary</div>
        <p className="text-[14px] text-gray-600">
          In the realm of company analytics, it's crucial to track various key performance indicators to gauge the effectiveness of business operations. Here's a summary of the essential metrics. By monitoring and analyzing these key metrics, the company can gain valuable insights into its performance, customer satisfaction, and operational efficiency, thereby making informed decisions to drive business growth and success.
        </p>
      </div>

      {/* Metrics + Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-6 px-6 pt-4 text-[14px]">
          <Metric label="Total Chats" value="3" />
          <Metric label="Total Users" value="1" />
          <Metric label="Resolution Rate" value="100%" />
        </div>
        <div className="mt-4 px-6 pb-6">
          <ChartArea points={points} labels={['5 Sep','6 Sep','7 Sep','8 Sep','9 Sep','10 Sep','11 Sep','12 Sep']} color="#6d28d9" />
        </div>
      </div>
    </div>
  );
}

function Metric({label, value}:{label:string; value:string}){
  return (
    <div className="border-b-2 border-primary-500 pb-2">
      <div className="text-gray-600 inline-flex items-center gap-1">{label} <span className="text-gray-400">ⓘ</span></div>
      <div className="text-[22px] font-semibold">{value}</div>
    </div>
  );
}

function ChartArea({points, labels, color = '#7c3aed'}:{points:number[]; labels?:string[]; color?:string}){
  // Premium SVG area chart with smoothing, gradient, shadow, and markers
  const width = 1100;
  const height = 300;
  const m = { t: 16, r: 16, b: 28, l: 36 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const maxVal = Math.max(...points, 0);
  const minVal = 0;
  const padMax = maxVal === 0 ? 1 : maxVal * 1.1;
  const n = points.length;
  const xs = (i:number) => m.l + (i/(n-1)) * iw;
  const ys = (v:number) => m.t + ih - ((v - minVal) / ((padMax - minVal) || 1)) * ih;
  const pts = points.map((p,i)=> ({ x: xs(i), y: ys(p) }));

  // Catmull-Rom to Bezier smoothing
  const pathLine = (() => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i-1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i+1];
      const p3 = pts[i+2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  })();
  const pathArea = pathLine + ` L ${m.l + iw} ${m.t + ih} L ${m.l} ${m.t + ih} Z`;

  // X labels
  const xLabels = labels && labels.length === n
    ? labels
    : Array.from({length: n}, (_,i)=> `${i+1}`);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="rounded-lg">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="chartStroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={color} floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill="white" />

      {/* Grid lines */}
      {Array.from({length: 4}, (_,i)=> (
        <line key={`h${i}`} x1={m.l} x2={m.l+iw} y1={m.t + (ih/4)*(i+1)} y2={m.t + (ih/4)*(i+1)} stroke="#e9e9ef" strokeWidth="1" />
      ))}
      {Array.from({length: n}, (_,i)=> (
        <line key={`v${i}`} x1={xs(i)} x2={xs(i)} y1={m.t} y2={m.t+ih} stroke="#f1f1f6" strokeWidth="1" />
      ))}

      {/* Baseline */}
      <line x1={m.l} x2={m.l+iw} y1={m.t+ih} y2={m.t+ih} stroke={color} strokeOpacity="0.6" strokeWidth="2" />

      {/* Area + Stroke */}
      <path d={pathArea} fill="url(#chartFill)" />
      <path d={pathLine} fill="none" stroke="url(#chartStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow)" />

      {/* Markers */}
      {pts.map((p,i)=> (
        <g key={`pt${i}`}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="#ffffff" strokeWidth="2" />
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels.map((d,i)=> (
        <text key={`lbl${i}`} x={xs(i)} y={height-8} fontSize="12" fill="#6b7280" textAnchor="middle">{d}</text>
      ))}
    </svg>
  );
}
