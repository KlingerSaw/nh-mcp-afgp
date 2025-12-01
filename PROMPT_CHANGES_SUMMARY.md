# System Prompt Changes - Quick Summary

## 🎯 What Changed?

The system prompt now **explicitly instructs** OpenWebUI's AI to:
1. ✅ Always send `originalQuery` parameter (the unmodified user input)
2. ✅ Always send `detectedAcronym` parameter (MBL, NBL, JFL, etc.)
3. ✅ Always send all 4 parameters: `query`, `detectedAcronym`, `originalQuery`, `portal`

## 📝 Key Changes

### 1. New Explicit Format Section
Added a clear, unmissable section at the top:

```
📞 VÆRKTØJSKALD FORMAT (OBLIGATORISK!)

⚠️ KRITISK: ALTID send disse 4 parametre til værktøjet:

{
  "query": "<optimeret query>",
  "detectedAcronym": "<akronym ELLER null>",
  "originalQuery": "<UÆNDRET bruger input>",
  "portal": "mfkn.naevneneshus.dk"
}
```

### 2. Updated All 7 Examples
Every example now shows the complete 4-parameter format:

**Example 1:**
```json
{
  "query": "Bevisbyrde § 72",
  "detectedAcronym": "MBL",
  "originalQuery": "Bevisbyrde ved MBL § 72 og søgning om § 72-praksis",
  "portal": "mfkn.naevneneshus.dk"
}
```

### 3. Added VIGTIGSTE REGLER Section
Clear, color-coded rules with emojis for visibility:

```
⚠️ VIGTIGSTE REGLER (TJEK ALTID!)

🔴 OBLIGATORISK - Glem ALDRIG disse:
✅ ALTID send "originalQuery"
✅ ALTID send "detectedAcronym"
✅ ALTID send alle 4 parametre

❌ GLEM ALDRIG:
- originalQuery parameter (viser i monitoring dashboard)
- detectedAcronym parameter (aktiverer kategori-filter)
```

## 🚀 What You Need to Do

### Step 1: Generate New Prompt
1. Go to dashboard → Prompts tab
2. Select your portal (e.g., MFKN)
3. Click "Kopier" under System Prompt

### Step 2: Update OpenWebUI
1. OpenWebUI → Settings → Models → Your Model
2. **Delete old prompt completely**
3. Paste new prompt
4. Save

### Step 3: Test
Search for: `Bevisbyrde ved MBL § 72`

**Expected Result:**
```
Søgt med: "Bevisbyrde § 72"
OpenWebUI: "Bevisbyrde ved MBL § 72"  ← This should appear now!
📂 Kategori: Miljøbeskyttelsesloven  ← This should appear now!
```

## ✅ Expected Behavior

### Before:
```json
{
  "detected_acronyms": [],  ❌
  "detected_category": null,  ❌
  "original_query": "Bevisbyrde § 72"  ❌ (same as query)
}
```

### After:
```json
{
  "detected_acronyms": ["MBL"],  ✅
  "detected_category": "Miljøbeskyttelsesloven",  ✅
  "original_query": "Bevisbyrde ved MBL § 72"  ✅ (original input!)
}
```

## 📚 Full Documentation

See `OPENWEBUI_PROMPT_FIX.md` for:
- Detailed troubleshooting
- Technical implementation details
- Before/after comparisons
- Complete testing guide

---

*Updated: 2025-12-01*
