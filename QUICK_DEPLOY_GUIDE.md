# Quick Deployment Guide - NBL Multi-Category Fix

## 🚀 Deploy i 3 Steps

### Step 1: Deploy Edge Function
```bash
supabase functions deploy naevneneshus-mcp
```

**Expected output:**
```
Deploying naevneneshus-mcp...
✓ Function deployed successfully
```

### Step 2: Test NBL Query

**I OpenWebUI, søg:**
```
NBL § 26 a nedlæggelse sti
```

### Step 3: Verify i Monitoring Dashboard

**Gå til:** http://localhost:5173 (eller deployed URL)

**Forventet:**
```
📂 Kategorier (4):
  - NBL - beskyttede naturtyper
  - NBL - beskyttelseslinier
  - NBL - fredningsområdet
  - NBL - øvrige
(Server detected from NBL)
```

---

## ✅ Success Criteria

- [x] Build succeeds (`npm run build`)
- [ ] Edge Function deployed
- [ ] NBL query returns results in OpenWebUI
- [ ] Monitoring shows 4 NBL categories
- [ ] API payload contains all 4 categories

---

## 🐛 Quick Troubleshooting

### Still only one NBL category?

**Check Edge Function logs:**
```bash
supabase functions logs naevneneshus-mcp --tail
```

**Look for:**
```
Server detected 4 categories from query: NBL - beskyttede naturtyper, ...
```

### Frontend not updating?

```bash
npm run build
# Then hard refresh browser (Cmd/Ctrl + Shift + R)
```

---

## 📚 Full Documentation

- **`SERVER_SIDE_MULTI_CATEGORY_FIX.md`** - Complete technical guide
- **`NBL_MULTI_CATEGORY_FIX.md`** - AI-side detection fix
- **`DEPLOYMENT_CHECKLIST_NBL.md`** - Detailed deployment steps

---

## 🎉 What Changed?

**Before:**
- NBL matched only "NBL - beskyttede naturtyper"
- Only 1 category in API payload

**After:**
- NBL matches ALL 4 NBL categories automatically
- Server-side fallback ensures it works even if OpenWebUI forgets to send `detectedAcronym`
- All 4 categories in API payload = better search results

---

*Last Updated: 2025-12-01*
