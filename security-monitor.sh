#!/bin/bash

# Database Security Monitor Script
# This script monitors database connections and blocks suspicious activity

echo "🔒 Database Security Monitor Started"
echo "=================================="

# Function to check for failed login attempts
check_failed_logins() {
    echo "📊 Checking for failed login attempts..."
    
    # Get recent failed login attempts from PostgreSQL logs
    docker logs chatbot_postgres 2>&1 | grep "FATAL.*password authentication failed" | tail -20 | while read line; do
        echo "❌ Failed login attempt: $line"
    done
    
    # Count failed attempts in the last hour
    failed_count=$(docker logs chatbot_postgres 2>&1 | grep "FATAL.*password authentication failed" | grep "$(date '+%Y-%m-%d %H')" | wc -l)
    
    if [ "$failed_count" -gt 10 ]; then
        echo "🚨 ALERT: $failed_count failed login attempts in the last hour!"
        echo "Consider blocking suspicious IPs or changing database password."
    else
        echo "✅ Normal activity: $failed_count failed attempts in the last hour"
    fi
}

# Function to check database connectivity
check_db_connectivity() {
    echo "🔍 Checking database connectivity..."
    
    if docker exec chatbot_postgres pg_isready -U chatbot_user -d chatbot > /dev/null 2>&1; then
        echo "✅ Database is accessible from within Docker network"
    else
        echo "❌ Database is not accessible"
    fi
}

# Function to check if database port is exposed
check_port_exposure() {
    echo "🌐 Checking if database port is exposed externally..."
    
    if netstat -tlnp 2>/dev/null | grep ":5432" > /dev/null; then
        echo "⚠️  WARNING: Port 5432 is exposed externally!"
        echo "This could allow external attacks. Consider removing port mapping."
    else
        echo "✅ Port 5432 is not exposed externally"
    fi
}

# Function to show current database users
show_db_users() {
    echo "👥 Current database users:"
    docker exec chatbot_postgres psql -U chatbot_user -d chatbot -c "\du" 2>/dev/null || echo "❌ Could not connect to database"
}

# Function to show recent connections
show_recent_connections() {
    echo "📡 Recent database connections:"
    docker logs chatbot_postgres 2>&1 | grep "connection authorized" | tail -10 || echo "No recent connections found"
}

# Run all checks
check_failed_logins
echo ""
check_db_connectivity
echo ""
check_port_exposure
echo ""
show_db_users
echo ""
show_recent_connections

echo ""
echo "🔒 Security check completed at $(date)"
