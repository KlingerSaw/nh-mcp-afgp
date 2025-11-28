# OpenWebUI System Prompts Guide

**Hurtig reference til at sætte system prompts op i OpenWebUI**

---

## 🎯 Hvad er dette?

Dette projekt giver dig **færdige, copy-paste klare system prompts** til alle danske administrative nævn. Hver prompt er optimeret til at fungere perfekt med OpenWebUI 0.6.32+ og vores MCP server.

---

## 📚 Tilgængelige Prompts

### I Dashboard (Anbefalet)

1. Åbn dashboardet: `npm run dev`
2. Klik på **"Prompts"** tab
3. Vælg portal fra dropdown
4. Klik **"Kopier"** på System Prompt
5. Indsæt i OpenWebUI

**Fordele:**
- ✅ Altid opdateret med seneste kategorier og lovområder
- ✅ Genereret dynamisk fra database
- ✅ Inkluderer portal-specifikke eksempler
- ✅ En klik til at kopiere

### Som Markdown Filer

**Hovedportaler:**
- [MFKN_SYSTEM_PROMPT.md](./MFKN_SYSTEM_PROMPT.md) – Miljø- og Fødevareklagenævnet
- [EKN_SYSTEM_PROMPT.md](./EKN_SYSTEM_PROMPT.md) – Energiklagenævnet
- [PKN_SYSTEM_PROMPT.md](./PKN_SYSTEM_PROMPT.md) – Planklagenævnet

**Alle portaler:**
- Se [SYSTEM_PROMPTS_INDEX.md](./SYSTEM_PROMPTS_INDEX.md) for komplet oversigt

---

## 🚀 Installation i 3 Trin

### Trin 1: Setup External Tool (Gør EN gang)

1. I OpenWebUI: Gå til **Settings** → **Tools** → **External Tools**
2. Klik **"Add External Tool"** eller **"Import from URL"**
3. Indsæt:
   - **URL:** `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
   - **Auth Type:** Bearer Token
   - **Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXZ0dHR3bnN3YWx5bmVtbHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTkxNTYsImV4cCI6MjA3OTg5NTE1Nn0.XhZycTpqCLJ2YEkciMzwufJAL6LJ3gBa_EPCdtgcB0s`
4. Klik **"Save"**
5. OpenWebUI opdager automatisk alle søgeværktøjer (search_mfkn_naevneneshus_dk osv.)

### Trin 2: Vælg System Prompt (For hver model)

**Metode A: Via Dashboard (Anbefalet)**

1. Åbn: http://localhost:5173
2. Gå til **"Prompts"** tab
3. Vælg portal (fx MFKN)
4. Klik **"Kopier"** under System Prompt
5. Gå til OpenWebUI → Settings → Models → Vælg model → System Prompt
6. Indsæt prompten
7. Klik Save

**Metode B: Via Markdown Fil**

1. Åbn [MFKN_SYSTEM_PROMPT.md](./MFKN_SYSTEM_PROMPT.md)
2. Kopier prompten (fra "🧩 SYSTEM PROMPT" til slutningen)
3. Indsæt i OpenWebUI som beskrevet ovenfor

### Trin 3: Test

Start en ny chat og skriv:

```
Find afgørelser om støj
```

AI'en skulle nu:
1. Automatisk kalde `search_mfkn_naevneneshus_dk`
2. Præsentere strukturerede resultater med emojis
3. Tilbyde "næste side" hvis der er flere resultater

---

## 📖 For Hver Portal

### MFKN (Miljø- og Fødevare)

**Værktøj:** `search_mfkn_naevneneshus_dk`

**Typiske søgninger:**
- "Find afgørelser om støj"
- "Søg jordforurening, kategori: Jordforureningsloven"
- "Hvad siger praksis om § 72"
- "Find PFAS-forurening"

**Prompt:** [MFKN_SYSTEM_PROMPT.md](./MFKN_SYSTEM_PROMPT.md)

### EKN (Energi)

**Værktøj:** `search_ekn_naevneneshus_dk`

**Typiske søgninger:**
- "Find afgørelser om vindmøller"
- "Søg solcelleanlæg"
- "Hvad siger praksis om netadgang"

**Prompt:** [EKN_SYSTEM_PROMPT.md](./EKN_SYSTEM_PROMPT.md)

### PKN (Plan)

**Værktøj:** `search_pkn_naevneneshus_dk`

**Typiske søgninger:**
- "Find afgørelser om lokalplaner"
- "Søg landzonetilladelser"
- "Hvad siger praksis om § 35"

**Prompt:** [PKN_SYSTEM_PROMPT.md](./PKN_SYSTEM_PROMPT.md)

### Alle Andre Portaler

Brug **Prompts** tab i dashboardet til at generere prompts for:

FKN, DKBB, DNFE, KLFU, TELE, RN, APV, TVIST, EAN, BYF

---

## 🎓 Promptens Struktur

Hver prompt indeholder:

1. **Rolle** – Hvem er AI'en?
2. **Opgave** – Hvad skal den gøre?
3. **Kategorier** – Hvilke kategorier findes?
4. **Lovområder** – Hvilke love dækkes?
5. **Akronymer** – Hvilke forkortelser genkendes?
6. **Output Format** – Hvordan præsenteres resultater?
7. **Regler** – Hvad må AI'en ALDRIG gøre?
8. **Eksempler** – Typiske interaktioner

---

## ✨ Best Practices

### For Brugere

✅ **DO:**
- Vær specifik: "støj fra vejanlæg" > "støj"
- Brug kategorier: "søgning, kategori: Miljøbeskyttelsesloven"
- Bed om næste side: "vis flere" eller "side 2"
- Omformuler ved ingen resultater

❌ **DON'T:**
- Forvent at AI'en gætter eller opfinder afgørelser
- Bed om juridisk rådgivning (AI'en søger kun praksis)
- Forvente at AI'en kender afgørelser uden at søge

### For Prompt-Tilpasning

✅ **DO:**
- Test grundigt med 10+ forskellige queries
- Hold instruktioner simple og klare
- Brug eksempler til at demonstrere forventet adfærd
- Dokumenter ændringer

❌ **DON'T:**
- Gør prompten for lang (max 2000 ord)
- Tilføj modsatrettede instruktioner
- Antag at AI'en "forstår" implicit viden

---

## 🐛 Fejlfinding

### AI'en kalder ikke værktøjet

**Tjek:**
1. Er External Tool konfigureret? (Settings → Tools)
2. Er værktøjsnavnet korrekt i prompten?
3. Understøtter modellen function calling? (GPT-4, Claude 3.5+)
4. Prøv at genstarte chat-sessionen

**Fix:**
- Tilføj i prompten: "Du SKAL bruge værktøjet search_xxx ved HVER søgning"

### Ingen resultater

**Tjek:**
1. Virker portalen? Test på fx mfkn.naevneneshus.dk
2. Er søgeordet for specifikt?
3. Er kategori-filter for restriktivt?

**Fix:**
- Prøv mere generelle søgeord
- Fjern kategori-filter
- Tjek Monitor tab i dashboard for fejl

### Forkert formatering

**Tjek:**
1. Er hele prompten kopieret?
2. Har modellen ignoreret format-instruktioner?

**Fix:**
- Kopier prompten igen fra dashboard
- Tilføj "VIGTIGT: Følg præcis format" i slutningen
- Test med anden model

---

## 📊 Monitoring

Brug dashboardet til at:

- **Search tab** – Test søgninger manuelt
- **Prompts tab** – Generer og kopier prompts
- **Setup tab** – Se credentials og test API
- **Monitor tab** – Real-time log af alle søgninger

Alle søgninger logges i `query_logs` tabellen i Supabase.

---

## 🔄 Opdatering af Prompts

Når kategorier eller lovområder ændres i databasen:

1. Prompter i dashboardet opdateres **automatisk**
2. Markdown filer skal regenereres manuelt (eller brug dashboardet)

**Anbefaling:** Brug altid Prompts tab i dashboardet for at få seneste data.

---

## 📞 Hurtig Reference

| Element | Værdi |
|---------|-------|
| **Dashboard** | http://localhost:5173 |
| **OpenAPI Spec** | https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json |
| **Health Check** | https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/health |
| **Bearer Token** | `eyJhbGc...B0s` (se .env fil) |

---

## 🎯 Næste Skridt

1. ✅ Setup External Tool (gør EN gang)
2. ✅ Kopier system prompt fra dashboard
3. ✅ Indsæt i OpenWebUI model
4. ✅ Test med simpel søgning
5. ✅ Udforsk andre portaler

---

**Spørgsmål?** Se [SYSTEM_PROMPTS_INDEX.md](./SYSTEM_PROMPTS_INDEX.md) for detaljeret dokumentation.

**Opdateret:** 2025-11-28
