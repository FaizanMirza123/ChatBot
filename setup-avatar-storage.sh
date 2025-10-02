#!/bin/bash

# Avatar Upload Fix - Server Setup Script
# Run this on the server after pulling code

echo "🖼️  Setting up avatar upload persistence..."
echo ""

# Create the avatars directory if it doesn't exist
echo "Creating static/avatars directory..."
mkdir -p app/static/avatars

# Set proper permissions
echo "Setting permissions..."
chmod 755 app/static/avatars

echo ""
echo "✅ Directory created: app/static/avatars"
echo ""
echo "Next steps:"
echo "1. docker compose down"
echo "2. docker compose up --build -d"
echo "3. cd frontend && npm run build"
echo ""
echo "Done! 🎉"
