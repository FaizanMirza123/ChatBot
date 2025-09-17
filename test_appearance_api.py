#!/usr/bin/env python3
"""
Test script to verify the appearance API endpoints work correctly
"""
import requests
import json

def test_appearance_api():
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Appearance API Endpoints...")
    
    # Test 1: Get current widget config
    print("\n1. Testing GET /widget-config")
    try:
        response = requests.get(f"{base_url}/widget-config")
        if response.status_code == 200:
            data = response.json()
            print("✅ GET /widget-config successful")
            print(f"   Current config: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ GET /widget-config failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ GET /widget-config error: {e}")
    
    # Test 2: Update appearance settings
    print("\n2. Testing POST /widget-config (appearance update)")
    try:
        update_data = {
            "form_enabled": True,
            "fields": [],
            "primary_color": "#ff6b6b",
            "bot_name": "ChatBot",
            "widget_icon": "🤖",
            "widget_position": "left",
            "input_placeholder": "Ask me anything...",
            "subheading": "I'm here to help!",
            "show_branding": False,
            "open_by_default": True,
            "starter_questions": False
        }
        
        response = requests.post(
            f"{base_url}/widget-config",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ POST /widget-config successful")
            print(f"   Updated config: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ POST /widget-config failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ POST /widget-config error: {e}")
    
    # Test 3: Verify the update was saved
    print("\n3. Testing GET /widget-config (verification)")
    try:
        response = requests.get(f"{base_url}/widget-config")
        if response.status_code == 200:
            data = response.json()
            print("✅ GET /widget-config verification successful")
            print(f"   Saved config: {json.dumps(data, indent=2)}")
            
            # Check if our changes were saved
            if data.get("primary_color") == "#ff6b6b":
                print("✅ Color change saved correctly")
            else:
                print(f"❌ Color not saved correctly: {data.get('primary_color')}")
                
            if data.get("widget_icon") == "🤖":
                print("✅ Icon change saved correctly")
            else:
                print(f"❌ Icon not saved correctly: {data.get('widget_icon')}")
                
        else:
            print(f"❌ GET /widget-config verification failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ GET /widget-config verification error: {e}")

if __name__ == "__main__":
    test_appearance_api()

