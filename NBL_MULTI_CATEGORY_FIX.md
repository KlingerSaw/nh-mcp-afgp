# NBL Multi-Category Matching Fix - 2025-12-01

## 🎯 Problem Løst

### Problem 1: NBL Matchede Kun Én Kategori
**Før:**
Når OpenWebUI's AI detekterede "NBL" akronymet, blev kun **én** NBL kategori sendt til API'et:
```json
{
  "categories": [
    {"id": "...", "title": "NBL - beskyttede naturtyper"}
  ]
}
```

**Efter:**
Nu sendes **alle fire** NBL kategorier til API'et:
```json
{
  "categories": [
    {"id": "...", "title": "NBL - beskyttede naturtyper"},
    {"id": "...", "title": "NBL - beskyttelseslinier"},
    {"id": "...", "title": "NBL - fredningsområdet"},
    {"id": "...", "title": "NBL - øvrige"}
  ]
}
```

### Problem 2: Original Query Ikke Vist
**Note:** Dette problem kræver at brugeren opdaterer system prompten i OpenWebUI. Se `OPENWEBUI_PROMPT_FIX.md` for instruktioner.

---

## ✅ Implementerede Ændringer

### 1. Refactored `matchAcronymToCategory` → `matchAcronymToCategories`

**Fil:** `supabase/functions/naevneneshus-mcp/index.ts`

**Før:**
```typescript
async function matchAcronymToCategory(
  categories: PortalCategory[],
  acronym: string
): Promise<{ id: string; title: string } | null> {
  // ... returnerede kun første match
  return {
    id: category.category_id,
    title: category.category_title
  };
}
```

**Efter:**
```typescript
async function matchAcronymToCategories(
  categories: PortalCategory[],
  acronym: string
): Promise<Array<{ id: string; title: string }>> {
  const matches: Array<{ id: string; title: string }> = [];

  // ... finder ALLE matches
  for (const category of categories) {
    if (match) {
      matches.push({
        id: category.category_id,
        title: category.category_title
      });
    }
  }

  return matches; // Returnerer array af alle matches
}
```

### 2. Opdateret `performSearch` Logik

**Håndtering af multiple kategori matches:**

```typescript
categoryMatches = await matchAcronymToCategories(categories, aiDetectedAcronym);

if (categoryMatches.length === 0) {
  // Log unknown acronym
} else if (categoryMatches.length === 1) {
  // Single category - backward compatible behavior
  detectedCategory = {
    id: categoryMatches[0].id,
    title: categoryMatches[0].title,
    source: 'ai_acronym',
    matched_value: aiDetectedAcronym,
  };
} else {
  // Multiple categories matched (NBL, MBL, etc.)
  console.log(`Matched "${aiDetectedAcronym}" to ${categoryMatches.length} categories`);
  detectedCategory = {
    categories: categoryMatches,
    source: 'ai_acronym_multi',
    matched_value: aiDetectedAcronym,
  };
}
```

### 3. Opdateret `buildSearchPayload` Function

**Support for multiple kategorier i API request:**

```typescript
function buildSearchPayload(
  query: string,
  page: number,
  pageSize: number,
  filters?: any,
  detectedAcronym?: string,
  detectedCategories?: Array<{id: string, title: string}> // NY parameter
) {
  const categories: Array<{id: string, title: string}> = [];

  // Add detected categories (multiple for NBL, MBL, etc.)
  if (detectedCategories && detectedCategories.length > 0) {
    categories.push(...detectedCategories);
  }

  // Add filter category if provided (avoid duplicates)
  if (filters?.category && filters?.categoryTitle) {
    const alreadyAdded = categories.some(c => c.id === filters.category);
    if (!alreadyAdded) {
      categories.push({
        id: filters.category,
        title: filters.categoryTitle
      });
    }
  }

  return {
    query,
    categories, // Kan nu indeholde multiple kategorier
    sort: "Score",
    types: [],
    skip,
    size: pageSize,
  };
}
```

### 4. Opdateret Monitoring Dashboard UI

**Fil:** `src/components/MonitoringDashboard.tsx`

**Support for visning af multiple kategorier:**

```tsx
{log.raw_request?.detected_category && (
  <div className="mt-2">
    {log.raw_request.detected_category.categories &&
     log.raw_request.detected_category.categories.length > 0 ? (
      <div className="space-y-1">
        <div className="text-xs font-semibold text-emerald-700 mb-1">
          📂 Kategorier ({log.raw_request.detected_category.categories.length}):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {log.raw_request.detected_category.categories.map((cat: any, idx: number) => (
            <span key={idx} className="inline-flex items-center px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
              {cat.title}
            </span>
          ))}
        </div>
      </div>
    ) : (
      // Single category display (backward compatible)
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-xs">
        <span className="font-semibold text-emerald-700">📂 Kategori:</span>
        <span className="text-emerald-800">{log.raw_request.detected_category.title}</span>
      </div>
    )}
  </div>
)}
```

---

## 🔍 Hvordan Det Virker

### Flow for NBL Akronym Detection

1. **OpenWebUI sender request:**
   ```json
   {
     "query": "§ 26 a nedlæggelse sti",
     "detectedAcronym": "NBL",
     "originalQuery": "Praksissøgning efter NBL § 26 a – nedlæggelse af sti",
     "portal": "mfkn.naevneneshus.dk"
   }
   ```

2. **MCP Server kalder `matchAcronymToCategories("NBL")`:**
   - Finder "NBL - beskyttede naturtyper" (har alias "NBL")
   - Finder "NBL - beskyttelseslinier" (har alias "NBL")
   - Finder "NBL - fredningsområdet" (har alias "NBL")
   - Finder "NBL - øvrige" (har alias "NBL")
   - Returnerer array med alle 4 kategorier

3. **`performSearch` detekterer multiple matches:**
   ```typescript
   categoryMatches.length === 4
   // Opretter detectedCategory med categories array
   detectedCategory = {
     categories: [...alle 4 NBL kategorier...],
     source: 'ai_acronym_multi',
     matched_value: 'NBL'
   }
   ```

4. **`buildSearchPayload` bygger API request:**
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

5. **API søger på tværs af alle 4 kategorier**
   - Returner resultater fra enhver af de 4 NBL kategorier
   - Bedre recall (flere relevante resultater)

---

## 📊 Forventet Resultat

### Input:
```
"Praksissøgning efter NBL § 26 a – nedlæggelse af sti"
```

### Monitoring Dashboard Viser:
```
OpenWebUI: "Praksissøgning efter NBL § 26 a – nedlæggelse af sti"
Søgt med: "§ 26 a nedlæggelse sti"
Portal: mfkn.naevneneshus.dk

📂 Kategorier (4):
┌─────────────────────────────────────┐
│ NBL - beskyttede naturtyper         │
│ NBL - beskyttelseslinier            │
│ NBL - fredningsområdet              │
│ NBL - øvrige                        │
└─────────────────────────────────────┘
(detected from NBL)

X resultater
XXXms
```

### Request Payload:
```json
{
  "query": "§ 26 a nedlæggelse sti",
  "categories": [
    {
      "id": "65a6d80e-f89c-4575-9147-4aa8f50344be",
      "title": "NBL - beskyttede naturtyper"
    },
    {
      "id": "615ed5e3-eb89-4502-a0d0-3f5909907972",
      "title": "NBL - beskyttelseslinier"
    },
    {
      "id": "...",
      "title": "NBL - fredningsområdet"
    },
    {
      "id": "...",
      "title": "NBL - øvrige"
    }
  ],
  "sort": "Score",
  "types": [],
  "skip": 0,
  "size": 10,
  "from": "2022-01-01",
  "to": "2025-12-01"
}
```

---

## 🧪 Test Cases

### Test 1: NBL Multi-Category
**Input:** `"NBL § 26 a nedlæggelse sti"`

**Expected:**
- ✅ All 4 NBL categories in payload
- ✅ Monitoring shows "Kategorier (4)"
- ✅ API searches across all NBL categories

### Test 2: Single Category (JFL)
**Input:** `"JFL § 8 kulbrinteforurening"`

**Expected:**
- ✅ Only "Jordforureningsloven" in payload
- ✅ Monitoring shows single category
- ✅ Backward compatible behavior

### Test 3: MBL (If Multiple Exist)
**Input:** `"MBL § 72 bevisbyrde"`

**Expected:**
- ✅ All MBL categories in payload (if database has multiple)
- ✅ Monitoring shows all matched categories

### Test 4: No Acronym
**Input:** `"støj vindmøller"`

**Expected:**
- ✅ No categories in payload (unless auto-detected)
- ✅ Normal search behavior

---

## 🔧 Database Schema

**No changes required** - The `query_logs.detected_category` column is already JSONB and can handle both:
- Single category: `{id: "...", title: "...", source: "ai_acronym"}`
- Multiple categories: `{categories: [...], source: "ai_acronym_multi"}`

---

## 📝 Backward Compatibility

### Single Category Matches
The code maintains backward compatibility for acronyms that match only one category:

```typescript
if (categoryMatches.length === 1) {
  detectedCategory = {
    id: categoryMatches[0].id,
    title: categoryMatches[0].title,
    source: 'ai_acronym',
    matched_value: aiDetectedAcronym,
  };
}
```

This ensures existing functionality works unchanged for:
- JFL → Jordforureningsloven
- VL → Vandløbsloven
- SL → Skovloven
- Etc.

### Monitoring Dashboard
The UI checks for `categories` array first, falls back to single category display:

```tsx
{log.raw_request.detected_category.categories ? (
  // Multiple categories UI
) : (
  // Single category UI (backward compatible)
)}
```

---

## 🚀 Deployment Notes

1. **Edge Function må gendeployeres:**
   ```bash
   # Deploy updated MCP function
   supabase functions deploy naevneneshus-mcp
   ```

2. **Frontend må rebuildes:**
   ```bash
   npm run build
   ```

3. **No database migrations needed** - JSONB column handles both formats

4. **Test efter deployment:**
   - Test NBL query i OpenWebUI
   - Verificer monitoring dashboard viser alle 4 kategorier
   - Tjek at API payload indeholder alle kategorier

---

## 🐛 Troubleshooting

### Problem: Stadig kun én NBL kategori i payload

**Løsning:**
1. Verificer Edge Function er deployed korrekt
2. Tjek logs: `supabase functions logs naevneneshus-mcp`
3. Søg efter: "Successfully matched NBL to 4 categories"

### Problem: Original query mangler stadig

**Løsning:**
Se `OPENWEBUI_PROMPT_FIX.md` - dette kræver system prompt opdatering i OpenWebUI

### Problem: Monitoring viser ikke alle kategorier

**Løsning:**
1. Verificer frontend er rebuilt og deployed
2. Hard refresh browser (Cmd/Ctrl + Shift + R)
3. Tjek browser console for errors

---

## 📚 Relateret Dokumentation

- **`OPENWEBUI_PROMPT_FIX.md`** - Fix for original query display
- **`PROMPT_CHANGES_SUMMARY.md`** - System prompt changes
- **`UPDATE_CHECKLIST.md`** - Step-by-step update guide
- **`MONITORING.md`** - Monitoring dashboard guide

---

## ✨ Benefits

### For Brugere:
- ✅ Bedre søgeresultater ved NBL queries
- ✅ Søger automatisk på tværs af alle relevante kategorier
- ✅ Ingen manuel kategori-valg nødvendig

### For Administratorer:
- ✅ Fuld transparens i hvilke kategorier der bruges
- ✅ Bedre analytics og debugging
- ✅ Support for alle akronymer med multiple kategorier

### For Udviklere:
- ✅ Clean, maintainable code
- ✅ Backward compatible implementation
- ✅ Easy to extend for nye akronymer

---

*Opdateret: 2025-12-01*
*Version: 2.2 - NBL Multi-Category Matching*
