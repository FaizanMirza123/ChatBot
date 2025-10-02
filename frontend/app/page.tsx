"use client";
import { useEffect, useMemo, useState, forwardRef, useImperativeHandle, useCallback, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

const NavItem = ({ label, active=false, onClick }: { label: string; active?: boolean; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className={clsx('sidebar-link w-full text-left', active && 'active')}>{label}</button>
);

export default function Page() {
  const router = useRouter();
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [activeSub, setActiveSub] = useState<'sources' | 'system-prompt' | null>(null);
  const [selectedMain, setSelectedMain] = useState<'training' | 'settings' | 'connect' | 'inbox' | 'analytics'>('settings');
  
  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/login');
  };
  
  // Lift state up to persist across section switches
  const [settingsTab, setSettingsTab] = useState<'general'|'appearance'|'messaging'|'starter'|'user'>('general');
  const [generalRef, setGeneralRef] = useState<{saveBotConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null>(null);
  
  // System prompt state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptLoading, setSystemPromptLoading] = useState(false);
  const [systemPromptSaving, setSystemPromptSaving] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(null);
  const [systemPromptSuccess, setSystemPromptSuccess] = useState<string | null>(null);
  
  // Global loading state for initial data load
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [appearanceRef, setAppearanceRef] = useState<{saveWidgetConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null>(null);
  const [messagingRef, setMessagingRef] = useState<{saveMessagingConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null>(null);
  const [starterRef, setStarterRef] = useState<{saveStarterQuestions: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null>(null);
  const [userFormRef, setUserFormRef] = useState<{saveUserFormConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null>(null);
  
  // Connect view state
  const [connectTab, setConnectTab] = useState<'javascript' | 'iframe'>('javascript');
  const [copied, setCopied] = useState<string | null>(null);
  
  // Inbox view state
  const [inboxTab, setInboxTab] = useState<'chats'|'users'>('chats');
  const [chats, setChats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [chatDetail, setChatDetail] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Settings General state
  const [botName, setBotName] = useState<string>('ChatBot');
  const [originalBotName, setOriginalBotName] = useState<string>('ChatBot');
  const [generalIsLoading, setGeneralIsLoading] = useState<boolean>(true);
  const [generalIsSaving, setGeneralIsSaving] = useState<boolean>(false);
  const [generalStatus, setGeneralStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Settings User Form state
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [originalFormEnabled, setOriginalFormEnabled] = useState<boolean>(true);
  const [fields, setFields] = useState<Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>>([]);
  const [originalFields, setOriginalFields] = useState<Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>>([]);
  const [userFormIsLoading, setUserFormIsLoading] = useState<boolean>(true);
  const [userFormIsSaving, setUserFormIsSaving] = useState<boolean>(false);
  const [userFormStatus, setUserFormStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Load all configs on mount
  useEffect(() => {
    if (dataLoaded) return; // Don't reload if data is already loaded
    
    const loadAllConfigs = async () => {
      try {
        setInitialLoading(true);
        setGeneralIsLoading(true);
        setUserFormIsLoading(true);
        setSystemPromptLoading(true);
        
        const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
        const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';
        
        // PARALLEL LOADING: Load all 3 configs simultaneously for faster initial load
        const [botData, formData, promptData] = await Promise.all([
          fetch(`${API_BASE}/bot-config`, {
            headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
          }).then(res => res.ok ? res.json() : null).catch(err => {
            console.error('Failed to load bot config:', err);
            setGeneralStatus({message: 'Failed to load bot configuration', type: 'error'});
            return null;
          }),
          
          fetch(`${API_BASE}/widget-config`, {
            headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
          }).then(res => res.ok ? res.json() : null).catch(err => {
            console.error('Failed to load form config:', err);
            setUserFormStatus({message: 'Failed to load form configuration', type: 'error'});
            return null;
          }),
          
          fetch(`${API_BASE}/system-prompt`, {
            headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
          }).then(res => res.ok ? res.json() : null).catch(err => {
            console.error('Failed to load system prompt:', err);
            return null;
          })
        ]);
        
        // Process bot config
        if (botData) {
          setBotName(botData.bot_name || 'ChatBot');
          setOriginalBotName(botData.bot_name || 'ChatBot');
        }
        
        // Process form config
        if (formData) {
          setFormEnabled(formData.form_enabled || false);
          setOriginalFormEnabled(formData.form_enabled || false);
          
          const formFields = formData.fields || [];
          const processedFields = formFields.map((field: any, index: number) => ({
            id: `field-${index}`,
            name: field.name || '',
            label: field.label || '',
            type: field.type || 'text',
            required: field.required || false,
            placeholder: field.placeholder || '',
            order: field.order || index
          }));
          
          setFields(processedFields);
          setOriginalFields(processedFields);
        }
        
        // Process system prompt
        if (promptData) {
          setSystemPrompt(promptData.text || '');
        }
        
      } finally {
        setInitialLoading(false);
        setGeneralIsLoading(false);
        setUserFormIsLoading(false);
        setSystemPromptLoading(false);
        setDataLoaded(true); // Mark data as loaded
      }
    };
    
    loadAllConfigs();
  }, [dataLoaded]);
  
  // System prompt functions
  const saveSystemPrompt = async () => {
    if (!systemPrompt.trim()) {
      setSystemPromptError('Please enter a system prompt');
      return;
    }
    
    setSystemPromptSaving(true);
    setSystemPromptError(null);
    setSystemPromptSuccess(null);
    
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';
      
      const response = await fetch(`${API_BASE}/system-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {})
        },
        body: JSON.stringify({ text: systemPrompt.trim() })
      });
      
      if (response.ok) {
        setSystemPromptSuccess('System prompt updated successfully!');
        setTimeout(() => setSystemPromptSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setSystemPromptError(errorData.detail || 'Failed to save system prompt');
      }
    } catch (error) {
      console.error('Error saving system prompt:', error);
      setSystemPromptError('Failed to save system prompt');
    } finally {
      setSystemPromptSaving(false);
    }
  };
  
  const resetSystemPrompt = async () => {
    setSystemPromptSaving(true);
    setSystemPromptError(null);
    setSystemPromptSuccess(null);
    
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';
      
      const response = await fetch(`${API_BASE}/system-prompt`, {
        method: 'DELETE',
        headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
      });
      
      if (response.ok) {
        // Reload the system prompt to get the default
        const promptResponse = await fetch(`${API_BASE}/system-prompt`, {
          headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
        });
        if (promptResponse.ok) {
          const promptData = await promptResponse.json();
          setSystemPrompt(promptData.text || '');
        }
        setSystemPromptSuccess('System prompt reset to default');
        setTimeout(() => setSystemPromptSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setSystemPromptError(errorData.detail || 'Failed to reset system prompt');
      }
    } catch (error) {
      console.error('Error resetting system prompt:', error);
      setSystemPromptError('Failed to reset system prompt');
    } finally {
      setSystemPromptSaving(false);
    }
  };
  
  // Global loading screen
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading ChatBot Admin</h2>
          <p className="text-gray-600">Please wait while we load your configuration...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr] block">
      {/* Sidebar */}
      <aside className=" text-white px-3 py-4 flex flex-col gap-2 bg-[#111686]">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white p-1 shadow-md ring-1 ring-white/30 flex items-center justify-center">
              <img src="/logo_web_1.png" alt="DiPietro logo" className="w-full h-full object-contain rounded-full" />
            </div>
          </div>
          <span className="text-white font-bold text-lg tracking-wide">DiPietro</span>
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          <NavItem label="Training" active={selectedMain==='training'} onClick={()=> setTrainingOpen(o=>!o)} />
          {trainingOpen && (
            <div className="space-y-1 pl-2">
              <button type="button" className={clsx('sidebar-subitem w-full text-left', activeSub==='sources' && 'active')} onClick={()=> { setSelectedMain('training'); setActiveSub('sources'); }}>Sources</button>
              <button type="button" className={clsx('sidebar-subitem w-full text-left', activeSub==='system-prompt' && 'active')} onClick={()=> { setSelectedMain('training'); setActiveSub('system-prompt'); }}>System Prompt</button>
            </div>
          )}
          <NavItem label="Settings" active={selectedMain==='settings'} onClick={()=> { setSelectedMain('settings'); setActiveSub(null); }} />
          <NavItem label="Connect" active={selectedMain==='connect'} onClick={()=> setSelectedMain('connect')} />
          <NavItem label="Inbox" active={selectedMain==='inbox'} onClick={()=> setSelectedMain('inbox')} />
          <NavItem label="Analytics" active={selectedMain==='analytics'} onClick={()=> setSelectedMain('analytics')} />
          
          {/* Logout Button */}
          <div className="mt-auto pt-4 border-t border-gray-700">
            <button 
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </div>
            </button>
          </div>
        </nav>
        {/* Removed Help Center / Contact Sales / Submit a Ticket per request */}
      </aside>

      {/* Main */}
      <main className="bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          {/* <button className="btn btn-ghost">Share</button> */}
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedMain('connect');
              // Scroll to bottom after a short delay to ensure the Connect tab is rendered
              setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }, 100);
            }}
          >
            Test bot
          </button>
        </div>

        <div className="px-6 pb-6">
          {selectedMain==='training' ? (
            activeSub === 'system-prompt' ? <SystemPromptView 
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              systemPromptSaving={systemPromptSaving}
              systemPromptError={systemPromptError}
              systemPromptSuccess={systemPromptSuccess}
              saveSystemPrompt={saveSystemPrompt}
              resetSystemPrompt={resetSystemPrompt}
            /> : <SourcesView />
          ) : selectedMain==='settings' ? (
            <SettingsView 
              tab={settingsTab}
              setTab={setSettingsTab}
              generalRef={generalRef}
              setGeneralRef={setGeneralRef}
              appearanceRef={appearanceRef}
              setAppearanceRef={setAppearanceRef}
              messagingRef={messagingRef}
              setMessagingRef={setMessagingRef}
              starterRef={starterRef}
              setStarterRef={setStarterRef}
              userFormRef={userFormRef}
              setUserFormRef={setUserFormRef}
              // General state
              botName={botName}
              setBotName={setBotName}
              originalBotName={originalBotName}
              setOriginalBotName={setOriginalBotName}
              generalIsLoading={generalIsLoading}
              setGeneralIsLoading={setGeneralIsLoading}
              generalIsSaving={generalIsSaving}
              setGeneralIsSaving={setGeneralIsSaving}
              generalStatus={generalStatus}
              setGeneralStatus={setGeneralStatus}
              // User Form state
              formEnabled={formEnabled}
              setFormEnabled={setFormEnabled}
              originalFormEnabled={originalFormEnabled}
              setOriginalFormEnabled={setOriginalFormEnabled}
              fields={fields}
              setFields={setFields}
              originalFields={originalFields}
              setOriginalFields={setOriginalFields}
              userFormIsLoading={userFormIsLoading}
              setUserFormIsLoading={setUserFormIsLoading}
              userFormIsSaving={userFormIsSaving}
              setUserFormIsSaving={setUserFormIsSaving}
              userFormStatus={userFormStatus}
              setUserFormStatus={setUserFormStatus}
            />
          ) : selectedMain==='connect' ? (
            <ConnectView 
              activeTab={connectTab}
              setActiveTab={setConnectTab}
              copied={copied}
              setCopied={setCopied}
            />
          ) : selectedMain==='inbox' ? (
            <InboxView 
              tab={inboxTab}
              setTab={setInboxTab}
              chats={chats}
              setChats={setChats}
              users={users}
              setUsers={setUsers}
              activeChat={activeChat}
              setActiveChat={setActiveChat}
              activeUser={activeUser}
              setActiveUser={setActiveUser}
              chatDetail={chatDetail}
              setChatDetail={setChatDetail}
              userDetail={userDetail}
              setUserDetail={setUserDetail}
              loading={loading}
              setLoading={setLoading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          ) : selectedMain==='analytics' ? (
            <AnalyticsView />
          ) : (
            <SettingsView 
              tab={settingsTab}
              setTab={setSettingsTab}
              generalRef={generalRef}
              setGeneralRef={setGeneralRef}
              appearanceRef={appearanceRef}
              setAppearanceRef={setAppearanceRef}
              messagingRef={messagingRef}
              setMessagingRef={setMessagingRef}
              starterRef={starterRef}
              setStarterRef={setStarterRef}
              userFormRef={userFormRef}
              setUserFormRef={setUserFormRef}
              // General state
              botName={botName}
              setBotName={setBotName}
              originalBotName={originalBotName}
              setOriginalBotName={setOriginalBotName}
              generalIsLoading={generalIsLoading}
              setGeneralIsLoading={setGeneralIsLoading}
              generalIsSaving={generalIsSaving}
              setGeneralIsSaving={setGeneralIsSaving}
              generalStatus={generalStatus}
              setGeneralStatus={setGeneralStatus}
              // User Form state
              formEnabled={formEnabled}
              setFormEnabled={setFormEnabled}
              originalFormEnabled={originalFormEnabled}
              setOriginalFormEnabled={setOriginalFormEnabled}
              fields={fields}
              setFields={setFields}
              originalFields={originalFields}
              setOriginalFields={setOriginalFields}
              userFormIsLoading={userFormIsLoading}
              setUserFormIsLoading={setUserFormIsLoading}
              userFormIsSaving={userFormIsSaving}
              setUserFormIsSaving={setUserFormIsSaving}
              userFormStatus={userFormStatus}
              setUserFormStatus={setUserFormStatus}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function SettingsView({
  tab, setTab, generalRef, setGeneralRef, appearanceRef, setAppearanceRef, 
  messagingRef, setMessagingRef, starterRef, setStarterRef, userFormRef, setUserFormRef,
  // General state
  botName, setBotName, originalBotName, setOriginalBotName, generalIsLoading, setGeneralIsLoading,
  generalIsSaving, setGeneralIsSaving, generalStatus, setGeneralStatus,
  // User Form state
  formEnabled, setFormEnabled, originalFormEnabled, setOriginalFormEnabled, fields, setFields,
  originalFields, setOriginalFields, userFormIsLoading, setUserFormIsLoading,
  userFormIsSaving, setUserFormIsSaving, userFormStatus, setUserFormStatus
}: {
  tab: 'general'|'appearance'|'messaging'|'starter'|'user';
  setTab: (tab: 'general'|'appearance'|'messaging'|'starter'|'user') => void;
  generalRef: {saveBotConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null;
  setGeneralRef: (ref: {saveBotConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => void;
  appearanceRef: {saveWidgetConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null;
  setAppearanceRef: (ref: {saveWidgetConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => void;
  messagingRef: {saveMessagingConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null;
  setMessagingRef: (ref: {saveMessagingConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => void;
  starterRef: {saveStarterQuestions: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null;
  setStarterRef: (ref: {saveStarterQuestions: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => void;
  userFormRef: {saveUserFormConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null;
  setUserFormRef: (ref: {saveUserFormConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => void;
  // General state props
  botName: string;
  setBotName: (name: string) => void;
  originalBotName: string;
  setOriginalBotName: (name: string) => void;
  generalIsLoading: boolean;
  setGeneralIsLoading: (loading: boolean) => void;
  generalIsSaving: boolean;
  setGeneralIsSaving: (saving: boolean) => void;
  generalStatus: {message: string, type: 'success' | 'error'} | null;
  setGeneralStatus: (status: {message: string, type: 'success' | 'error'} | null) => void;
  // User Form state props
  formEnabled: boolean;
  setFormEnabled: (enabled: boolean) => void;
  originalFormEnabled: boolean;
  setOriginalFormEnabled: (enabled: boolean) => void;
  fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>;
  setFields: (fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>) => void;
  originalFields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>;
  setOriginalFields: (fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>) => void;
  userFormIsLoading: boolean;
  setUserFormIsLoading: (loading: boolean) => void;
  userFormIsSaving: boolean;
  setUserFormIsSaving: (saving: boolean) => void;
  userFormStatus: {message: string, type: 'success' | 'error'} | null;
  setUserFormStatus: (status: {message: string, type: 'success' | 'error'} | null) => void;
}){
  
  const labelFor = {
    general: 'General', appearance: 'Appearance', messaging: 'Messaging', starter: 'Starter questions', user: 'User form'
  } as const;

  const handleSave = useCallback(() => {
    if (tab === 'general' && generalRef) {
      generalRef.saveBotConfig();
    } else if (tab === 'appearance' && appearanceRef) {
      appearanceRef.saveWidgetConfig();
    } else if (tab === 'messaging' && messagingRef) {
      messagingRef.saveMessagingConfig();
    } else if (tab === 'starter' && starterRef) {
      starterRef.saveStarterQuestions();
    } else if (tab === 'user' && userFormRef) {
      userFormRef.saveUserFormConfig();
    }
    // Add other tab save handlers here as needed
  }, [tab, generalRef, appearanceRef, messagingRef, starterRef, userFormRef]);

  const handleDiscard = useCallback(() => {
    if (tab === 'general' && generalRef) {
      generalRef.discardChanges();
    } else if (tab === 'appearance' && appearanceRef) {
      appearanceRef.discardChanges();
    } else if (tab === 'messaging' && messagingRef) {
      messagingRef.discardChanges();
    } else if (tab === 'starter' && starterRef) {
      starterRef.discardChanges();
    } else if (tab === 'user' && userFormRef) {
      userFormRef.discardChanges();
    }
    // Add other tab discard handlers here as needed
  }, [tab, generalRef, appearanceRef, messagingRef, starterRef, userFormRef]);

  const hasUnsavedChanges = useMemo(() => {
    if (tab === 'general' && generalRef) return generalRef.hasUnsavedChanges;
    if (tab === 'appearance' && appearanceRef) return appearanceRef.hasUnsavedChanges;
    if (tab === 'messaging' && messagingRef) return messagingRef.hasUnsavedChanges;
    if (tab === 'starter' && starterRef) return starterRef.hasUnsavedChanges;
    if (tab === 'user' && userFormRef) return userFormRef.hasUnsavedChanges;
    return false;
  }, [tab, generalRef, appearanceRef, messagingRef, starterRef, userFormRef]);

  const handleGeneralRef = useCallback((ref: {saveBotConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => {
    setGeneralRef(ref);
  }, []);

  const handleAppearanceRef = useCallback((ref: {saveWidgetConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => {
    setAppearanceRef(ref);
  }, []);

  const handleMessagingRef = useCallback((ref: {saveMessagingConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => {
    setMessagingRef(ref);
  }, []);

  const handleStarterRef = useCallback((ref: {saveStarterQuestions: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => {
    setStarterRef(ref);
  }, []);

  const handleUserFormRef = useCallback((ref: {saveUserFormConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean} | null) => {
    setUserFormRef(ref);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold mb-4">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Left settings nav */}
        <div className="rounded-xl border border-gray-200 p-2 h-fit">
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
          {tab==='general' && <SettingsGeneral 
            ref={handleGeneralRef} 
            botName={botName}
            setBotName={setBotName}
            originalBotName={originalBotName}
            setOriginalBotName={setOriginalBotName}
            isLoading={generalIsLoading}
            setIsLoading={setGeneralIsLoading}
            isSaving={generalIsSaving}
            setIsSaving={setGeneralIsSaving}
            status={generalStatus}
            setStatus={setGeneralStatus}
          />}
          {tab==='appearance' && <SettingsAppearance ref={handleAppearanceRef} />}
          {tab==='messaging' && <SettingsMessaging ref={handleMessagingRef} />}
          {tab==='starter' && <SettingsStarter ref={handleStarterRef} />}
          {tab==='user' && <SettingsUserForm 
            ref={handleUserFormRef} 
            formEnabled={formEnabled}
            setFormEnabled={setFormEnabled}
            originalFormEnabled={originalFormEnabled}
            setOriginalFormEnabled={setOriginalFormEnabled}
            fields={fields}
            setFields={setFields}
            originalFields={originalFields}
            setOriginalFields={setOriginalFields}
            isLoading={userFormIsLoading}
            setIsLoading={setUserFormIsLoading}
            isSaving={userFormIsSaving}
            setIsSaving={setUserFormIsSaving}
            status={userFormStatus}
            setStatus={setUserFormStatus}
          />}
          {tab!=='general' && tab!=='appearance' && tab!=='messaging' && tab!=='starter' && tab!=='user' && (
            <div className="p-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-600 text-[14px]">
                {labelFor[tab]} settings are not implemented yet in this prototype.
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button 
              className="btn btn-ghost"
              onClick={handleDiscard}
              disabled={!hasUnsavedChanges}
            >
              Discard changes
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SettingsGeneral = forwardRef<{saveBotConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean}, {
  botName: string;
  setBotName: (name: string) => void;
  originalBotName: string;
  setOriginalBotName: (name: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  status: {message: string, type: 'success' | 'error'} | null;
  setStatus: (status: {message: string, type: 'success' | 'error'} | null) => void;
}>(({
  botName, setBotName, originalBotName, setOriginalBotName, 
  isLoading, setIsLoading, isSaving, setIsSaving, status, setStatus
}, ref) => {

  const API_BASE = useMemo(()=> (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, ''), []);
  const ADMIN_KEY = useMemo(()=> process.env.NEXT_PUBLIC_ADMIN_API_KEY || '', []);

  // Save bot config
  const saveBotConfig = useCallback(async () => {
    try {
      setIsSaving(true);
      setStatus(null);
      const response = await fetch(`${API_BASE}/bot-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {})
        },
        body: JSON.stringify({ bot_name: botName })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOriginalBotName(data.bot_name);
        setStatus({message: 'Bot configuration saved successfully!', type: 'success'});
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus({message: `Error: ${errorData.detail || response.statusText}`, type: 'error'});
      }
    } catch (error) {
      console.error('Failed to save bot config:', error);
      setStatus({message: 'Failed to save bot configuration', type: 'error'});
    } finally {
      setIsSaving(false);
    }
  }, [API_BASE, ADMIN_KEY, botName]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setBotName(originalBotName);
    setStatus(null);
  }, [originalBotName]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => botName !== originalBotName, [botName, originalBotName]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    saveBotConfig,
    discardChanges,
    hasUnsavedChanges
  }), [saveBotConfig, discardChanges, hasUnsavedChanges]);

  return (
    <div className="p-6 grid gap-6">
      <div className="space-y-2">
        <label className="label">Bot name</label>
        <p className="text-[13px] text-gray-500">Give your bot a friendly name. This will be displayed in the chat widget.</p>
        <input 
          className="input" 
          value={botName}
          onChange={(e) => setBotName(e.target.value)}
          disabled={isLoading}
          placeholder="Enter bot name..."
        />
      </div>
      
      {status && (
        <div className={`text-[13px] p-3 rounded-lg ${
          status.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.message}
      </div>
      )}
    </div>
  );
});

const SettingsAppearance = forwardRef<{saveWidgetConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean}, {}>((props, ref) => {
  const [color, setColor] = useState<string>('#6b4eff');
  const [widgetIcon, setWidgetIcon] = useState<string>('💬');
  const [position, setPosition] = useState<'left'|'right'>('right');
  const [showBranding, setShowBranding] = useState<boolean>(true);
  const [openByDefault, setOpenByDefault] = useState<boolean>(false);
  const [starterQuestions, setStarterQuestions] = useState<boolean>(true);
  const [subheading, setSubheading] = useState<string>('Our bot answers instantly');
  const [inputPlaceholder, setInputPlaceholder] = useState<string>('Type your message...');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  const API_BASE = useMemo(()=> (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, ''), []);
  const ADMIN_KEY = useMemo(()=> process.env.NEXT_PUBLIC_ADMIN_API_KEY || '', []);

  const colorOptions = ['#6b4eff','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#a855f7','#f43f5e','#8b5cf6'];
  const iconOptions = ['💬','🤖','🗨️','💭','📨','🔮','✨','🧠'];

  // Load widget config on mount
  useEffect(() => {
    async function loadWidgetConfig() {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE}/widget-config`, {
          headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setColor(data.primary_color || '#6b4eff');
          setWidgetIcon(data.widget_icon || '💬');
          setPosition(data.widget_position || 'right');
          setSubheading(data.subheading || 'Our bot answers instantly');
          setInputPlaceholder(data.input_placeholder || 'Type your message...');
          setShowBranding(data.show_branding ?? true);
          setOpenByDefault(data.open_by_default ?? false);
          setStarterQuestions(data.starter_questions ?? true);
          setAvatarUrl(data.avatar_url || null);
        }
      } catch (error) {
        console.error('Failed to load widget config:', error);
        setStatus({message: 'Failed to load widget configuration', type: 'error'});
      } finally {
        setIsLoading(false);
      }
    }
    loadWidgetConfig();
  }, [API_BASE, ADMIN_KEY]);

  // Save widget config
  const saveWidgetConfig = useCallback(async () => {
    try {
      setIsSaving(true);
      setStatus(null);
      const response = await fetch(`${API_BASE}/widget-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {})
        },
        body: JSON.stringify({
          primary_color: color,
          widget_icon: widgetIcon,
          widget_position: position,
          input_placeholder: inputPlaceholder,
          subheading: subheading,
          show_branding: showBranding,
          open_by_default: openByDefault,
          starter_questions: starterQuestions
        })
      });
      
      if (response.ok) {
        setStatus({message: 'Appearance settings saved successfully!', type: 'success'});
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus({message: `Error: ${errorData.detail || response.statusText}`, type: 'error'});
      }
    } catch (error) {
      console.error('Failed to save widget config:', error);
      setStatus({message: 'Failed to save appearance settings', type: 'error'});
    } finally {
      setIsSaving(false);
    }
  }, [API_BASE, ADMIN_KEY, color, widgetIcon, position, inputPlaceholder, subheading, showBranding, openByDefault, starterQuestions]);

  // Track original values for discard functionality
  const [originalValues, setOriginalValues] = useState({
    color: '#6b4eff',
    widgetIcon: '💬',
    position: 'right' as 'left'|'right',
    subheading: 'Our bot answers instantly',
    inputPlaceholder: 'Type your message...',
    showBranding: true,
    openByDefault: false,
    starterQuestions: true
  });

  // Update original values when data is loaded
  useEffect(() => {
    if (!isLoading) {
      setOriginalValues({
        color,
        widgetIcon,
        position,
        subheading,
        inputPlaceholder,
        showBranding,
        openByDefault,
        starterQuestions
      });
    }
  }, [isLoading]); // Only depend on isLoading to avoid infinite loop

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return (
      color !== originalValues.color ||
      widgetIcon !== originalValues.widgetIcon ||
      position !== originalValues.position ||
      subheading !== originalValues.subheading ||
      inputPlaceholder !== originalValues.inputPlaceholder ||
      showBranding !== originalValues.showBranding ||
      openByDefault !== originalValues.openByDefault ||
      starterQuestions !== originalValues.starterQuestions
    );
  }, [color, widgetIcon, position, subheading, inputPlaceholder, showBranding, openByDefault, starterQuestions, originalValues]);

  // Discard changes function
  const discardChanges = useCallback(() => {
    setColor(originalValues.color);
    setWidgetIcon(originalValues.widgetIcon);
    setPosition(originalValues.position);
    setSubheading(originalValues.subheading);
    setInputPlaceholder(originalValues.inputPlaceholder);
    setShowBranding(originalValues.showBranding);
    setOpenByDefault(originalValues.openByDefault);
    setStarterQuestions(originalValues.starterQuestions);
    setStatus(null);
  }, [originalValues]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    saveWidgetConfig,
    discardChanges,
    hasUnsavedChanges
  }), [saveWidgetConfig, discardChanges, hasUnsavedChanges]);

  return (
    <div className="p-6 grid gap-6">
      <div className="space-y-2">
        <label className="label">Subheading (optional)</label>
        <p className="text-[13px] text-gray-500">Chatbot Subheading to be displayed in the chatbot</p>
        <input 
          className="input" 
          value={subheading}
          onChange={(e) => setSubheading(e.target.value)}
          disabled={isLoading}
          placeholder="Our bot answers instantly"
        />
      </div>

      <div className="space-y-2">
        <UploadField 
          label="Bot Avatar" 
          hint="Chatbot Picture to be displayed in the chatbot" 
          initialUrl={avatarUrl}
          onUploadSuccess={(url) => setAvatarUrl(url)}
        />
      </div>

      <div className="space-y-3">
        <label className="label">Accent Colour</label>
        <div className="space-y-3">
          {/* Color Swatches */}
        <div className="flex flex-wrap gap-2">
          {colorOptions.map(c => (
              <button 
                key={c} 
                type="button" 
                onClick={() => setColor(c)} 
                className={clsx(
                  'w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 hover:shadow-md',
                  color === c 
                    ? 'ring-2 ring-offset-2 ring-blue-500 border-blue-500 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300'
                )} 
                style={{backgroundColor: c}} 
                aria-label={`Pick color ${c}`} 
              />
            ))}
            <button 
              type="button" 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={clsx(
                'w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200',
                showColorPicker ? 'border-blue-500 bg-blue-50' : ''
              )}
              title="Custom Color"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          
          {/* Custom Color Picker */}
          {showColorPicker && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                    title="Color Picker"
                  />
                  <div 
                    className="absolute inset-0 rounded-lg border-2 border-white shadow-sm pointer-events-none"
                    style={{backgroundColor: color}}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hex Color
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Enter a valid hex color code (e.g., #FF5733)
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="label">Widget icon</label>
        <div className="flex flex-wrap gap-2">
          {iconOptions.map(ic => (
            <button 
              key={ic} 
              type="button" 
              onClick={() => setWidgetIcon(ic)} 
              className={clsx(
                'w-10 h-10 rounded-lg border-2 flex items-center justify-center text-[20px] bg-white transition-all duration-200 hover:scale-110 hover:shadow-md',
                widgetIcon === ic 
                  ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
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
        <input 
          className="input" 
          value={inputPlaceholder}
          onChange={(e) => setInputPlaceholder(e.target.value)}
          disabled={isLoading}
          placeholder="Type your message..."
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ToggleRow label="DiPietro branding on the widget" description="Hide/Show DiPietro banner at the bottom" value={showBranding} onChange={setShowBranding} />
        <ToggleRow label="Widget is open by default" description="Open/Close widget when user engage for the first time" value={openByDefault} onChange={setOpenByDefault} />
      </div>

      <ToggleRow label="Starter Questions" description="Show floating Starter Questions" value={starterQuestions} onChange={setStarterQuestions} />
      
      {status && (
        <div className={`text-[13px] p-3 rounded-lg ${
          status.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
});

function UploadField({label, hint, type = 'avatar', initialUrl = null, onUploadSuccess}:{label:string; hint:string; type?: 'avatar'; initialUrl?: string | null; onUploadSuccess?: (url: string) => void}){
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl);
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const API_BASE = useMemo(()=> (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, ''), []);
  const ADMIN_KEY = useMemo(()=> process.env.NEXT_PUBLIC_ADMIN_API_KEY || '', []);
  
  // Update when initialUrl changes (loaded from config)
  useEffect(() => {
    if (initialUrl) {
      setUploadedUrl(initialUrl);
    }
  }, [initialUrl]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setStatus({message: 'Please select a valid image file (PNG, JPG, GIF, WebP, SVG)', type: 'error'});
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setStatus({message: 'File size must be less than 5MB', type: 'error'});
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = '/widget-config/avatar';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {},
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedUrl(data.url);
        setStatus({message: 'File uploaded successfully!', type: 'success'});
        // Notify parent component of successful upload
        if (onUploadSuccess) {
          onUploadSuccess(data.url);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus({message: `Upload failed: ${errorData.detail || response.statusText}`, type: 'error'});
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({message: 'Upload failed. Please try again.', type: 'error'});
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
      <label className="label">{label}</label>
        <p className="text-sm text-gray-500 mt-1">{hint}</p>
      </div>
      
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id={`upload-${type}`}
        />
        
        <label 
          htmlFor={`upload-${type}`}
          className={clsx(
            'group relative block w-full cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50',
            isUploading 
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
              : uploadedUrl
                ? 'border-green-300 bg-green-50/50 hover:border-green-400'
                : 'border-gray-300 bg-white hover:border-blue-400'
          )}
        >
          <div className="p-6 text-center">
            {uploadedUrl ? (
              <div className="space-y-4">
                <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img 
                    src={`${API_BASE}${uploadedUrl}`} 
                    alt="Uploaded avatar" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Avatar uploaded</p>
                  <p className="text-xs text-gray-500">Click to change</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isUploading ? 'Uploading...' : 'Upload avatar'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isUploading ? 'Please wait...' : 'PNG, JPG, GIF up to 5MB'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </label>
        
        {status && (
          <div className={clsx(
            'mt-3 p-3 rounded-lg text-sm flex items-center gap-2',
            status.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          )}>
            <svg className={clsx(
              'w-4 h-4 flex-shrink-0',
              status.type === 'success' ? 'text-green-500' : 'text-red-500'
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {status.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({label, active, onClick}:{label:string; active?:boolean; onClick?:()=>void}){
  return (
    <button 
      type="button" 
      onClick={onClick} 
      className={clsx(
        'w-28 h-20 rounded-xl border-2 flex items-center justify-center text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md',
        active 
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50 text-blue-700 shadow-lg' 
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {label}
    </button>
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

const SettingsStarter = forwardRef<{
  saveStarterQuestions: () => void;
  discardChanges: () => void;
  hasUnsavedChanges: boolean;
}, {}>((props, ref) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [originalEnabled, setOriginalEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load starter questions from backend
  useEffect(() => {
    const loadStarterQuestions = async () => {
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/starter-questions`);
        if (response.ok) {
          const data = await response.json();
          const questionsArray = data.questions || [];
          setQuestions(questionsArray);
          setOriginalQuestions([...questionsArray]);
          setEnabled(data.enabled ?? true);
          setOriginalEnabled(data.enabled ?? true);
        }
      } catch (error) {
        console.error('Failed to load starter questions:', error);
        setStatus({ type: 'error', message: 'Failed to load starter questions' });
      } finally {
        setIsLoading(false);
      }
    };

    loadStarterQuestions();
  }, []);

  const saveStarterQuestions = useCallback(async () => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
    setIsSaving(true);
    setStatus(null);
    
    try {
      const response = await fetch(`${API_BASE}/starter-questions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questions.filter(q => q.trim()),
          enabled: enabled
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOriginalQuestions([...data.questions]);
        setOriginalEnabled(data.enabled ?? true);
        setStatus({ type: 'success', message: 'Starter questions saved successfully!' });
      } else {
        throw new Error('Failed to save starter questions');
      }
    } catch (error) {
      console.error('Error saving starter questions:', error);
      setStatus({ type: 'error', message: 'Failed to save starter questions' });
    } finally {
      setIsSaving(false);
    }
  }, [questions, enabled]);

  const discardChanges = useCallback(() => {
    setQuestions([...originalQuestions]);
    setEnabled(originalEnabled);
    setStatus(null);
  }, [originalQuestions, originalEnabled]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(questions) !== JSON.stringify(originalQuestions) || enabled !== originalEnabled;
  }, [questions, originalQuestions, enabled, originalEnabled]);

  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, '']);
    // Focus on the new input after it renders
    setTimeout(() => {
      const inputs = document.querySelectorAll('.question-input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) lastInput.focus();
    }, 100);
  };

  const moveQuestionUp = (index: number) => {
    if (index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      setQuestions(newQuestions);
    }
  };

  const moveQuestionDown = (index: number) => {
    if (index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    saveStarterQuestions,
    discardChanges,
    hasUnsavedChanges
  }), [saveStarterQuestions, discardChanges, hasUnsavedChanges]);

  return (
    <div className="p-6">
      {/* Header description */}
      <div className="mb-8">
        <div className="text-[15px] text-gray-600 mb-2">
          These questions will be shown to users when they first open the chat. 
          {/* <span className="text-[13px] text-blue-600 bg-blue-50 rounded-full px-3 py-1 ml-2 font-medium">
            ✨ Unlimited questions
          </span> */}
        </div>
      </div>

      {/* Enable/Disable toggle */}
      <div className="mb-8">
        <Row title="Enable Starter Questions" description="Show starter questions to users when they open the chat">
          <Toggle value={enabled} onChange={setEnabled} />
      </Row>
      </div>

      {/* Questions list */}
      <div className="space-y-4 mb-8">
        {questions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                </div>
            <p className="text-gray-500 font-medium">No starter questions yet</p>
            <p className="text-gray-400 text-sm">Add your first question to get started</p>
                </div>
        ) : (
          questions.map((question, index) => (
            <div key={index} className="group relative bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
              <div className="flex items-center gap-4 p-4">
                {/* Drag handle */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveQuestionUp(index)}
                    disabled={index === 0}
                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                    title="Move up"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveQuestionDown(index)}
                    disabled={index === questions.length - 1}
                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                    title="Move down"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Question number */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                  {index + 1}
              </div>

                {/* Input field */}
                <input
                  type="text"
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder={`Enter starter question ${index + 1}...`}
                  className="question-input flex-1 px-4 py-3 border-0 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 text-[15px] font-medium"
                  maxLength={200}
                />

                {/* Delete button */}
                <button
                  onClick={() => deleteQuestion(index)}
                  className="w-10 h-10 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="Delete question"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
            </div>
            </div>
          ))
        )}
        </div>

      {/* Add question button */}
      <button 
        onClick={addQuestion}
        className="w-full inline-flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 px-6 py-4 text-[15px] font-semibold text-gray-600 hover:text-blue-600 transition-all duration-200 group"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        Add New Starter Question
          </button>

      {/* Status message */}
      {status && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${
          status.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {status.message}
        </div>
      </div>
      )}
    </div>
  );
});


const SettingsMessaging = forwardRef<{saveMessagingConfig: () => void, discardChanges: () => void, hasUnsavedChanges: boolean}, {}>((props, ref) => {
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const API_BASE = useMemo(()=> (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, ''), []);
  const ADMIN_KEY = useMemo(()=> process.env.NEXT_PUBLIC_ADMIN_API_KEY || '', []);

  // Load messaging config on mount
  useEffect(() => {
    async function loadMessagingConfig() {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE}/messaging-config`, {
          headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setAiModel(data.ai_model || 'gpt-4o');
          setConversational(data.conversational ?? true);
          setStrictFaq(data.strict_faq ?? true);
          setRespLen(data.response_length || 'Medium');
          setSuggestFollowups(data.suggest_followups ?? false);
          setAllowImages(data.allow_images ?? false);
          setShowSources(data.show_sources ?? true);
          setPostFeedback(data.post_feedback ?? true);
          setMultilingual(data.multilingual ?? true);
          setShowWelcome(data.show_welcome ?? true);
          setWelcomeMsg(data.welcome_message || "Hey there, how can I help you?");
          setNoSourceMsg(data.no_source_message || "The bot is yet to be trained, please add the data and train the bot.");
          setServerErrMsg(data.server_error_message || "Apologies, there seems to be a server error.");
        }
      } catch (error) {
        console.error('Failed to load messaging config:', error);
        setStatus({message: 'Failed to load messaging configuration', type: 'error'});
      } finally {
        setIsLoading(false);
      }
    }
    loadMessagingConfig();
  }, [API_BASE, ADMIN_KEY]);

  // Save messaging config
  const saveMessagingConfig = useCallback(async () => {
    try {
      setIsSaving(true);
      setStatus(null);
      const response = await fetch(`${API_BASE}/messaging-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {})
        },
        body: JSON.stringify({
          ai_model: aiModel,
          conversational: conversational,
          strict_faq: strictFaq,
          response_length: respLen,
          suggest_followups: suggestFollowups,
          allow_images: allowImages,
          show_sources: showSources,
          post_feedback: postFeedback,
          multilingual: multilingual,
          show_welcome: showWelcome,
          welcome_message: welcomeMsg,
          no_source_message: noSourceMsg,
          server_error_message: serverErrMsg
        })
      });
      
      if (response.ok) {
        setStatus({message: 'Messaging settings saved successfully!', type: 'success'});
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus({message: `Error: ${errorData.detail || response.statusText}`, type: 'error'});
      }
    } catch (error) {
      console.error('Failed to save messaging config:', error);
      setStatus({message: 'Failed to save messaging settings', type: 'error'});
    } finally {
      setIsSaving(false);
    }
  }, [API_BASE, ADMIN_KEY, aiModel, conversational, strictFaq, respLen, suggestFollowups, allowImages, showSources, postFeedback, multilingual, showWelcome, welcomeMsg, noSourceMsg, serverErrMsg]);

  // Track original values for discard functionality
  const [originalValues, setOriginalValues] = useState({
    aiModel: 'gpt-4o',
    conversational: true,
    strictFaq: true,
    respLen: 'Medium' as 'Short'|'Medium'|'Long',
    suggestFollowups: false,
    allowImages: false,
    showSources: true,
    postFeedback: true,
    multilingual: true,
    showWelcome: true,
    welcomeMsg: "Hey there, how can I help you?",
    noSourceMsg: "The bot is yet to be trained, please add the data and train the bot.",
    serverErrMsg: "Apologies, there seems to be a server error."
  });

  // Update original values when data is loaded
  useEffect(() => {
    if (!isLoading) {
      setOriginalValues({
        aiModel,
        conversational,
        strictFaq,
        respLen,
        suggestFollowups,
        allowImages,
        showSources,
        postFeedback,
        multilingual,
        showWelcome,
        welcomeMsg,
        noSourceMsg,
        serverErrMsg
      });
    }
  }, [isLoading]); // Only depend on isLoading to avoid infinite loop

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return (
      aiModel !== originalValues.aiModel ||
      conversational !== originalValues.conversational ||
      strictFaq !== originalValues.strictFaq ||
      respLen !== originalValues.respLen ||
      suggestFollowups !== originalValues.suggestFollowups ||
      allowImages !== originalValues.allowImages ||
      showSources !== originalValues.showSources ||
      postFeedback !== originalValues.postFeedback ||
      multilingual !== originalValues.multilingual ||
      showWelcome !== originalValues.showWelcome ||
      welcomeMsg !== originalValues.welcomeMsg ||
      noSourceMsg !== originalValues.noSourceMsg ||
      serverErrMsg !== originalValues.serverErrMsg
    );
  }, [aiModel, conversational, strictFaq, respLen, suggestFollowups, allowImages, showSources, postFeedback, multilingual, showWelcome, welcomeMsg, noSourceMsg, serverErrMsg, originalValues]);

  // Discard changes function
  const discardChanges = useCallback(() => {
    setAiModel(originalValues.aiModel);
    setConversational(originalValues.conversational);
    setStrictFaq(originalValues.strictFaq);
    setRespLen(originalValues.respLen);
    setSuggestFollowups(originalValues.suggestFollowups);
    setAllowImages(originalValues.allowImages);
    setShowSources(originalValues.showSources);
    setPostFeedback(originalValues.postFeedback);
    setMultilingual(originalValues.multilingual);
    setShowWelcome(originalValues.showWelcome);
    setWelcomeMsg(originalValues.welcomeMsg);
    setNoSourceMsg(originalValues.noSourceMsg);
    setServerErrMsg(originalValues.serverErrMsg);
    setStatus(null);
  }, [originalValues]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    saveMessagingConfig,
    discardChanges,
    hasUnsavedChanges
  }), [saveMessagingConfig, discardChanges, hasUnsavedChanges]);

  return (
    <div className="p-6 grid gap-6">
      <Row title="AI Model" description="Select a model to power your bot" trailing={<Select value={aiModel} onChange={(v)=> setAiModel(v)} options={['gpt-3.5-turbo','gpt-4o']} />} />

      <Row title={<span>Conversational Mode </span>} description="Segment bot's responses into shorter, more readable messages. The entire response still counts as one message">
        <Toggle value={conversational} onChange={setConversational} />
      </Row>

      <Row title="Strict FAQ Responses" description="When enabled, responses are limited to exact FAQ content.">
        <Toggle value={strictFaq} onChange={setStrictFaq} />
      </Row>

      <Row title="Response Length" description="Select the response length of your bot" trailing={<Select value={respLen} onChange={(v)=> setRespLen(v as any)} options={['Short','Medium','Long']} />} />

      {/* <Row title="Suggest Follow Up Questions" description="If enabled, we will suggest 2 new follow up questions from your knowledge base">
        <Toggle value={suggestFollowups} onChange={setSuggestFollowups} />
      </Row> */}

      {/* <Row title="Allow Image Usage" description="Allows the bot to use the scraped images for training and response generation">
        <Toggle value={allowImages} onChange={setAllowImages} />
      </Row> */}

      {/* <Row title="Show sources with the response" description="Hide/Show sources along with responses">
        <Toggle value={showSources} onChange={setShowSources} />
      </Row> */}

      {/* <Row title="Post chat feedback" description="Hide/Show post chat feedback">
        <Toggle value={postFeedback} onChange={setPostFeedback} />
      </Row> */}

      {/* <Row title="Multilingual Support" description="If disabled, the bot will stick to the selected language">
        <Toggle value={multilingual} onChange={setMultilingual} />
      </Row> */}

      <Row title="Show floating welcome message" description="Toggle visibility of the Welcome Message">
        <Toggle value={showWelcome} onChange={setShowWelcome} />
      </Row>

      <div className="space-y-2">
        <label className="label">Welcome Message</label>
        <p className="text-[13px] text-gray-500">Customize the welcome message that is shown to your customers</p>
        <input className="input" value={welcomeMsg} onChange={e=> setWelcomeMsg(e.target.value)} />
        {/* <div className="text-[12px] text-gray-500">Note: Now you can use @ to add variables. <button className="text-primary-500">Learn more</button></div> */}
      </div>

      {/* <div className="space-y-2">
        <label className="label">Message shown when no Source is added</label>
        <input className="input" value={noSourceMsg} onChange={e=> setNoSourceMsg(e.target.value)} />
      </div> */}

      <div className="space-y-2">
        <label className="label">Message shown when there is a Server Error</label>
        <input className="input" value={serverErrMsg} onChange={e=> setServerErrMsg(e.target.value)} />
      </div>

      {status && (
        <div className={`text-[13px] p-3 rounded-lg ${
          status.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
});

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold mb-4">Sources</h1>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-6 text-[14px] text-gray-600">
          <button className={clsx('relative px-2 py-3', tab==='files' && 'text-primary-500')} onClick={()=>setTab('files')}>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M7 4h5l3 3h2a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 4v3a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              Files
            </span>
            {tab==='files' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500" />}
          </button>
          <button className={clsx('relative px-2 py-3', tab==='faqs' && 'text-primary-500')} onClick={()=>setTab('faqs')}>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="1.6"/>
                  <path d="M9.5 9a2.5 2.5 0 0 1 4.6 1.2c0 1.8-2.1 2-2.1 3.3" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="12" cy="17.5" r="1" fill="#ef4444"/>
                </svg>
              </span>
              FAQs
            </span>
            {tab==='faqs' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500" />}
          </button>
        </div>
      </div>

      {tab==='files' ? <FilesSection/> : <FaqsSection/>}
    </div>
  );
}

function FilesSection(){
  const API_BASE = useMemo(()=> (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, ''), []);
  const ADMIN_KEY = useMemo(()=> process.env.NEXT_PUBLIC_ADMIN_API_KEY || '', []);
  const [file, setFile] = useState<File|null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [docs, setDocs] = useState<Array<{id:number; filename:string; document_type:string; upload_date:string; processed:boolean; chunk_count:number;}>>([]);
  const [visibility, setVisibility] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    try{
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/documents`, { cache:'no-store' });
      const data = await res.json();
      setDocs(data.documents || []);
      // fetch visibilities in parallel
      const items: Array<{id:number}> = (data.documents||[]).map((d:any)=>({id:d.id}));
      await Promise.all(items.map(async ({id})=>{
        try{
          const r = await fetch(`${API_BASE}/documents/${id}/visibility`, { cache:'no-store' });
          if(!r.ok) return;
          const v = await r.json();
          setVisibility(prev=> ({...prev, [id]: !!v.is_public}));
        }catch(_){ /* ignore */ }
      }));
    }catch(e){ setStatus('Failed to load documents'); }
    finally{ setIsLoading(false); }
  }, [API_BASE, ADMIN_KEY]);
  
  useEffect(()=>{ fetchDocs(); }, [fetchDocs]);

  async function upload(){
    if(!file) { setStatus('Select a file'); return; }
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true); setStatus('Uploading...');
    try{
      const res = await fetch(`${API_BASE}/documents/upload`, { method:'POST', body: fd, headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : undefined });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){ setStatus(`Error: ${data.detail || res.statusText}`); }
      else { setStatus(`Uploaded: ${data.filename} (${data.chunk_count} chunks)`); setFile(null); await fetchDocs(); }
    }catch(e:any){ setStatus(`Error: ${e?.message||'Upload failed'}`); }
    finally{ setBusy(false); }
  }

  async function del(id:number){
    if(!confirm('Delete this document?')) return;
    try{
      const res = await fetch(`${API_BASE}/documents/${id}`, { method:'DELETE', headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : undefined });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){ alert(data.detail || res.statusText); }
      else { await fetchDocs(); }
    }catch(_){ /* noop */ }
  }

  // Dropzone handlers
  function onDrop(e: React.DragEvent){ e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) setFile(f); }
  function onDragOver(e: React.DragEvent){ e.preventDefault(); }

  return (
    <div className="pt-6 space-y-6">
      <h3 className="text-[15px] font-semibold">Upload files to train DiPietro on your data</h3>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="rounded-lg border-2 border-dashed border-gray-200 h-64 flex items-center justify-center"
        >
          <label className="text-center cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-gray-500">
              {/* Cloud upload icon to match desired UI */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 14a4 4 0 0 1 .7-7.95A5.5 5.5 0 0 1 17.1 8H18a4 4 0 0 1 .6 7.96" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="m8.8 11.2 3.2-3.2 3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-primary-500 font-medium">Click to upload</div>
            <div className="text-[13px] text-gray-500">or drag and drop</div>
            <div className="text-[12px] text-gray-500 mt-1">Up to 100 MB in size. PDF, DOC, DOCX, TXT</div>
            <input className="hidden" type="file" accept=".pdf,.doc,.docx,.txt" onChange={e=> setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="mt-4">
          <button disabled={busy || !file} onClick={upload} className="btn btn-primary">{busy ? 'Uploading...' : 'Upload & train'}</button>
          {file && <span className="ml-3 text-[13px] text-gray-600">{file.name}</span>}
        </div>
        {status && <div className="text-[13px] text-gray-600 mt-2">{status}</div>}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 font-semibold">Files</div>
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>Loading files...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-[1fr_120px_140px_140px_160px_40px] px-6 py-3 text-[13px] text-gray-500">
                <div>Name</div><div>Type</div><div>Visibility</div><div>Status</div><div>Updated</div><div></div>
              </div>
              {(docs||[]).map(d=> (
              <div key={d.id} className="min-w-[900px] border-t border-gray-100 px-6 py-3 grid grid-cols-[1fr_120px_140px_140px_160px_40px] items-center text-[14px]">
                <div className="truncate" title={d.filename}>{d.filename}</div>
                <div className="text-gray-500 uppercase">{d.document_type}</div>
                <div>
                  <Toggle value={!!visibility[d.id]} onChange={async(v)=>{
                    // optimistic update
                    setVisibility(prev=> ({...prev, [d.id]: v}));
                    try{ const res= await fetch(`${API_BASE}/documents/${d.id}/visibility`, { method:'POST', headers: { 'Content-Type':'application/json', ...(ADMIN_KEY? { 'X-Api-Key': ADMIN_KEY }: {}) }, body: JSON.stringify({ is_public: v }) }); if(!res.ok){ setVisibility(prev=> ({...prev, [d.id]: !v})); }}catch(_){ setVisibility(prev=> ({...prev, [d.id]: !v})); }
                  }} />
                </div>
                <div>{d.processed ? <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-[12px] px-2 py-0.5">Trained ({d.chunk_count})</span> : <span className="text-[12px] text-gray-500">Processing…</span>}</div>
                <div className="text-gray-500">{new Date(d.upload_date).toLocaleString()}</div>
                <div>
                  <button 
                    className="inline-flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200 group" 
                    onClick={()=> del(d.id)} 
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              ))}
              {(!docs || docs.length===0) && (
                <div className="px-6 py-4 text-[14px] text-gray-500">No documents uploaded yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FaqsSection(){
  const API_BASE = useMemo(()=> (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, ''), []);
  const ADMIN_KEY = useMemo(()=> process.env.NEXT_PUBLIC_ADMIN_API_KEY || '', []);
  const [csv, setCsv] = useState<File|null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [faqs, setFaqs] = useState<Array<{id:number; question:string; answer:string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadFaqs = useCallback(async () => {
    try{ 
      setIsLoading(true);
      const r = await fetch(`${API_BASE}/faqs`, { cache:'no-store' }); 
      const d = await r.json(); 
      setFaqs(d.faqs||[]); 
    }catch(_){ setStatus('Failed to load FAQs'); }
    finally{ setIsLoading(false); }
  }, [API_BASE, ADMIN_KEY]);
  
  useEffect(()=>{ loadFaqs(); }, [loadFaqs]);

  async function uploadCsv(){
    if(!csv){ setStatus('Select a CSV file'); return; }
    const fd = new FormData(); fd.append('file', csv);
    setBusy(true); setStatus('Uploading...');
    try{
      const res = await fetch(`${API_BASE}/faqs/upload-csv`, { method:'POST', body: fd, headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : undefined });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){ setStatus(`Error: ${data.detail || res.statusText}`); }
      else { setStatus(`Imported ${data.created} FAQs${data.skipped?`, skipped ${data.skipped}`:''}`); setCsv(null); await loadFaqs(); }
    }catch(e:any){ setStatus(`Error: ${e?.message||'Upload failed'}`); }
    finally{ setBusy(false); }
  }

  async function delFaq(id:number){
    if(!confirm('Delete this FAQ?')) return;
    try{ const res=await fetch(`${API_BASE}/faqs/${id}`, { method:'DELETE', headers: ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : undefined }); if(res.ok){ await loadFaqs(); } }catch(_){ }
  }

  return (
    <div className="pt-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">FAQs Example</div>
          <div className="text-[13px] text-gray-500">You can download the attachment example and use them as a starting point for your file</div>
        </div>
        <a className="btn btn-ghost" href="/faq_template (4).csv" download>Download</a>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div
          onDrop={(e)=>{ e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) setCsv(f);} }
          onDragOver={(e)=> e.preventDefault()}
          className="rounded-lg border-2 border-dashed border-gray-200 h-64 flex items-center justify-center"
        >
          <label className="text-center cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-gray-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 14a4 4 0 0 1 .7-7.95A5.5 5.5 0 0 1 17.1 8H18a4 4 0 0 1 .6 7.96" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="m8.8 11.2 3.2-3.2 3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-primary-500 font-medium">Click to upload</div>
            <div className="text-[13px] text-gray-500">or drag and drop</div>
            <div className="text-[12px] text-gray-500 mt-1">Up to 100 MB in size. CSV (See Template above).</div>
            <input className="hidden" type="file" accept=".csv" onChange={e=> setCsv(e.target.files?.[0]||null)} />
          </label>
        </div>
        <div className="mt-4">
          <button disabled={busy || !csv} onClick={uploadCsv} className="btn btn-primary">{busy ? 'Uploading...' : 'Upload and train'}</button>
          {csv && <span className="ml-3 text-[13px] text-gray-600">{csv.name}</span>}
        </div>
        {status && <div className="text-[13px] text-gray-600 mt-2">{status}</div>}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 font-semibold">Added FAQs</div>
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>Loading FAQs...</span>
              </div>
            </div>
          ) : (faqs||[]).length===0 ? (
            <div className="px-6 py-4 text-[14px] text-gray-500">No FAQs yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {faqs.map(f=> (
                <div key={f.id} className="px-6 py-3 grid md:grid-cols-[1fr_2fr_40px] items-start gap-4">
                  <div className="font-medium">{f.question}</div>
                  <div className="text-gray-700 text-[14px] whitespace-pre-wrap">{f.answer}</div>
                  <button 
                    className="inline-flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200 group" 
                    onClick={()=> delFaq(f.id)} 
                    aria-label="Delete FAQ"
                    title="Delete FAQ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemPromptView({
  systemPrompt,
  setSystemPrompt,
  systemPromptSaving,
  systemPromptError,
  systemPromptSuccess,
  saveSystemPrompt,
  resetSystemPrompt
}: {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  systemPromptSaving: boolean;
  systemPromptError: string | null;
  systemPromptSuccess: string | null;
  saveSystemPrompt: () => void;
  resetSystemPrompt: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-semibold">System Prompt</h1>
      </div>
      
      {/* Description */}
      <div className="mb-6">
        <p className="text-[14px] text-gray-600 mb-3">
          The system prompt defines your bot's personality, behavior, and response style. It acts as instructions that guide how the AI responds to user messages.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• The system prompt is sent with every conversation</li>
            <li>• It helps the bot understand its role and personality</li>
            <li>• Use it to set tone, provide context, or define boundaries</li>
            <li>• Keep it concise but descriptive for best results</li>
          </ul>
      </div>
            </div>

      {/* System Prompt Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-2">
            System Prompt
          </label>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter your system prompt here... For example: 'You are a helpful customer service assistant for a tech company. Be friendly, professional, and concise in your responses.'"
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={systemPromptSaving}
          />
          <div className="mt-2 text-xs text-gray-500">
            {systemPrompt.length} characters
          </div>
        </div>

        {/* Status Messages */}
        {systemPromptError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{systemPromptError}</p>
          </div>
        )}
        
        {systemPromptSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{systemPromptSuccess}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={saveSystemPrompt}
            disabled={systemPromptSaving || !systemPrompt.trim()}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {systemPromptSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save System Prompt'
            )}
          </button>
          
          <button
            onClick={resetSystemPrompt}
            disabled={systemPromptSaving}
            className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Example */}
      <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📝 Example System Prompt:</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <code className="text-sm text-gray-700">
            You are a helpful customer service assistant for TechCorp. Your role is to:<br/>
            • Answer questions about our products and services<br/>
            • Help customers with technical issues<br/>
            • Be friendly, professional, and concise<br/>
            • If you don't know something, offer to connect them with a human agent<br/>
            <br/>
            Always maintain a positive tone and focus on solving the customer's problem.
          </code>
        </div>
      </div>
    </div>
  );
}

function ConnectView({
  activeTab, setActiveTab, copied, setCopied
}: {
  activeTab: 'javascript' | 'iframe';
  setActiveTab: (tab: 'javascript' | 'iframe') => void;
  copied: string | null;
  setCopied: (copied: string | null) => void;
}){
  
  // Get the current API base URL
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api';
  
  // JavaScript integration code
  const javascriptCode = `<!-- Add this code before the closing </body> tag -->
<script src="${API_BASE}/static/chatbot-widget.v2.js" 
        data-api-base="${API_BASE}/" 
        defer 
        onload="window.createChatbotWidget({ apiBase: '${API_BASE}/' });">
</script>`;

  // iFrame integration code
  const iframeCode = `<!-- Add this code where you want the chatbot to appear -->
<iframe 
  src="${API_BASE}/widget-iframe" 
  width="400" 
  height="600" 
  frameborder="0" 
  style="border: none; 
         border-radius: 20px; 
         box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
                     0 10px 10px -5px rgba(0, 0, 0, 0.04);"
  title="Chatbot Widget">
</iframe>`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Chatbot</h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Choose how you want to integrate the chatbot into your website. Both methods are easy to implement and fully customizable.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 max-w-sm mx-auto">
            <div className="flex">
              <button
                onClick={() => setActiveTab('javascript')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-xs transition-all duration-200 ${
                  activeTab === 'javascript'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                JavaScript
              </button>
              <button
                onClick={() => setActiveTab('iframe')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-xs transition-all duration-200 ${
                  activeTab === 'iframe'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                iFrame
              </button>
            </div>
          </div>
        </div>

        {/* JavaScript Tab */}
        {activeTab === 'javascript' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
    <div>
                  <h2 className="text-lg font-bold text-white mb-1">JavaScript Integration</h2>
                  <p className="text-blue-100 text-sm">
                    Floating widget with smooth animations and responsive design
                  </p>
        </div>
              </div>
          </div>

            <div className="p-4">
              {/* Code Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Integration Code</h3>
                  <button
                    onClick={() => copyToClipboard(javascriptCode, 'javascript')}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                  >
                    {copied === 'javascript' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Code
                      </>
                    )}
                  </button>
          </div>

                <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto border border-gray-700">
                  <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words font-mono">
                    <code>{javascriptCode}</code>
                  </pre>
                </div>
              </div>

              {/* Implementation Steps */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Implementation Steps
                  </h4>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                      <span className="text-gray-700 text-sm">Copy the integration code above</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                      <span className="text-gray-700 text-sm">Paste it before the closing <code className="bg-blue-100 px-1 py-0.5 rounded text-xs font-mono">&lt;/body&gt;</code> tag</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
                      <span className="text-gray-700 text-sm">Save your file and refresh your website</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">4</span>
                      <span className="text-gray-700 text-sm">The chatbot will appear as a floating button</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Key Features
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Automatic configuration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">No additional CSS required</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Fully responsive design</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Admin settings applied automatically</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iFrame Tab */}
        {activeTab === 'iframe' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">iFrame Integration</h2>
                  <p className="text-green-100 text-sm">
                    Embedded widget with full control over placement and styling
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {/* Code Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Integration Code</h3>
                  <button
                    onClick={() => copyToClipboard(iframeCode, 'iframe')}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                  >
                    {copied === 'iframe' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Code
                      </>
                    )}
                  </button>
          </div>

                <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto border border-gray-700">
                  <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words font-mono">
                    <code>{iframeCode}</code>
                  </pre>
                </div>
          </div>

              {/* Implementation Steps */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Implementation Steps
                  </h4>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                      <span className="text-gray-700 text-sm">Copy the iframe code above</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                      <span className="text-gray-700 text-sm">Paste it where you want the chatbot to appear</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
                      <span className="text-gray-700 text-sm">Adjust <code className="bg-green-100 px-1 py-0.5 rounded text-xs font-mono">width</code> and <code className="bg-green-100 px-1 py-0.5 rounded text-xs font-mono">height</code> as needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">4</span>
                      <span className="text-gray-700 text-sm">Save your file and refresh your website</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Customization Options
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-blue-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <strong>Width:</strong> Change the <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">width</code> attribute (default: 400px)
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-blue-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <strong>Height:</strong> Change the <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">height</code> attribute (default: 600px)
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-blue-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <strong>Positioning:</strong> Use CSS to position anywhere on your page
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-blue-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <strong>Responsive:</strong> Use CSS media queries for mobile
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            </div>
          )}

        {/* Live Preview */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Live Preview
            </h3>
            <p className="text-purple-100 text-sm">
              Test your chatbot integration by opening the preview in a new tab.
            </p>
        </div>
          
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href="/preview-iframe.html"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">iFrame Preview</h4>
                    <p className="text-green-100 text-xs">Test embedded widget</p>
                  </div>
                </div>
                <div className="flex items-center text-green-100 group-hover:text-white">
                  <span className="text-xs font-medium">Open Preview</span>
                  <svg className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>

              <a
                href="/preview-javascript.html"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">JavaScript Preview</h4>
                    <p className="text-blue-100 text-xs">Test floating widget</p>
                  </div>
                </div>
                <div className="flex items-center text-blue-100 group-hover:text-white">
                  <span className="text-xs font-medium">Open Preview</span>
                  <svg className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxView({
  tab, setTab, chats, setChats, users, setUsers, activeChat, setActiveChat,
  activeUser, setActiveUser, chatDetail, setChatDetail, userDetail, setUserDetail,
  loading, setLoading, searchTerm, setSearchTerm
}: {
  tab: 'chats'|'users';
  setTab: (tab: 'chats'|'users') => void;
  chats: any[];
  setChats: (chats: any[]) => void;
  users: any[];
  setUsers: (users: any[]) => void;
  activeChat: any;
  setActiveChat: (chat: any) => void;
  activeUser: any;
  setActiveUser: (user: any) => void;
  chatDetail: any;
  setChatDetail: (detail: any) => void;
  userDetail: any;
  setUserDetail: (detail: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}){

  // Fetch chats
  const fetchChats = useCallback(async () => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/inbox/chats`, {
        headers: {
          'X-Admin-Key': 'admin123'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        if (data.length > 0 && !activeChat) {
          setActiveChat(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [activeChat]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/inbox/users`, {
        headers: {
          'X-Admin-Key': 'admin123'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        if (data.length > 0 && !activeUser) {
          setActiveUser(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [activeUser]);

  // Fetch chat detail
  const fetchChatDetail = useCallback(async (chatId: number) => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
    try {
      const response = await fetch(`${API_BASE}/api/inbox/chats/${chatId}`, {
        headers: {
          'X-Admin-Key': 'admin123'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChatDetail(data);
      }
    } catch (error) {
      console.error('Error fetching chat detail:', error);
    }
  }, []);

  // Fetch user detail
  const fetchUserDetail = useCallback(async (userId: number) => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
    try {
      const response = await fetch(`${API_BASE}/api/inbox/users/${userId}`, {
        headers: {
          'X-Admin-Key': 'admin123'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserDetail(data);
      }
    } catch (error) {
      console.error('Error fetching user detail:', error);
    }
  }, []);

  // Load data on mount and tab change
  useEffect(() => {
    if (tab === 'chats') {
      fetchChats();
    } else {
      fetchUsers();
    }
  }, [tab, fetchChats, fetchUsers]);

  // Load detail when active item changes
  useEffect(() => {
    if (activeChat) {
      fetchChatDetail(activeChat.id);
    }
  }, [activeChat, fetchChatDetail]);

  useEffect(() => {
    if (activeUser) {
      fetchUserDetail(activeUser.id);
    }
  }, [activeUser, fetchUserDetail]);

  // Filter chats by search term
  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.preview?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.ip_address?.includes(searchTerm)
  );

  // Filter users by search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ip_address?.includes(searchTerm)
  );

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    if (diffInMinutes < 43800) return `${Math.floor(diffInMinutes / 10080)}w ago`;
    return `${Math.floor(diffInMinutes / 43800)}mo ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-semibold">Inbox</h1>
        <button className="btn btn-ghost">Export all data</button>
      </div>

      <div className="mb-6 inline-flex bg-white rounded-xl border border-gray-200 shadow-sm p-1">
        <button 
          onClick={()=>setTab('chats')} 
          className={clsx(
            'px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
            tab==='chats' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chats
        </button>
        <button 
          onClick={()=>setTab('users')} 
          className={clsx(
            'px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
            tab==='users' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Users
        </button>
      </div>

      {tab==='chats' ? (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_320px] gap-6">
          {/* Left: chat list */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  placeholder="Search by IP or content" 
                  className="flex-1 outline-none text-sm placeholder-gray-400" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    Loading chats...
                  </div>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No chats found</p>
                </div>
              ) : (
                filteredChats.map(chat => (
                  <button 
                    key={chat.id} 
                    onClick={()=> setActiveChat(chat)} 
                    className={clsx(
                      'w-full text-left px-4 py-4 transition-all duration-200 hover:bg-gray-50 group',
                      activeChat?.id === chat.id 
                        ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' 
                        : 'hover:shadow-sm'
                    )}
                  > 
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="font-semibold text-gray-900 truncate text-sm">{chat.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">{formatTimeAgo(chat.last_message_at || chat.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 truncate mb-2 leading-relaxed">{chat.preview}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        <span className="text-blue-700 font-medium text-xs">{chat.ip_address || 'Browser'}</span>
                      </div>
                      {chat.user_name && (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          {chat.user_name}
                        </div>
                      )}
                    </div>
                </button>
                ))
              )}
            </div>
          </div>

          {/* Middle: conversation */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {activeChat && chatDetail ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
            </div>
                    <div>
                      <div className="font-semibold text-gray-900">{chatDetail.title}</div>
                      <div className="text-xs text-gray-500">{chatDetail.messages?.length || 0} messages</div>
              </div>
                </div>
                  {/* <button className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    Block IP
                  </button> */}
              </div>
                <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-gray-50">
                  {chatDetail.messages?.map((message: any) => (
                    <div key={message.id} className={clsx('flex items-start gap-3', message.role === 'assistant' && 'justify-end')}>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          U
            </div>
                      )}
                      <div className={clsx(
                        'rounded-2xl px-4 py-3 max-w-xs shadow-sm',
                        message.role === 'user' 
                          ? 'bg-white border border-gray-200' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      )}>
                        <div className="text-sm leading-relaxed">{message.content}</div>
                        <div className={clsx(
                          'text-xs mt-2 font-medium',
                          message.role === 'user' ? 'text-gray-500' : 'text-blue-100'
                        )}>
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      </div>
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  {loading ? 'Loading chat...' : 'Select a chat to view messages'}
                </p>
              </div>
            )}
          </div>

          {/* Right: user info */}
          <div className="space-y-4">
            {activeChat && chatDetail ? (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-semibold text-gray-900">User Information</span>
              </div>
            </div>
                  <div className="p-6 space-y-4">
                    <InfoRow label="Name" value={chatDetail.user_info?.name || 'Unknown'} />
                    <InfoRow label="Email" value={chatDetail.user_info?.email || 'Not provided'} copy />
                    <InfoRow label="User ID" value={chatDetail.user_info?.user_id || 'Unknown'} copy />
                    <InfoRow label="IP Address" value={chatDetail.user_info?.ip_address || 'Unknown'} copy />
                    <InfoRow label="Chat ID" value={chatDetail.user_info?.chat_id || 'Unknown'} copy />
            </div>
          </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-gray-900">Interaction Details</span>
        </div>
                  </div>
                  <div className="p-6">
                    <div className="text-sm text-gray-600 mb-2">Recorded at</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(chatDetail.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Select a chat to view user info</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                placeholder="Search users..." 
                className="flex-1 outline-none text-sm placeholder-gray-400" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px] grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px] items-center bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 text-sm font-semibold text-gray-700 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Name
            </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
            </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last Activity
          </div>
              <div className="text-right flex items-center justify-end gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chats
        </div>
            </div>
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  Loading users...
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <div 
                  key={user.id} 
                  className={clsx(
                    "min-w-[640px] px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px] items-center text-sm hover:bg-gray-50 cursor-pointer transition-all duration-200 group",
                    index > 0 && "border-t border-gray-100"
                  )}
                  onClick={() => setActiveUser(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="font-semibold text-gray-900">{user.name || 'Unknown'}</div>
                  </div>
                  <div className="text-gray-600 flex items-center gap-2">
                    {user.email ? (
                      <>
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {user.email}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </div>
                  <div className="text-gray-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{formatTimeAgo(user.last_activity)}</span>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {user.chat_count} chats
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({label, value, copy}:{label:string; value:string; copy?:boolean}){
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm text-gray-600 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-900 font-semibold">{value}</div>
        {copy && (
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors group">
            <svg className="w-3 h-3 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function AnalyticsView(){
  const [range, setRange] = useState('Last 7 days');
  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Load analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true);
        const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
        const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';
        
        const headers = ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {};
        
        // Load summary data
        const summaryResponse = await fetch(`${API_BASE}/api/analytics/summary`, { headers });
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          console.log('Analytics Summary Data:', summaryData);
          setSummary(summaryData);
        } else {
          console.error('Failed to fetch analytics summary:', summaryResponse.status, summaryResponse.statusText);
        }
        
        // Load chart data
        const days = range === 'Last 7 days' ? 7 : range === 'Last 30 days' ? 30 : 30;
        const chartResponse = await fetch(`${API_BASE}/api/analytics/chart-data?days=${days}`, { headers });
        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          console.log('Analytics Chart Data:', chartData);
          setChartData(chartData);
        } else {
          console.error('Failed to fetch analytics chart data:', chartResponse.status, chartResponse.statusText);
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [range]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';
      
      const headers = ADMIN_KEY ? { 'X-Api-Key': ADMIN_KEY } : {};
      
      const response = await fetch(`${API_BASE}/api/analytics/export?format=${format}`, { headers });
      if (response.ok) {
        const data = await response.json();
        
        // Create and download file
        const blob = new Blob([data.content], { type: data.content_type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export analytics data:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-[22px] font-semibold mb-4">Analytics</h1>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold mb-4">Analytics</h1>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <select 
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] bg-white" 
          value={range} 
          onChange={e => setRange(e.target.value)}
        >
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>This month</option>
        </select>
        
        <div className="flex gap-2">
          <button 
            className="btn btn-ghost text-xs" 
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button 
            className="btn btn-primary text-xs" 
            onClick={() => handleExport('json')}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export JSON'}
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
        <div className="text-[18px] font-semibold mb-2">Summary</div>
        <p className="text-[14px] text-gray-600">
          Track your chatbot's performance with real-time analytics. Monitor user engagement, conversation volume, and resolution rates to optimize your customer support experience.
        </p>
      </div>

      {/* Metrics + Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-6 px-6 pt-4 text-[14px]">
          <Metric 
            label="Total Chats" 
            value={summary?.total_sessions?.toString() || "0"} 
          />
          <Metric 
            label="Total Users" 
            value={summary?.total_users?.toString() || "0"} 
          />
          <Metric 
            label="Resolution Rate" 
            value={`${summary?.resolution_rate || 0}%`} 
          />
        </div>
        
        <div className="mt-4 px-6 pb-6">
          {chartData ? (
            <ChartArea 
              points={chartData.points} 
              labels={chartData.labels} 
              color="#6d28d9" 
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No chart data available
            </div>
          )}
        </div>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-[14px] text-gray-600 mb-1">Active Users (7d)</div>
          <div className="text-[20px] font-semibold">{summary?.active_users_7d || 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-[14px] text-gray-600 mb-1">Messages (7d)</div>
          <div className="text-[20px] font-semibold">{summary?.messages_7d || 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-[14px] text-gray-600 mb-1">Sessions (7d)</div>
          <div className="text-[20px] font-semibold">{summary?.sessions_7d || 0}</div>
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

function ChartArea({points, labels, color = '#6366f1'}:{points:number[]; labels?:string[]; color?:string}){
  // Clean, professional area chart - NO NEGATIVE VALUES ALLOWED
  const width = 1100;
  const height = 300;
  const m = { t: 20, r: 40, b: 60, l: 60 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  
  // Force all points to be non-negative
  const safePoints = points.map(p => Math.max(0, p));
  const maxVal = Math.max(...safePoints, 0);
  const minVal = 0;
  const padMax = maxVal === 0 ? 1 : maxVal * 1.05;
  const n = safePoints.length;
  
  const xs = (i:number) => m.l + (i/(n-1)) * iw;
  const ys = (v:number) => {
    // CRITICAL: Never allow values below baseline
    const safeValue = Math.max(0, v);
    if (maxVal === 0 || safeValue === 0) return m.t + ih; // Zero = baseline
    return m.t + ih - (safeValue / padMax) * ih;
  };
  
  const pts = safePoints.map((p,i)=> ({ 
    x: xs(i), 
    y: ys(p) // p is already safe (non-negative)
  }));

  // Simple line path - no fancy smoothing that can cause issues
  const pathLine = pts.length < 2 ? '' : 
    `M ${pts[0].x} ${pts[0].y} ` + 
    pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    
  // Area path - guaranteed to stay above baseline
  const pathArea = pathLine + ` L ${m.l + iw} ${m.t + ih} L ${m.l} ${m.t + ih} Z`;

  // X labels
  const xLabels = labels && labels.length === n
    ? labels
    : Array.from({length: n}, (_,i)=> `${i+1}`);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="rounded-lg">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Clean white background */}
      <rect x="0" y="0" width={width} height={height} fill="white" />

      {/* Subtle grid lines */}
      {Array.from({length: 5}, (_,i)=> (
        <line key={`h${i}`} x1={m.l} x2={m.l+iw} y1={m.t + (ih/4)*i} y2={m.t + (ih/4)*i} stroke="#f3f4f6" strokeWidth="1" />
      ))}

      {/* Clean baseline */}
      <line x1={m.l} x2={m.l+iw} y1={m.t+ih} y2={m.t+ih} stroke="#e5e7eb" strokeWidth="1" />

      {/* Area fill */}
      <path d={pathArea} fill="url(#chartFill)" />

      {/* Clean line */}
      <path d={pathLine} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Simple markers */}
      {pts.map((p,i)=> (
        <circle key={`pt${i}`} cx={p.x} cy={p.y} r="4" fill={color} />
      ))}

      {/* Y-axis labels */}
      {Array.from({length: 5}, (_,i)=> {
        const value = Math.round((padMax / 4) * i);
        const yPos = m.t + ih - (ih / 4) * i;
        return (
          <text 
            key={`y${i}`} 
            x={m.l - 12} 
            y={yPos + 4} 
            fontSize="12" 
            fill="#6b7280" 
            textAnchor="end"
          >
            {value}
          </text>
        );
      })}

      {/* X-axis labels */}
      {xLabels.map((d,i)=> (
        <text 
          key={`lbl${i}`} 
          x={xs(i)} 
          y={height - 20} 
          fontSize="12" 
          fill="#6b7280" 
          textAnchor="middle"
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

const SettingsUserForm = forwardRef<{
  saveUserFormConfig: () => void;
  discardChanges: () => void;
  hasUnsavedChanges: boolean;
}, {
  formEnabled: boolean;
  setFormEnabled: (enabled: boolean) => void;
  originalFormEnabled: boolean;
  setOriginalFormEnabled: (enabled: boolean) => void;
  fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>;
  setFields: (fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>) => void;
  originalFields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>;
  setOriginalFields: (fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  }>) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  status: {message: string, type: 'success' | 'error'} | null;
  setStatus: (status: {message: string, type: 'success' | 'error'} | null) => void;
}>(({
  formEnabled, setFormEnabled, originalFormEnabled, setOriginalFormEnabled,
  fields, setFields, originalFields, setOriginalFields,
  isLoading, setIsLoading, isSaving, setIsSaving, status, setStatus
}, ref) => {


  // Save form configuration
  const saveUserFormConfig = useCallback(async () => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://chatbot.dipietroassociates.com/api').replace(/\/$/, '');
    try {
      setIsSaving(true);
      setStatus(null);

      const response = await fetch(`${API_BASE}/widget-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_enabled: formEnabled,
          fields: fields.map(field => ({
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            order: field.order
          }))
        })
      });

      if (response.ok) {
        setOriginalFormEnabled(formEnabled);
        setOriginalFields([...fields]);
        setStatus({ message: 'Form configuration saved successfully', type: 'success' });
      } else {
        throw new Error('Failed to save form configuration');
      }
    } catch (error) {
      console.error('Failed to save form config:', error);
      setStatus({ message: 'Failed to save form configuration', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [formEnabled, fields]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setFormEnabled(originalFormEnabled);
    setFields([...originalFields]);
    setStatus(null);
  }, [originalFormEnabled, originalFields]);

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (formEnabled !== originalFormEnabled) return true;
    if (fields.length !== originalFields.length) return true;
    
    return fields.some((field, index) => {
      const originalField = originalFields[index];
      if (!originalField) return true;
      return (
        field.name !== originalField.name ||
        field.label !== originalField.label ||
        field.type !== originalField.type ||
        field.required !== originalField.required ||
        field.placeholder !== originalField.placeholder
      );
    });
  }, [formEnabled, originalFormEnabled, fields, originalFields]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    saveUserFormConfig,
    discardChanges,
    hasUnsavedChanges
  }), [saveUserFormConfig, discardChanges, hasUnsavedChanges]);

  // Add new field
  const addField = useCallback(() => {
    const newField = {
      id: `field-${Date.now()}`,
      name: '',
      label: '',
      type: 'text' as const,
      required: false,
      placeholder: '',
      order: fields.length
    };
    setFields([...fields, newField]);
  }, [fields]);

  // Update field
  const updateField = useCallback((id: string, updates: Partial<typeof fields[0]>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  }, [fields]);

  // Delete field
  const deleteField = useCallback((id: string) => {
    setFields(fields.filter(field => field.id !== id));
  }, [fields]);

  // Move field up
  const moveFieldUp = useCallback((index: number) => {
    if (index > 0) {
      const newFields = [...fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      newFields.forEach((field, i) => {
        field.order = i;
      });
      setFields(newFields);
    }
  }, [fields]);

  // Move field down
  const moveFieldDown = useCallback((index: number) => {
    if (index < fields.length - 1) {
      const newFields = [...fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      newFields.forEach((field, i) => {
        field.order = i;
      });
      setFields(newFields);
    }
  }, [fields]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading form configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">User Form Configuration</h2>
        <p className="text-sm text-gray-600">
          Configure the form that users will see before accessing the chat. This form will appear before starter questions and chat.
        </p>
      </div>

      {/* Form Enable Toggle */}
      <div className="rounded-xl border border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Enable User Form</div>
            <div className="text-sm text-gray-500">Show a form to collect user information before chat</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formEnabled}
              onChange={(e) => setFormEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Form Fields */}
      {formEnabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-900">Form Fields</h3>
            <button
              onClick={addField}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <FormFieldEditor
                key={field.id}
                field={field}
                index={index}
                totalFields={fields.length}
                onUpdate={(updates) => updateField(field.id, updates)}
                onDelete={() => deleteField(field.id)}
                onMoveUp={() => moveFieldUp(index)}
                onMoveDown={() => moveFieldDown(index)}
              />
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No form fields added yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Field" to get started</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div className={`text-sm p-3 rounded-lg ${
          status.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
});

// Form Field Editor Component
const FormFieldEditor = ({ 
  field, 
  index, 
  totalFields, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown 
}: {
  field: {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea';
    required: boolean;
    placeholder: string;
    order: number;
  };
  index: number;
  totalFields: number;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            title="Move up"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalFields - 1}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            title="Move down"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Field Configuration */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Field Type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Field Type</label>
            <select
              value={field.type}
              onChange={(e) => onUpdate({ type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="number">Number</option>
              <option value="textarea">Textarea</option>
            </select>
          </div>

          {/* Field Label */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Field Label</label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Enter field label"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Field Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Field Name</label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="field_name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
            />
          </div>

          {/* Placeholder */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Placeholder</label>
            <input
              type="text"
              value={field.placeholder}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="Enter placeholder text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Required Toggle */}
          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Required Field</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Delete Button */}
            <button
              onClick={onDelete}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
