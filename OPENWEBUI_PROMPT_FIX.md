# OpenWebUI System Prompt Fix - Opdatering 2025-12-01

## 🎯 Problemer Løst

### Problem 1: "OpenWebUI:" Manglede i Monitoring Dashboard
**Symptom:** Monitoring dashboardet viste kun "Søgt med: Bevisbyrde § 72", men ikke den oprindelige bruger-query "Bevisbyrde ved MBL § 72".

**Root Cause:** System prompten instruerede ikke AI'en til at sende `originalQuery` parameteren.

### Problem 2: Akronymer Blev Ikke Detekteret (MBL, NBL, JFL, osv.)
**Symptom:** Payload viste:
```json
{
  "detected_acronyms": [],
  "detected_category": null
}
```

**Root Cause:** OpenWebUI's AI "glemte" at sende `detectedAcronym` parameteren, selvom den blev nævnt i eksemplerne.

---

## ✅ Løsning Implementeret

### 1. Tilføjet Eksplicit VÆRKTØJSKALD FORMAT Sektion
```
📞 VÆRKTØJSKALD FORMAT (OBLIGATORISK!)

⚠️ KRITISK: ALTID send disse 4 parametre til værktøjet:

{
  "query": "<optimeret query efter alle trin>",
  "detectedAcronym": "<akronym fra tabel ELLER null>",
  "originalQuery": "<UÆNDRET bruger input>",
  "portal": "mfkn.naevneneshus.dk"
}
```

### 2. Opdateret Alle 7 Eksempler
Alle eksempler inkluderer nu `originalQuery` og `portal` parametre:

**Før:**
```json
{"query": "Bevisbyrde § 72", "detectedAcronym": "MBL"}
```

**Efter:**
```json
{
  "query": "Bevisbyrde § 72",
  "detectedAcronym": "MBL",
  "originalQuery": "Bevisbyrde ved MBL § 72 og søgning om § 72-praksis",
  "portal": "mfkn.naevneneshus.dk"
}
```

### 3. Tilføjet VIGTIGSTE REGLER Sektion
```
⚠️ VIGTIGSTE REGLER (TJEK ALTID!)

🔴 OBLIGATORISK - Glem ALDRIG disse:
✅ ALTID send "originalQuery" med UÆNDRET bruger-input
✅ ALTID send "detectedAcronym" hvis fundet i akronym-tabel
✅ ALTID send alle 4 parametre: query, detectedAcronym, originalQuery, portal
✅ Hvis INTET akronym findes, send detectedAcronym: null

❌ GLEM ALDRIG:
- originalQuery parameter (viser i monitoring dashboard)
- detectedAcronym parameter (aktiverer kategori-filter)
```

---

## 🚀 Sådan Opdaterer Du Din OpenWebUI

### Trin 1: Generer Ny System Prompt
1. Åbn dashboardet: http://localhost:5173 (eller deployed version)
2. Gå til **"Prompts"** tab
3. Vælg din portal (f.eks. MFKN)
4. Klik **"Kopier"** under System Prompt

### Trin 2: Opdater OpenWebUI
1. Gå til OpenWebUI → **Settings** → **Models**
2. Find din model (f.eks. "gpt-4o" eller lignende)
3. Klik på modellen → **System Prompt**
4. **Slet den gamle prompt** (vigtig!)
5. Indsæt den nye prompt fra clipboard
6. Klik **Save**

### Trin 3: Test Med "Bevisbyrde ved MBL § 72"
Start en ny chat og skriv:
```
Bevisbyrde ved MBL § 72
```

OpenWebUI's AI vil nu:
1. Optimere query til: "Bevisbyrde § 72"
2. Detektere akronym: "MBL"
3. Sende original: "Bevisbyrde ved MBL § 72"
4. Kalde værktøjet med alle 4 parametre

### Trin 4: Verificer i Monitoring Dashboard
Gå til dashboard → **Monitoring** tab og find din seneste søgning.

**Forventet output:**
```
Søgt med: "Bevisbyrde § 72"
OpenWebUI: "Bevisbyrde ved MBL § 72"
Portal: mfkn.naevneneshus.dk
📂 Kategori: Miljøbeskyttelsesloven (detected from MBL)
3 resultater | 533ms
```

**Klik "📋 Vis Request Payload" og verificer:**
```json
{
  "query": "Bevisbyrde § 72",
  "portal": "mfkn.naevneneshus.dk",
  "filters": {
    "dateRange": {
      "end": "2025-12-01",
      "start": "2022-01-01"
    }
  },
  "pagination": {
    "page": 1,
    "pageSize": 10
  },
  "original_query": "Bevisbyrde ved MBL § 72",
  "ai_missed_acronym": false,
  "detected_acronyms": ["MBL"],
  "detected_category": "Miljøbeskyttelsesloven"
}
```

✅ `detected_acronyms: ["MBL"]` - Akronym detekteret!
✅ `detected_category: "Miljøbeskyttelsesloven"` - Kategori sat!
✅ `original_query: "Bevisbyrde ved MBL § 72"` - Original query gemt!

---

## 🔍 Troubleshooting

### "OpenWebUI:" Vises Stadig Ikke
**Problem:** Dashboard viser kun "Søgt med:", ikke "OpenWebUI:"

**Løsninger:**
1. ✅ Tjek at du har genereret en **ny** prompt fra dashboardet (efter opdateringen)
2. ✅ Tjek at du har **slettet den gamle** prompt i OpenWebUI før du indsatte den nye
3. ✅ Tjek at OpenWebUI faktisk bruger den opdaterede prompt (test med en ny chat)
4. ✅ Tjek payload i monitoring - hvis `original_query === query`, så sender AI'en ikke parameteren

### Akronymer Detekteres Stadig Ikke
**Problem:** Payload viser `detected_acronyms: []`

**Løsninger:**
1. ✅ Verificer at akronymet findes i akronym-tabellen i prompten (f.eks. "MBL → Miljøbeskyttelsesloven")
2. ✅ Tjek at bruger-query rent faktisk indeholder akronymet (f.eks. "MBL", ikke "miljøbeskyttelsesloven")
3. ✅ Test med et eksempel fra prompten: "Bevisbyrde ved MBL § 72"
4. ✅ Tjek om OpenWebUI sender `detectedAcronym` parameteren i payload

### AI'en Sender Stadig Ikke Alle Parametre
**Problem:** AI'en "glemmer" stadig `originalQuery` eller `detectedAcronym`

**Mulige årsager:**
- OpenWebUI bruger en ældre version af prompten (restart chat)
- AI-modellen er for "kreativ" og følger ikke instruktionerne
- Prompten er for lang og AI'en "glemmer" dele af den

**Løsninger:**
1. ✅ Start en **ny chat** (gamle chats bruger cache)
2. ✅ Brug en mere instruktions-følgende model (f.eks. GPT-4 i stedet for GPT-3.5)
3. ✅ Kontakt support hvis problemet fortsætter

---

## 📊 Før vs. Efter Sammenligning

### Før Opdatering
```
Søgt med: "Bevisbyrde § 72"
Portal: mfkn.naevneneshus.dk
3 resultater | 533ms
```

**Payload:**
```json
{
  "detected_acronyms": [],
  "detected_category": null,
  "original_query": "Bevisbyrde § 72"  // Samme som query!
}
```

**Problemer:**
❌ Original bruger-input mangler ("Bevisbyrde ved MBL § 72")
❌ MBL akronym ikke detekteret
❌ Kategori-filter ikke anvendt
❌ Ingen transparens i søgeprocessen

### Efter Opdatering
```
Søgt med: "Bevisbyrde § 72"
OpenWebUI: "Bevisbyrde ved MBL § 72"  ✅ NY!
Portal: mfkn.naevneneshus.dk
📂 Kategori: Miljøbeskyttelsesloven  ✅ NY!
3 resultater | 533ms
```

**Payload:**
```json
{
  "detected_acronyms": ["MBL"],  ✅ NY!
  "detected_category": "Miljøbeskyttelsesloven",  ✅ NY!
  "original_query": "Bevisbyrde ved MBL § 72"  ✅ Korrekt!
}
```

**Forbedringer:**
✅ Original bruger-input vises korrekt
✅ MBL akronym detekteret og matched til Miljøbeskyttelsesloven
✅ Kategori-filter anvendt automatisk
✅ Fuld transparens i søgeprocessen
✅ Bedre analytics og debugging

---

## 📚 Relateret Dokumentation

- **`OPENWEBUI_PROMPTS_GUIDE.md`** - Komplet guide til system prompts
- **`SYSTEM_PROMPTS_INDEX.md`** - Oversigt over alle 13 portaler
- **`MONITORING.md`** - Guide til monitoring dashboard
- **`openwebui_tool.py`** - Python tool implementation

---

## 🎓 Teknisk Detaljer

### Ændringer i Kodebasen

**Fil:** `src/components/PromptLibrary.tsx`

1. **Ny VÆRKTØJSKALD FORMAT sektion** (linje 471-503)
2. **Opdateret eksempler 1-7** med `originalQuery` og `portal` (linje 507-603)
3. **Ny VIGTIGSTE REGLER sektion** (linje 605-626)

**Fil:** `openwebui_tool.py`

- Understøtter allerede `original_query` parameter (opdateret tidligere)
- Fallback til `query` hvis `original_query` ikke sendes

**Fil:** `supabase/functions/naevneneshus-mcp/index.ts`

- Håndterer `originalRequest` og logger `original_query` korrekt
- Ingen ændringer nødvendige

### Database Schema

**Tabel:** `query_logs`

Relevante kolonner:
- `query` - Den optimerede søgestreng (efter stopwords, akronym-fjernelse)
- `original_query` - Den oprindelige bruger-input (før optimering)
- `detected_acronyms` - Array af detekterede akronymer (f.eks. ["MBL"])
- `detected_category` - Matched kategori (f.eks. "Miljøbeskyttelsesloven")
- `ai_missed_acronym` - Boolean der viser om AI'en glemte at detektere akronym

---

## ✨ Hvad Virker Nu?

✅ **Original query vises i monitoring**
✅ **Akronymer detekteres automatisk (MBL, NBL, JFL, osv.)**
✅ **Kategori-filter anvendes baseret på akronymer**
✅ **Fuld transparens i søgeprocessen**
✅ **Bedre debugging og analytics**
✅ **Konsistent behaviour på tværs af alle 13 portaler**

---

*Opdateret: 2025-12-01*
*Version: 2.1 - Original Query & Acronym Detection Fix*
