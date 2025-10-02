#!/bin/bash

# Performance Testing Script
# Tests widget config loading speed before and after optimization

API_BASE="${1:-http://localhost:8000}"

echo "================================="
echo "Performance Test: Parallel Loading"
echo "================================="
echo ""
echo "API Base: $API_BASE"
echo ""

echo "Testing Sequential Loading (Old Way)..."
echo "---------------------------------------"

START=$(date +%s%3N)
curl -s "$API_BASE/widget-config" > /dev/null
echo "✓ widget-config fetched"

curl -s "$API_BASE/messaging-config" > /dev/null
echo "✓ messaging-config fetched"

curl -s "$API_BASE/starter-questions" > /dev/null
echo "✓ starter-questions fetched"
END=$(date +%s%3N)

SEQUENTIAL_TIME=$((END - START))
echo ""
echo "Sequential Total Time: ${SEQUENTIAL_TIME}ms"
echo ""

echo "Testing Parallel Loading (New Way)..."
echo "--------------------------------------"

START=$(date +%s%3N)
curl -s "$API_BASE/widget-config" > /dev/null &
PID1=$!

curl -s "$API_BASE/messaging-config" > /dev/null &
PID2=$!

curl -s "$API_BASE/starter-questions" > /dev/null &
PID3=$!

wait $PID1
echo "✓ widget-config fetched"

wait $PID2
echo "✓ messaging-config fetched"

wait $PID3
echo "✓ starter-questions fetched"

END=$(date +%s%3N)

PARALLEL_TIME=$((END - START))
echo ""
echo "Parallel Total Time: ${PARALLEL_TIME}ms"
echo ""

echo "================================="
echo "Results Summary"
echo "================================="
echo "Sequential: ${SEQUENTIAL_TIME}ms"
echo "Parallel:   ${PARALLEL_TIME}ms"

if [ $PARALLEL_TIME -lt $SEQUENTIAL_TIME ]; then
    IMPROVEMENT=$((SEQUENTIAL_TIME * 100 / PARALLEL_TIME))
    echo "Improvement: ${IMPROVEMENT}% faster! 🚀"
else
    echo "Note: Results may vary based on network conditions"
fi
