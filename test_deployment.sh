#!/bin/bash
# Test script for verifying system prompt priority fix
# Usage: ./test_deployment.sh

API_URL="${1:-http://localhost:8000}"
CLIENT_ID="test_$(date +%s)"

echo "================================"
echo "Testing ChatBot Deployment"
echo "API URL: $API_URL"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "Test 1: Health Check"
echo "-------------------"
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ PASS${NC} - API is healthy"
    echo "Response: $HEALTH"
else
    echo -e "${RED}❌ FAIL${NC} - API health check failed"
    echo "Response: $HEALTH"
fi
echo ""

# Test 2: Simple Question - Length Check
echo "Test 2: Response Length Test"
echo "----------------------------"
echo "Question: 'What do you do?'"
RESPONSE=$(curl -s -X POST "$API_URL/chat" \
    -H "Content-Type: application/json" \
    -H "X-Client-Id: $CLIENT_ID" \
    -d '{"message": "What do you do?", "client_id": "'$CLIENT_ID'"}' | jq -r '.reply')

SENTENCE_COUNT=$(echo "$RESPONSE" | grep -o '\.' | wc -l)
WORD_COUNT=$(echo "$RESPONSE" | wc -w)

echo "Response: $RESPONSE"
echo ""
echo "Sentence count: $SENTENCE_COUNT"
echo "Word count: $WORD_COUNT"

if [ $SENTENCE_COUNT -le 2 ] && [ $WORD_COUNT -lt 100 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Response is concise (1-2 sentences)"
else
    echo -e "${YELLOW}⚠️  REVIEW${NC} - Response might be too long"
fi
echo ""

# Test 3: Pricing Question - Check for Required Elements
echo "Test 3: Pricing Question - Elements Check"
echo "-----------------------------------------"
echo "Question: 'How much is CPR training?'"
RESPONSE=$(curl -s -X POST "$API_URL/chat" \
    -H "Content-Type: application/json" \
    -H "X-Client-Id: $CLIENT_ID" \
    -d '{"message": "How much is CPR training?", "client_id": "'$CLIENT_ID'"}' | jq -r '.reply')

echo "Response: $RESPONSE"
echo ""

HAS_PRICE=false
HAS_PHONE=false
HAS_LINK=false

if echo "$RESPONSE" | grep -qE '\$[0-9]|[0-9]+ per|price|cost'; then
    HAS_PRICE=true
fi

if echo "$RESPONSE" | grep -qE '\([0-9]{3}\) [0-9]{3}-[0-9]{4}|530.*477.*6818'; then
    HAS_PHONE=true
fi

if echo "$RESPONSE" | grep -q 'https://'; then
    HAS_LINK=true
fi

echo "Contains price info: $(if $HAS_PRICE; then echo -e "${GREEN}✅ YES${NC}"; else echo -e "${RED}❌ NO${NC}"; fi)"
echo "Contains phone: $(if $HAS_PHONE; then echo -e "${GREEN}✅ YES${NC}"; else echo -e "${RED}❌ NO${NC}"; fi)"
echo "Contains link: $(if $HAS_LINK; then echo -e "${GREEN}✅ YES${NC}"; else echo -e "${RED}❌ NO${NC}"; fi)"

if $HAS_PRICE && $HAS_PHONE && $HAS_LINK; then
    echo -e "${GREEN}✅ PASS${NC} - All required elements present"
else
    echo -e "${YELLOW}⚠️  REVIEW${NC} - Some elements might be missing"
fi
echo ""

# Test 4: Greeting - Casualness Check
echo "Test 4: Greeting - Tone Check"
echo "-----------------------------"
echo "Question: 'Hi there!'"
RESPONSE=$(curl -s -X POST "$API_URL/chat" \
    -H "Content-Type: application/json" \
    -H "X-Client-Id: $CLIENT_ID" \
    -d '{"message": "Hi there!", "client_id": "'$CLIENT_ID'"}' | jq -r '.reply')

echo "Response: $RESPONSE"
echo ""

IS_CORPORATE=false
if echo "$RESPONSE" | grep -qiE "pleased|delighted|thrilled|welcome to|thank you for|at your service"; then
    IS_CORPORATE=true
fi

if $IS_CORPORATE; then
    echo -e "${YELLOW}⚠️  REVIEW${NC} - Response might sound too corporate"
else
    echo -e "${GREEN}✅ PASS${NC} - Response sounds conversational"
fi
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo "Run all tests to verify system prompt priority is working correctly."
echo "Expected: All responses should be 1-2 sentences, conversational, with required elements."
echo ""
echo "To test from browser, visit: $API_URL"
echo "To view logs: docker logs chatbot_api --tail 50"
echo ""
