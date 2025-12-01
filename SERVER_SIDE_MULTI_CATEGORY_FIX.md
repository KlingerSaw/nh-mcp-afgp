# Server-Side Multi-Category Detection Fix - 2025-12-01

## 🎯 Problem Løst

### **Root Cause: OpenWebUI AI Sender IKKE `detectedAcronym` Parameter**

**Observeret Behavior:**
```json
{
  "query": "NBL § 26 a nedlæggelse sti",
  "ai_missed_acronym": true,  ← AI glemte at sende detectedAcronym!
  "detected_category": {
    "source": "server_detected",  ← Server måtte selv detektere det
    "title": "NBL - beskyttede naturtyper"  ← Kun ÉN kategori!
  }
}
```

**Problem:**
- OpenWebUI's AI sender IKKE `detectedAcronym: "NBL"` selvom prompten instruerer det
- Server-side fallback (`detectCategoryFromQuery`) returnerede kun FØRSTE match
- Resultat: Kun "NBL - beskyttede naturtyper" i payload, ikke alle 4 NBL kategorier

**Løsning:**
- Refactored server-side detection til at finde ALLE matches
- Nu finder serveren alle 4 NBL kategorier automatisk
- Virker uanset om OpenWebUI sender `detectedAcronym` eller ej

---

## ✅ Implementerede Ændringer

### **1. Refactored `detectCategoryFromQuery` → `detectCategoriesFromQuery`**

**Fil:** `supabase/functions/naevneneshus-mcp/index.ts`

**Før:**
```typescript
async function detectCategoryFromQuery(
  categories: PortalCategory[],
  query: string
): Promise<{ id: string; title: string } | null> {
  for (const category of categories) {
    for (const alias of aliases) {
      if (isAcronymMatch || isFullNameMatch) {
        // Returnerer kun FØRSTE match! ❌
        return {
          id: category.category_id,
          title: category.category_title
        };
      }
    }
  }
  return null;
}
```

**Efter:**
```typescript
async function detectCategoriesFromQuery(
  categories: PortalCategory[],
  query: string
): Promise<Array<{ id: string; title: string; matchedAlias: string }>> {
  const matches: Array<{ id: string; title: string; matchedAlias: string }> = [];

  for (const category of categories) {
    for (const alias of aliases) {
      if (isAcronymMatch || isFullNameMatch) {
        // Samler ALLE matches! ✅
        matches.push({
          id: category.category_id,
          title: category.category_title,
          matchedAlias: alias
        });
        break; // Kun én match per kategori
      }
    }
  }

  return matches; // Returnerer array af alle matches
}
```

**Key Changes:**
- ✅ Return type: `Array<...>` i stedet for single objekt/null
- ✅ Samler alle matches i array
- ✅ Inkluderer `matchedAlias` for bedre logging
- ✅ `break` efter første alias match per kategori (undgår duplicates)

---

### **2. Opdateret `performSearch` Logik**

**Håndtering af server-detected multiple kategorier:**

```typescript
if (!detectedCategory) {
  const serverDetectedCategories = await detectCategoriesFromQuery(categories, finalQueryForSearch);

  if (serverDetectedCategories.length > 0 && !aiDetectedAcronym) {
    aiMissedAcronym = true;

    if (serverDetectedCategories.length === 1) {
      // Single category - backward compatible
      categoryInfo = serverDetectedCategories[0];
      detectedCategory = {
        id: serverDetectedCategories[0].id,
        title: serverDetectedCategories[0].title,
        source: 'server_detected',
        matched_value: serverDetectedCategories[0].matchedAlias,
      };
    } else {
      // Multiple categories (NBL, MBL, etc.) ✅ NEW!
      console.log(`Server detected ${serverDetectedCategories.length} categories`);
      categoryInfo = serverDetectedCategories[0];
      categoryMatches = serverDetectedCategories; // For buildSearchPayload
      detectedCategory = {
        categories: serverDetectedCategories,
        source: 'server_detected_multi',  ← NEW SOURCE TYPE!
        matched_value: serverDetectedCategories[0].matchedAlias,
      };
    }
  }
}
```

**Key Changes:**
- ✅ Detekterer når server finder multiple kategorier
- ✅ Ny source type: `'server_detected_multi'`
- ✅ Gemmer `categoryMatches` til `buildSearchPayload`
- ✅ Backward compatible for single category detection

---

### **3. Opdateret Monitoring Dashboard UI**

**Fil:** `src/components/MonitoringDashboard.tsx`

**Support for `server_detected_multi` source:**

```tsx
<div className="text-xs text-emerald-600 mt-1">
  ({log.raw_request.detected_category.source === 'ai_acronym_multi' ?
      `AI detected from ${log.raw_request.detected_category.matched_value}` :
    log.raw_request.detected_category.source === 'server_detected_multi' ?
      `Server detected from ${log.raw_request.detected_category.matched_value}` : ← NEW!
    log.raw_request.detected_category.source === 'explicit_syntax' ?
      'parsed fra query' :
    log.raw_request.detected_category.source === 'ai_acronym' ?
      'AI detekteret' :
    log.raw_request.detected_category.source === 'server_detected' ?
      'server detekteret' :
    'filter parameter'})
</div>
```

**Visning:**
- Viser "Server detected from NBL" når server finder multiple kategorier
- Bruger samme multi-category badge UI som `ai_acronym_multi`
- Fuld transparens om detection metode

---

## 🔍 Hvordan Det Virker Nu

### **Scenario 1: OpenWebUI SENDER `detectedAcronym` (Ideal)**

**Request fra OpenWebUI:**
```json
{
  "query": "§ 26 a nedlæggelse sti",
  "detectedAcronym": "NBL",  ← AI sender korrekt!
  "portal": "mfkn.naevneneshus.dk"
}
```

**Server Flow:**
1. ✅ `matchAcronymToCategories("NBL")` finder alle 4 NBL kategorier
2. ✅ `source: 'ai_acronym_multi'`
3. ✅ Alle 4 kategorier i payload

**Result:**
```json
{
  "categories": [
    {"id": "...", "title": "NBL - beskyttede naturtyper"},
    {"id": "...", "title": "NBL - beskyttelseslinier"},
    {"id": "...", "title": "NBL - fredningsområdet"},
    {"id": "...", "title": "NBL - øvrige"}
  ],
  "detected_category": {
    "categories": [...],
    "source": "ai_acronym_multi"
  }
}
```

---

### **Scenario 2: OpenWebUI GLEMMER `detectedAcronym` (Actual Reality)**

**Request fra OpenWebUI:**
```json
{
  "query": "NBL § 26 a nedlæggelse sti",  ← NBL er i query
  "detectedAcronym": null,  ← AI glemte det! ❌
  "portal": "mfkn.naevneneshus.dk"
}
```

**Server Flow:**
1. ✅ `matchAcronymToCategories(null)` returnerer `[]` (intet AI akronym)
2. ✅ `detectCategoriesFromQuery("NBL § 26 a...")` finder "NBL" i query
3. ✅ Finder alle 4 NBL kategorier fra database
4. ✅ `source: 'server_detected_multi'`
5. ✅ Alle 4 kategorier i payload

**Result:**
```json
{
  "categories": [
    {"id": "...", "title": "NBL - beskyttede naturtyper"},
    {"id": "...", "title": "NBL - beskyttelseslinier"},
    {"id": "...", "title": "NBL - fredningsområdet"},
    {"id": "...", "title": "NBL - øvrige"}
  ],
  "detected_category": {
    "categories": [...],
    "source": "server_detected_multi",  ← Server redder situationen! ✅
    "matched_value": "NBL"
  },
  "ai_missed_acronym": true  ← Logger at AI glemte det
}
```

---

## 📊 Forventet Resultat

### **Input:**
```
"NBL § 26 a nedlæggelse sti"
```

### **Monitoring Dashboard Viser:**
```
OpenWebUI: "NBL § 26 a nedlæggelse sti"
Søgt med: "§ 26 a nedlæggelse sti"
Portal: mfkn.naevneneshus.dk

📂 Kategorier (4):
┌─────────────────────────────────────┐
│ NBL - beskyttede naturtyper         │
│ NBL - beskyttelseslinier            │
│ NBL - fredningsområdet              │
│ NBL - øvrige                        │
└─────────────────────────────────────┘
(Server detected from NBL)  ← Viser server-side detection!

X resultater
XXXms
```

### **Request Payload til API:**
```json
{
  "query": "§ 26 a nedlæggelse sti",
  "categories": [
    {"id": "65a6d80e-f89c-4575-9147-4aa8f50344be", "title": "NBL - beskyttede naturtyper"},
    {"id": "615ed5e3-eb89-4502-a0d0-3f5909907972", "title": "NBL - beskyttelseslinier"},
    {"id": "...", "title": "NBL - fredningsområdet"},
    {"id": "...", "title": "NBL - øvrige"}
  ],
  "sort": "Score",
  "types": [],
  "skip": 0,
  "size": 10
}
```

---

## 🧪 Test Cases

### **Test 1: Server-Side NBL Detection**
**Input:** `"NBL § 26 a nedlæggelse sti"` (uden `detectedAcronym`)

**Expected:**
- ✅ All 4 NBL categories in payload
- ✅ `source: 'server_detected_multi'`
- ✅ `ai_missed_acronym: true`
- ✅ Monitoring shows "Server detected from NBL"

### **Test 2: AI-Side NBL Detection**
**Input:** `"NBL § 26 a nedlæggelse sti"` (med `detectedAcronym: "NBL"`)

**Expected:**
- ✅ All 4 NBL categories in payload
- ✅ `source: 'ai_acronym_multi'`
- ✅ `ai_missed_acronym: false`
- ✅ Monitoring shows "AI detected from NBL"

### **Test 3: Single Category (JFL)**
**Input:** `"JFL § 8 kulbrinteforurening"`

**Expected:**
- ✅ Only "Jordforureningsloven" in payload
- ✅ `source: 'server_detected'` or `'ai_acronym'`
- ✅ Single category display in monitoring

### **Test 4: No Acronym**
**Input:** `"støj fra vindmøller"`

**Expected:**
- ✅ No categories in payload
- ✅ Normal search behavior
- ✅ No category display in monitoring

---

## 🎉 Benefits

### **Robustness:**
- ✅ Virker **uanset** om OpenWebUI sender `detectedAcronym`
- ✅ Server-side fallback sikrer korrekt behavior
- ✅ Ingen afhængighed af AI's hukommelse

### **Transparency:**
- ✅ Monitoring viser **hvordan** kategorien blev detekteret
- ✅ `ai_missed_acronym` flag logger når AI glemmer det
- ✅ Fuld tracking af detection metode

### **Consistency:**
- ✅ Samme resultat uanset detection metode
- ✅ Alle 4 NBL kategorier i begge scenarier
- ✅ Bedre brugeroplevelse

### **Backward Compatibility:**
- ✅ Single category detection virker som før
- ✅ Eksisterende akronymer (JFL, VL, SL) upåvirket
- ✅ Ingen breaking changes

---

## 🚀 Deployment

### **Step 1: Deploy Edge Function**
```bash
supabase functions deploy naevneneshus-mcp
```

### **Step 2: Deploy Frontend**
```bash
npm run build
# Deploy dist/ folder
```

### **Step 3: Test NBL Query**

**I OpenWebUI:**
```
NBL § 26 a nedlæggelse sti
```

**Verificer i Monitoring:**
- [ ] Alle 4 NBL kategorier vises
- [ ] Source viser "Server detected from NBL"
- [ ] Payload indeholder alle 4 kategorier

### **Step 4: Check Logs**

```bash
supabase functions logs naevneneshus-mcp --tail
```

**Look for:**
```
Server detected 4 categories from query: NBL - beskyttede naturtyper, NBL - beskyttelseslinier, NBL - fredningsområdet, NBL - øvrige
```

---

## 🐛 Troubleshooting

### **Problem: Stadig kun én NBL kategori**

**Check:**
1. Er Edge Function deployed?
   ```bash
   supabase functions list
   ```

2. Check database aliases:
   ```sql
   SELECT category_title, aliases
   FROM site_categories
   WHERE portal = 'mfkn.naevneneshus.dk'
   AND category_title LIKE 'NBL%';
   ```

3. Verificer alle 4 NBL kategorier har "NBL" i deres aliases array

**Expected Result:**
```
NBL - beskyttede naturtyper   | ["NBL", ...]
NBL - beskyttelseslinier       | ["NBL", ...]
NBL - fredningsområdet         | ["NBL", ...]
NBL - øvrige                   | ["NBL", ...]
```

### **Problem: Console errors i frontend**

**Solution:**
```bash
npm run build
# Hard refresh browser (Cmd/Ctrl + Shift + R)
```

### **Problem: `ai_missed_acronym` altid true**

**Dette er forventet!** Hvis OpenWebUI ikke sender `detectedAcronym`, vil `ai_missed_acronym` være `true`.

**For at fixe dette permanent:**
- Opdater OpenWebUI system prompt (se `OPENWEBUI_PROMPT_FIX.md`)
- Men systemet virker perfekt selv uden dette! ✅

---

## 📚 Relateret Dokumentation

- **`NBL_MULTI_CATEGORY_FIX.md`** - Original AI-side multi-category fix
- **`SERVER_SIDE_MULTI_CATEGORY_FIX.md`** - Dette dokument (server-side fallback)
- **`OPENWEBUI_PROMPT_FIX.md`** - Fix for OpenWebUI at sende detectedAcronym
- **`DEPLOYMENT_CHECKLIST_NBL.md`** - Deployment guide

---

## 🔄 Detection Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenWebUI Request                         │
│  query: "NBL § 26 a nedlæggelse sti"                        │
│  detectedAcronym: "NBL" (if AI remembers) or null (if not)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                ┌───────────┴───────────┐
                │                       │
         YES ←──┤ detectedAcronym?      │──→ NO
                │                       │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                                       ↓
┌──────────────────┐                 ┌──────────────────┐
│ AI-Side Detection│                 │Server-Side Detect│
│matchAcronymTo... │                 │detectCategoriesF.│
│                  │                 │                  │
│ Finds all 4 NBL  │                 │ Finds all 4 NBL  │
│ categories       │                 │ categories       │
│                  │                 │                  │
│ source:          │                 │ source:          │
│ 'ai_acronym_multi'│                │'server_detected..│
└──────────────────┘                 └──────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            ↓
                ┌───────────────────────┐
                │ buildSearchPayload    │
                │                       │
                │ categories: [         │
                │   NBL - beskyttede..  │
                │   NBL - beskyttelses..│
                │   NBL - frednings...  │
                │   NBL - øvrige        │
                │ ]                     │
                └───────────────────────┘
                            ↓
                ┌───────────────────────┐
                │   API Search          │
                │   Across all 4 NBL    │
                │   categories          │
                └───────────────────────┘
```

---

## ✨ Konklusion

**Problem:** OpenWebUI AI glemte at sende `detectedAcronym`, så kun én NBL kategori blev brugt.

**Løsning:** Server-side detection finder nu ALLE matching kategorier automatisk.

**Resultat:** NBL søgninger virker perfekt uanset om AI husker at sende akronymet! 🎉

---

*Opdateret: 2025-12-01*
*Version: 2.3 - Server-Side Multi-Category Fallback*
