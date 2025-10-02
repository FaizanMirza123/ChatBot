# 🚀 Deployment Checklist - System Prompt Priority Fix

## Pre-Deployment

- [ ] Review changes in `app/services/rag_service.py`
- [ ] Read `BEFORE_AFTER_COMPARISON.md` to understand the changes
- [ ] Ensure you have server credentials ready
- [ ] Backup current system prompt from admin panel (optional)

---

## Deployment Steps

### 1️⃣ Push Changes to GitHub
```bash
git status
git add .
git commit -m "Fix: Prioritize system prompt - remove generic overrides for strict instruction adherence"
git push origin main
```

**Expected Output:**
```
To https://github.com/yourusername/ChatBot.git
   abc1234..def5678  main -> main
```

---

### 2️⃣ Connect to Server
```bash
ssh root@172.93.53.168
# Password: H2LCCqaFJa
```

**Expected Output:**
```
Welcome to Ubuntu...
root@server:~#
```

---

### 3️⃣ Navigate to Project
```bash
ls
cd ChatBot
pwd
```

**Expected Output:**
```
/root/ChatBot
```

---

### 4️⃣ Pull Latest Changes
```bash
git pull origin main
```

**Expected Output:**
```
From https://github.com/yourusername/ChatBot
 * branch            main       -> FETCH_HEAD
Updating abc1234..def5678
Fast-forward
 app/services/rag_service.py | 102 ++++++++++++++++++++++++++----------------
 1 file changed, 64 insertions(+), 38 deletions(-)
```

---

### 5️⃣ Rebuild Backend Container
```bash
docker compose up --build -d
```

**Expected Output:**
```
[+] Building ...
[+] Running 2/2
 ✔ Container chatbot_postgres  Running
 ✔ Container chatbot_api        Started
```

---

### 6️⃣ Check Container Status
```bash
docker ps
```

**Expected Output:**
```
CONTAINER ID   IMAGE              STATUS         PORTS                    NAMES
xxx            chatbot-api        Up 10 seconds  0.0.0.0:8000->8000/tcp  chatbot_api
yyy            postgres:15        Up 2 minutes   5432/tcp                 chatbot_postgres
```

---

### 7️⃣ Check Logs (Optional but Recommended)
```bash
docker logs chatbot_api --tail 50
```

**Look For:**
- ✅ `✅ Database tables created successfully`
- ✅ `Prefetched: all-MiniLM-L6-v2`
- ✅ `Uvicorn running on http://0.0.0.0:8000`
- ❌ No error traces

---

### 8️⃣ Test API Health
```bash
curl http://localhost:8000/health
```

**Expected Output:**
```json
{"status":"ok"}
```

---

## Post-Deployment Testing

### Test 1: Simple Question
**URL:** `http://172.93.53.168:8000` (or your domain)

**Test Input:**
```
"What do you do?"
```

**Expected Output:**
- ✅ 1-2 sentences maximum
- ✅ Conversational tone (not corporate)
- ✅ Matches your script: "We're an emergency medical consulting firm - AED sales, CPR training, and emergency response programs for 30+ years."

---

### Test 2: Pricing Question
**Test Input:**
```
"How much is CPR training?"
```

**Expected Output:**
- ✅ 1-2 sentences maximum
- ✅ Includes price range ($40-100)
- ✅ Includes phone number: (530) 477-6818
- ✅ Includes link: https://dipietroassoc.com/classes/

---

### Test 3: Training Question
**Test Input:**
```
"Do you train individuals?"
```

**Expected Output:**
- ✅ 1-2 sentences maximum
- ✅ Clear "No" answer
- ✅ Redirects appropriately
- ✅ Matches script behavior

---

### Test 4: Greeting
**Test Input:**
```
"Hi there!"
```

**Expected Output:**
- ✅ Casual, friendly response
- ✅ Very brief (1 sentence)
- ✅ No marketing language

---

### Test 5: Complex Question with KB
**Test Input:**
```
"Tell me about your AED programs and training options"
```

**Expected Output:**
- ✅ Still 1-2 sentences (not long explanation)
- ✅ Uses KB info if available
- ✅ Maintains conversational tone
- ✅ Includes relevant link

---

## Success Criteria

All of these should be TRUE:

- [ ] Container rebuilt successfully
- [ ] No error logs in `docker logs chatbot_api`
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Test 1 returns 1-2 sentences (not 3-4)
- [ ] Test 2 includes phone + link + price
- [ ] Test 3 follows specific script
- [ ] Test 4 is casual and brief
- [ ] Test 5 stays concise even with KB context
- [ ] Bot sounds conversational (not corporate)
- [ ] All "CRITICAL" instructions in system prompt are followed

---

## Troubleshooting

### Issue: Container won't start
```bash
# Check logs for errors
docker logs chatbot_api

# Check if port is in use
netstat -tuln | grep 8000

# Restart if needed
docker compose down
docker compose up --build -d
```

### Issue: Old behavior persists
```bash
# Force rebuild without cache
docker compose down
docker compose build --no-cache
docker compose up -d

# Clear any cached models (if needed)
docker exec -it chatbot_api rm -rf /root/.cache/huggingface/*
docker compose restart
```

### Issue: Database connection error
```bash
# Check if postgres is running
docker ps | grep postgres

# Restart postgres
docker compose restart postgres

# Wait 10 seconds, then restart api
sleep 10
docker compose restart api
```

---

## Rollback Procedure (if needed)

If something goes wrong:

```bash
# On your local machine
git log --oneline -5
git revert <commit-hash-of-changes>
git push origin main

# On server
cd ChatBot
git pull origin main
docker compose up --build -d
```

---

## Notes

- **Only backend changed** - No frontend rebuild needed
- **Database unchanged** - No migration needed
- **Zero downtime** - Docker handles container swap
- **Persistent data** - All DB data and uploads preserved

---

## Verification Commands Summary

Quick copy-paste verification:

```bash
# On server
docker ps
docker logs chatbot_api --tail 20
curl http://localhost:8000/health
```

---

**Deployment Date:** October 2, 2025  
**Estimated Downtime:** ~30 seconds (during container swap)  
**Risk Level:** Low (only logic changes, no schema changes)  
**Rollback Time:** ~2 minutes if needed
