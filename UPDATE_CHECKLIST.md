# OpenWebUI System Prompt Update - Checklist ✅

## 📋 Quick Action Items

### ☐ Step 1: Generate New System Prompt
- [ ] Open dashboard: http://localhost:5173 (or your deployed URL)
- [ ] Click on **"Prompts"** tab
- [ ] Select **"mfkn.naevneneshus.dk"** from dropdown (or your portal)
- [ ] Click **"Kopier"** button under "System Prompt"
- [ ] Verify the prompt was copied to clipboard

### ☐ Step 2: Update OpenWebUI
- [ ] Open OpenWebUI in browser
- [ ] Go to **Settings** → **Models**
- [ ] Find your model (e.g., "gpt-4o", "claude-3.5-sonnet")
- [ ] Click on the model name
- [ ] Scroll to **System Prompt** section
- [ ] **DELETE the old prompt completely** (important!)
- [ ] Paste the new prompt from clipboard
- [ ] Click **Save**
- [ ] Verify you see "Saved successfully" message

### ☐ Step 3: Test the Fix
- [ ] Start a **new chat** in OpenWebUI (important - don't reuse old chat!)
- [ ] Type this exact query: `Bevisbyrde ved MBL § 72`
- [ ] Press Enter and wait for results
- [ ] OpenWebUI should call the search tool automatically

### ☐ Step 4: Verify in Monitoring Dashboard
- [ ] Go back to your dashboard
- [ ] Click on **"Monitoring"** tab
- [ ] Find your latest search (should be at the top)
- [ ] **Verify you see:**
  - ✅ `Søgt med: "Bevisbyrde § 72"` (optimized query)
  - ✅ `OpenWebUI: "Bevisbyrde ved MBL § 72"` ← **This is NEW!**
  - ✅ `📂 Kategori: Miljøbeskyttelsesloven` ← **This is NEW!**

### ☐ Step 5: Check Request Payload
- [ ] Click **"📋 Vis Request Payload & API Response"**
- [ ] Verify the payload contains:
  ```json
  {
    "original_query": "Bevisbyrde ved MBL § 72",  ✅
    "detected_acronyms": ["MBL"],  ✅
    "detected_category": "Miljøbeskyttelsesloven"  ✅
  }
  ```

## ✅ Success Criteria

All of these should be true:

1. ✅ "OpenWebUI:" field appears in monitoring dashboard
2. ✅ Shows the original user input: "Bevisbyrde ved MBL § 72"
3. ✅ Kategori shows: "Miljøbeskyttelsesloven (detected from MBL)"
4. ✅ Payload contains `detected_acronyms: ["MBL"]`
5. ✅ Payload contains `detected_category: "Miljøbeskyttelsesloven"`
6. ✅ Payload contains `original_query: "Bevisbyrde ved MBL § 72"`

## 🔴 If Something Doesn't Work

### Problem: "OpenWebUI:" Still Missing

**Check:**
- [ ] Did you generate a NEW prompt AFTER the code update?
- [ ] Did you DELETE the old prompt before pasting the new one?
- [ ] Did you start a NEW chat (not continue an old one)?
- [ ] Is the AI model actually using the new system prompt?

**Solution:**
1. Go back to Step 1 and repeat the process
2. Make sure to delete ALL old prompt text before pasting
3. Always start a fresh chat to test

### Problem: Acronyms Not Detected (detected_acronyms: [])

**Check:**
- [ ] Did your query actually contain an acronym? (MBL, NBL, JFL, etc.)
- [ ] Is the acronym in the prompt's acronym table?
- [ ] Did you use the correct format? (e.g., "MBL" not "miljøbeskyttelsesloven")

**Solution:**
1. Test with a known-good query: "Bevisbyrde ved MBL § 72"
2. Check the acronym table in the system prompt (should have "MBL → Miljøbeskyttelsesloven")
3. If still failing, check OpenWebUI logs for errors

### Problem: Categories Still Empty in Payload

**Check:**
- [ ] Is `detectedAcronym` being sent by OpenWebUI? (check raw request)
- [ ] Is the MCP server receiving the `detectedAcronym` parameter?
- [ ] Is the acronym-to-category mapping working in the backend?

**Solution:**
1. Check browser developer console for network errors
2. Verify MCP server is running and accessible
3. Check Supabase database has category mappings

## 📚 Documentation Files Created

- **`OPENWEBUI_PROMPT_FIX.md`** - Complete guide with troubleshooting
- **`PROMPT_CHANGES_SUMMARY.md`** - Quick summary of changes
- **`UPDATE_CHECKLIST.md`** - This file (step-by-step checklist)

## 🎯 What Changed in the Code?

**File:** `src/components/PromptLibrary.tsx`

1. ✅ Added explicit "VÆRKTØJSKALD FORMAT" section with clear instructions
2. ✅ Updated all 7 examples to include `originalQuery` and `portal` parameters
3. ✅ Added "VIGTIGSTE REGLER" section with color-coded, emoji-enhanced rules
4. ✅ Made it impossible for AI to "forget" these parameters

**Files already updated earlier:**
- `openwebui_tool.py` - Already supports `original_query` parameter
- `supabase/functions/naevneneshus-mcp/index.ts` - Already handles `originalRequest`

## 💡 Pro Tips

1. **Always start a new chat** when testing prompt changes
2. **Use exact test queries** from examples to verify behavior
3. **Check monitoring dashboard** after every search
4. **Keep browser console open** to catch any errors
5. **Test with different acronyms** (MBL, NBL, JFL) to ensure consistency

## 🎉 When Everything Works

You should see results like this in monitoring:

```
Søgt med: "Bevisbyrde § 72"
OpenWebUI: "Bevisbyrde ved MBL § 72"
Portal: mfkn.naevneneshus.dk
📂 Kategori: Miljøbeskyttelsesloven (detected from MBL)
3 resultater
688ms
```

Clicking "📋 Vis Request Payload" should show:

```json
{
  "query": "Bevisbyrde § 72",
  "original_query": "Bevisbyrde ved MBL § 72",
  "detected_acronyms": ["MBL"],
  "detected_category": "Miljøbeskyttelsesloven",
  "ai_missed_acronym": false
}
```

Perfect! 🎊

---

*Created: 2025-12-01*
*Last Updated: 2025-12-01*
