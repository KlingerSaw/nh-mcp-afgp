# NBL Multi-Category Fix - Deployment Checklist

## 📋 Pre-Deployment Checklist

- [x] Code changes completed
- [x] Frontend built successfully (`npm run build`)
- [x] All TypeScript types are correct
- [x] No console errors in development
- [x] Documentation created

## 🚀 Deployment Steps

### ☐ Step 1: Deploy Edge Function
```bash
cd /path/to/project
supabase functions deploy naevneneshus-mcp
```

**Expected output:**
```
Deploying naevneneshus-mcp (project ref: ...)
Function deployed successfully!
```

**Verify:**
```bash
supabase functions list
```
Should show `naevneneshus-mcp` with status "ACTIVE"

### ☐ Step 2: Deploy Frontend (if hosting)
```bash
# If using Vercel/Netlify/similar
npm run build
# Deploy dist/ folder to hosting provider
```

**Or if local development:**
```bash
# Just rebuild
npm run build
```

### ☐ Step 3: Test NBL Query in OpenWebUI

**Test Input:**
```
Praksissøgning efter NBL § 26 a – nedlæggelse af sti
```

**Expected AI Response:**
- Should call the search tool
- Should return results
- Should show results in OpenWebUI

### ☐ Step 4: Verify in Monitoring Dashboard

Go to: http://localhost:5173 (or your deployed URL)

**Check:**
- [ ] Latest query appears in monitoring
- [ ] Shows "Søgt med: § 26 a nedlæggelse sti"
- [ ] Shows "OpenWebUI: Praksissøgning efter NBL § 26 a – nedlæggelse af sti" (if prompt updated)
- [ ] Shows "📂 Kategorier (4):"
- [ ] All 4 NBL categories are listed:
  - NBL - beskyttede naturtyper
  - NBL - beskyttelseslinier
  - NBL - fredningsområdet
  - NBL - øvrige

### ☐ Step 5: Verify Request Payload

Click "📋 Vis Request Payload & API Response"

**Check Original MCP Request:**
```json
{
  "query": "NBL § 26 a nedlæggelse sti",
  "detected_category": {
    "categories": [
      {"id": "...", "title": "NBL - beskyttede naturtyper"},
      {"id": "...", "title": "NBL - beskyttelseslinier"},
      {"id": "...", "title": "NBL - fredningsområdet"},
      {"id": "...", "title": "NBL - øvrige"}
    ],
    "source": "ai_acronym_multi",
    "matched_value": "NBL"
  }
}
```

**Check Request Payload til API:**
```json
{
  "query": "§ 26 a nedlæggelse sti",
  "categories": [
    {"id": "...", "title": "NBL - beskyttede naturtyper"},
    {"id": "...", "title": "NBL - beskyttelseslinier"},
    {"id": "...", "title": "NBL - fredningsområdet"},
    {"id": "...", "title": "NBL - øvrige"}
  ],
  "sort": "Score",
  "skip": 0,
  "size": 10
}
```

### ☐ Step 6: Test Other Acronyms

**Test JFL (should be single category):**
```
JFL § 8 kulbrinteforurening
```

**Expected:**
- [ ] Only "Jordforureningsloven" in categories
- [ ] Shows "📂 Kategori: Jordforureningsloven" (single, not plural)

**Test MBL (should be single or multiple depending on database):**
```
MBL § 72 bevisbyrde
```

**Expected:**
- [ ] All MBL categories in payload
- [ ] Correct display in monitoring

### ☐ Step 7: Test No Acronym

**Test query without acronym:**
```
støj fra vindmøller
```

**Expected:**
- [ ] No categories in payload (unless auto-detected)
- [ ] Normal search behavior
- [ ] Results returned

## 🐛 Troubleshooting

### Issue: Only one NBL category in payload

**Check:**
1. Is Edge Function deployed? Run: `supabase functions list`
2. Check Edge Function logs: `supabase functions logs naevneneshus-mcp`
3. Look for: "Successfully matched NBL to X categories"

**Solution:**
```bash
# Redeploy Edge Function
supabase functions deploy naevneneshus-mcp --no-verify-jwt
```

### Issue: Monitoring shows old data

**Check:**
1. Is frontend rebuilt? Run: `npm run build`
2. Hard refresh browser: Cmd/Ctrl + Shift + R
3. Clear browser cache

**Solution:**
```bash
npm run build
# Then hard refresh browser
```

### Issue: "OpenWebUI:" field still missing

**This is expected!** The original query display requires OpenWebUI system prompt update.

**Solution:**
See `OPENWEBUI_PROMPT_FIX.md` for instructions.

### Issue: TypeScript errors

**Check:**
```bash
npm run typecheck
```

**If errors, common fixes:**
- Ensure all imports are correct
- Check function signatures match
- Verify types are defined

### Issue: API returns error

**Check Edge Function logs:**
```bash
supabase functions logs naevneneshus-mcp --tail
```

**Look for:**
- Error messages
- Stack traces
- Failed API calls

## ✅ Success Criteria

All of these should be true:

- [x] Edge Function deployed successfully
- [ ] NBL query returns results in OpenWebUI
- [ ] Monitoring dashboard shows 4 NBL categories
- [ ] API payload contains all 4 categories
- [ ] Single-category acronyms (JFL, VL) still work
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Logs show successful category matching

## 📊 Verification Commands

```bash
# Check Edge Function status
supabase functions list

# View Edge Function logs
supabase functions logs naevneneshus-mcp --tail

# Check TypeScript
npm run typecheck

# Build frontend
npm run build

# View build output
ls -lh dist/
```

## 📝 Rollback Plan

If something goes wrong:

### 1. Rollback Edge Function
```bash
# Deploy previous version (if you have git commit)
git checkout <previous-commit>
supabase functions deploy naevneneshus-mcp
```

### 2. Rollback Frontend
```bash
# Checkout previous version
git checkout <previous-commit>
npm run build
# Deploy old dist/
```

### 3. Verify Rollback
- Test NBL query (should work with single category)
- Check monitoring dashboard
- Verify no errors in logs

## 📚 Documentation

After successful deployment, verify these docs are up-to-date:

- [x] `NBL_MULTI_CATEGORY_FIX.md` - Implementation details
- [x] `NBL_FIX_SUMMARY.md` - Quick summary
- [x] `DEPLOYMENT_CHECKLIST_NBL.md` - This file
- [x] `OPENWEBUI_PROMPT_FIX.md` - Original query fix (separate issue)

## 🎉 Post-Deployment

After successful deployment:

1. **Notify Users** (if applicable)
   - NBL searches now return more comprehensive results
   - No action required from users

2. **Monitor Logs** for first 24 hours
   ```bash
   supabase functions logs naevneneshus-mcp --tail
   ```

3. **Check Analytics**
   - Monitor query success rates
   - Check result counts for NBL queries
   - Verify no increase in errors

4. **Update Knowledge Base**
   - Document the change
   - Update training materials if applicable

---

## ✨ What Changed Summary

### For End Users:
- NBL searches now automatically search across all 4 NBL categories
- Better, more comprehensive search results
- No action required

### For Administrators:
- Monitoring dashboard shows all matched categories
- Better transparency and debugging
- Full analytics on multi-category matches

### For Developers:
- Cleaner, more maintainable code
- Backward compatible implementation
- Easy to extend for future acronyms

---

*Created: 2025-12-01*
*Last Updated: 2025-12-01*
