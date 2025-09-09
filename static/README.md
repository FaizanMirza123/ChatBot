Chatbot Web Widget

How to embed

1) Host the API somewhere (e.g., https://api.example.com/)
2) Add this to any website:

<script src="https://api.example.com/static/chatbot-widget.js"></script>
<script>
  const widget = createChatbotWidget({
    apiBase: 'https://api.example.com/',
    title: 'Ask Us',
    userId: 1 // supply your site user id if you have one
  });
</script>

Notes
- The widget opens a floating button ▶ panel UI.
- It calls your API endpoints: /sessions, /sessions/{id}/messages, /chat.
- CORS must allow your site origin. Configure CORS_ORIGINS in the backend .env.
