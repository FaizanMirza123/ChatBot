#!/bin/bash

# Firewall Security Setup Script
# This script helps secure your server against database attacks

echo "🔥 Setting up firewall security for database protection"
echo "====================================================="

# Function to check if ufw is available
check_ufw() {
    if command -v ufw > /dev/null 2>&1; then
        echo "✅ UFW firewall is available"
        return 0
    else
        echo "❌ UFW firewall is not installed"
        echo "Installing UFW..."
        sudo apt-get update && sudo apt-get install -y ufw
        return $?
    fi
}

# Function to setup basic firewall rules
setup_firewall_rules() {
    echo "🛡️  Setting up firewall rules..."
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (be careful not to lock yourself out!)
    sudo ufw allow ssh
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS for your web application
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow your application port (8000)
    sudo ufw allow 8000/tcp
    
    # BLOCK PostgreSQL port from external access
    sudo ufw deny 5432/tcp
    echo "🚫 Blocked external access to PostgreSQL port 5432"
    
    # Allow localhost access to PostgreSQL (for maintenance)
    sudo ufw allow from 127.0.0.1 to any port 5432
    echo "✅ Allowed localhost access to PostgreSQL"
    
    # Enable UFW
    sudo ufw --force enable
    
    echo "✅ Firewall rules configured successfully"
}

# Function to show current firewall status
show_firewall_status() {
    echo "📊 Current firewall status:"
    sudo ufw status verbose
}

# Function to install fail2ban for additional protection
install_fail2ban() {
    echo "🛡️  Installing fail2ban for additional protection..."
    
    if command -v fail2ban-client > /dev/null 2>&1; then
        echo "✅ Fail2ban is already installed"
    else
        sudo apt-get update && sudo apt-get install -y fail2ban
    fi
    
    # Create fail2ban configuration for PostgreSQL
    sudo tee /etc/fail2ban/jail.d/postgresql.conf > /dev/null <<EOF
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-*.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

    # Create PostgreSQL filter
    sudo tee /etc/fail2ban/filter.d/postgresql.conf > /dev/null <<EOF
[Definition]
failregex = ^.*FATAL.*password authentication failed for user.*$
ignoreregex =
EOF

    # Start fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    echo "✅ Fail2ban configured for PostgreSQL protection"
}

# Main execution
echo "Starting security setup..."

if check_ufw; then
    setup_firewall_rules
    show_firewall_status
    install_fail2ban
    echo ""
    echo "🎉 Security setup completed successfully!"
    echo ""
    echo "📋 Summary of security measures:"
    echo "  ✅ PostgreSQL port 5432 blocked from external access"
    echo "  ✅ Only localhost can access PostgreSQL"
    echo "  ✅ HTTP/HTTPS ports open for web application"
    echo "  ✅ Fail2ban installed for brute force protection"
    echo "  ✅ UFW firewall enabled"
    echo ""
    echo "⚠️  IMPORTANT: Make sure you can still access your server via SSH!"
    echo "   If you get locked out, you may need to access via console."
else
    echo "❌ Failed to install UFW. Please install it manually:"
    echo "   sudo apt-get update && sudo apt-get install -y ufw"
fi
