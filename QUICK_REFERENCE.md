# ⚡ Quick Reference - Deploy System Prompt Fix

## 🚀 Deploy Commands (Copy & Paste)

### On Your Machine:
```bash
git add .
git commit -m "Fix: Prioritize system prompt - strict instruction adherence"
git push origin main
```

### On Server:
```bash
ssh root@172.93.53.168
# Password: H2LCCqaFJa

cd ChatBot
git pull origin main
docker compose up --build -d
```

### Verify:
```bash
docker logs chatbot_api --tail 20
curl http://localhost:8000/health
```

---

## ✅ What Changed

**File Modified:** `app/services/rag_service.py`

**Key Changes:**
- System prompt now used EXACTLY as written (no modifications)
- Removed generic override instructions
- Lower temperature (0.3) for consistency
- Higher token limit (800) - let prompt control length

---

## 🧪 Quick Tests

**Test 1:** "What do you do?"  
**Expect:** 1-2 sentences, conversational

**Test 2:** "How much is CPR training?"  
**Expect:** Price range + phone + link in 1-2 sentences

**Test 3:** "Do you train individuals?"  
**Expect:** Brief "no" + redirect in 1-2 sentences

---

## 🔙 Rollback (if needed)

```bash
git revert HEAD
git push origin main

# On server:
cd ChatBot
git pull origin main
docker compose up --build -d
```

---

## 📊 Success Checklist

- [ ] Git push successful
- [ ] Server pull successful  
- [ ] Docker rebuild successful
- [ ] Container running (docker ps)
- [ ] Health check passes
- [ ] Test responses are 1-2 sentences
- [ ] Conversational tone maintained
- [ ] Links and phone numbers included

---

## 💡 Remember

**Your system prompt is now ABSOLUTE.**  
Whatever you write in the admin panel system prompt = exact bot behavior.

No more overrides. No more fighting. It just works.

---

## 📁 Full Documentation

- `SUMMARY.md` - Overview
- `DEPLOYMENT_CHECKLIST.md` - Detailed steps
- `BEFORE_AFTER_COMPARISON.md` - Visual examples
- `SYSTEM_PROMPT_PRIORITY_CHANGES.md` - Technical details

---

**Deployment Time:** ~5 minutes  
**Downtime:** ~30 seconds  
**Risk:** Low  
**Confidence:** High ✅
