"use client";
import { useEffect } from 'react';

export default function JavaScriptPreview() {
  useEffect(() => {
    // Load the chatbot widget script
    const script = document.createElement('script');
    script.src = '/api/static/chatbot-widget.v2.js';
    script.setAttribute('data-api-base', '/api/');
    script.defer = true;
    script.onload = () => {
      if (window.createChatbotWidget) {
        window.createChatbotWidget({ apiBase: '/api/' });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">JavaScript Preview</h1>
          <p className="text-sm text-gray-600">
            This is how your chatbot will appear when embedded using the JavaScript method.
          </p>
        </div>
        
        {/* Widget container */}
        <div id="chatbot-widget-root" className="relative">
          {/* The widget will be rendered here by the script */}
        </div>
      </div>
    </div>
  );
}
