### For Backend:

`export DOCKER_BUILDKIT=1`
`docker compose up --build`

### For Frontend:

`cd frontend`
`npm i`
`npm run dev`

## 🔐 Login System

The chatbot admin panel now includes a professional login system with static credentials configured via environment variables.

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

### Environment Configuration
Add these variables to your `.env` file:

```env
# Static Login Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### Features
- ✅ Professional login page with modern UI
- ✅ Static credentials from environment variables
- ✅ Automatic redirect to login if not authenticated
- ✅ Logout functionality with token cleanup
- ✅ Protected admin panel routes
- ✅ Responsive design matching the existing theme

### Security Notes
- Change the default credentials in production
- The system uses simple token-based authentication
- For production, consider implementing JWT tokens or session management
- Credentials are stored in environment variables for easy management