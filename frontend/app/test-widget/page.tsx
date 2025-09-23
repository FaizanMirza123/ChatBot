'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    createChatbotWidget?: (config: { apiBase: string }) => void;
  }
}

export default function TestWidget() {
  useEffect(() => {
    // Load the chatbot widget script
    const script = document.createElement('script');
    script.src = 'http://localhost:8000/static/chatbot-widget.v2.js';
    script.setAttribute('data-api-base', 'http://localhost:8000/');
    script.defer = true;
    script.onload = () => {
      if (window.createChatbotWidget) {
        window.createChatbotWidget({ apiBase: 'http://localhost:8000/' });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">
            Chatbot Widget Test Page
          </h1>
          <div className="space-y-4 text-gray-600">
            <p className="text-lg">
              This is a test page to demonstrate the JavaScript integration of the chatbot widget. 
              The widget should appear as a floating button in the bottom-right corner of the page.
            </p>
            <p className="text-lg">
              Click on the widget to start chatting with the bot!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-800 mb-2">Integration Code Used:</h3>
              <pre className="text-sm text-blue-700 bg-blue-100 p-3 rounded overflow-x-auto">
{`<script src="http://localhost:8000/static/chatbot-widget.v2.js" 
        data-api-base="http://localhost:8000/" 
        defer 
        onload="window.createChatbotWidget({ apiBase: 'http://localhost:8000/' });">
</script>`}
              </pre>
            </div>
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">Sample Content</h3>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
                culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
                doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
                veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
