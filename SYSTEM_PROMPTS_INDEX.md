# OpenWebUI System Prompts – Alle Portaler

**Version:** 1.0
**Kompatibel med:** OpenWebUI 0.6.32+
**MCP Server:** Naevneneshus v1.1.0

---

## 📚 Tilgængelige System Prompts

Dette projekt inkluderer færdige system prompts til alle danske administrative nævn. Hver prompt er optimeret til OpenWebUI og klar til copy-paste.

### Hovedportaler (Dedikerede Filer)

| Portal | Fil | Værktøjsnavn | Fokusområde |
|--------|-----|--------------|-------------|
| **MFKN** – Miljø- og Fødevareklagenævnet | [MFKN_SYSTEM_PROMPT.md](./MFKN_SYSTEM_PROMPT.md) | `search_mfkn_naevneneshus_dk` | Miljøbeskyttelse, jordforurening, naturbeskyttelse |
| **EKN** – Energiklagenævnet | [EKN_SYSTEM_PROMPT.md](./EKN_SYSTEM_PROMPT.md) | `search_ekn_naevneneshus_dk` | Vindmøller, solenergi, elforsyning |
| **PKN** – Planklagenævnet | [PKN_SYSTEM_PROMPT.md](./PKN_SYSTEM_PROMPT.md) | `search_pkn_naevneneshus_dk` | Lokalplaner, landzonetilladelser, sommerhuse |

### Alle Portaler (Via Dashboard)

Brug **Prompts** tab i dashboardet for at generere prompts for:

- FKN – Forbrugerklagenævnet
- DKBB – Disciplinær- og klagenævnet for beskikkede bygningssagkyndige
- DNFE – Disciplinærnævnet for Ejendomsmæglere
- KLFU – Klagenævnet for Udbud
- TELE – Teleklagenævnet
- RN – Revisornævnet
- APV – Ankenævnet for Patenter og Varemærker
- TVIST – Tvistighedsnævnet
- EAN – Erhvervsankenævnet
- BYF – Byfornyelsesnævnene

---

## 🚀 Hurtig Start

### 1. Setup External Tool i OpenWebUI

**Metode A: Via OpenAPI URL (Anbefalet)**

1. Gå til Settings → Tools → External Tools
2. Klik "Add External Tool" eller "Import from URL"
3. Indsæt URL: `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
4. Authentication Type: **Bearer Token**
5. Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXZ0dHR3bnN3YWx5bmVtbHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTkxNTYsImV4cCI6MjA3OTg5NTE1Nn0.XhZycTpqCLJ2YEkciMzwufJAL6LJ3gBa_EPCdtgcB0s`
6. Klik "Save"
7. OpenWebUI opdager automatisk alle søgeværktøjer

**Metode B: Via Dashboard**

1. Åbn dashboardet: `npm run dev`
2. Gå til "Setup" tab
3. Følg instructions for External Tool setup
4. Kopier URL, OpenAPI path og Bearer token

### 2. Vælg System Prompt

**For MFKN:**
1. Åbn [MFKN_SYSTEM_PROMPT.md](./MFKN_SYSTEM_PROMPT.md)
2. Kopier hele prompten (fra "🧩 SYSTEM PROMPT" til slutningen)
3. Gå til OpenWebUI → Settings → Models → Vælg model → System Prompt
4. Indsæt prompten
5. Klik Save

**For andre portaler:**
1. Brug dashboardet: Gå til "Prompts" tab
2. Vælg portal fra dropdown
3. Kopier system prompt med "Kopier" knappen
4. Indsæt i OpenWebUI som beskrevet ovenfor

### 3. Test

Start en ny chat og test:

```
Find afgørelser om støj
```

AI'en kalder automatisk det rigtige værktøj og præsenterer strukturerede resultater.

---

## 📖 Detaljeret Dokumentation

### For MFKN (Mest Kompleks)

Se [MFKN_SYSTEM_PROMPT.md](./MFKN_SYSTEM_PROMPT.md) for:
- Komplet system prompt
- Alle lovområder og kategorier
- Akronym-liste
- Installation guide
- Eksempel-forespørgsler
- Fejlfinding

### For Andre Portaler

- [EKN_SYSTEM_PROMPT.md](./EKN_SYSTEM_PROMPT.md) – Energiklagenævnet
- [PKN_SYSTEM_PROMPT.md](./PKN_SYSTEM_PROMPT.md) – Planklagenævnet

Eller brug dashboardet til at generere prompts dynamisk baseret på database-data.

---

## 🎯 Promptens Struktur

Alle system prompts følger samme struktur:

### 1. Rolle-definition
- Hvem er AI'en?
- Hvilken portal?
- Hvilke data-kilder?

### 2. Hovedopgave
- Hvilket værktøj skal kaldes?
- Hvad håndteres automatisk?
- Hvad må AI'en IKKE gøre?

### 3. Domæne-viden
- Tilgængelige kategorier
- Lovområder
- Akronymer og forkortelser
- Fagterminologi

### 4. Output Format
- Hvordan præsenteres resultater?
- Strukturering med emojis
- Pagination-håndtering

### 5. Regler
- Hvad må AI'en ALDRIG gøre?
- Best practices
- Kvalitetskrav

### 6. Eksempler
- Typiske forespørgsler
- Forventet interaktion
- Edge cases

---

## 🔧 Tilpasning

### Ændr Output Format

Find sektionen "📄 Output Format" i prompten og tilpas strukturen efter behov.

**Eksempel – Mere kompakt format:**

```
Resultater:
1. {titel} | {dato} | {kategori} | {link}
```

**Eksempel – Mere detaljeret format:**

```
1. {titel}

   Kategori: {kategori}
   Journal: {journalnr}
   Dato: {dato}
   Myndighed: {myndighed}

   Kort beskrivelse: {første 2 sætninger}

   Link: {link}
```

### Ændr Sprog

Alle prompts er på dansk. For engelsk:

1. Erstat "Du er juridisk assistent for..." med "You are a legal assistant for..."
2. Erstat alle danske instruktioner med engelsk
3. Behold portal-navne og kategorier på dansk (de kommer fra API'et)

### Tilføj Ekstra Funktionalitet

Tilføj efter "✔ Arbejdsgang" sektionen:

```
🔔 Ekstra Funktioner

- Sammenlign afgørelser: "Sammenlign afgørelse X med afgørelse Y"
- Tidslinje: "Vis udviklingen i praksis om [emne]"
- Statistik: "Hvor mange afgørelser om [emne]?"
```

---

## 📊 Dashboard Integration

Alle prompts genereres dynamisk i dashboardet baseret på:

- **portal_metadata** tabel – portal-navne og beskrivelser
- **site_categories** tabel – tilgængelige kategorier per portal
- **legal_areas** tabel – lovområder per portal
- **portal_acronyms** tabel – almindelige forkortelser

### Fordele ved Dashboard

✅ **Altid opdateret** – Når database opdateres, opdateres prompts automatisk
✅ **Konsistent** – Samme struktur på tværs af alle portaler
✅ **Copy-paste klar** – En klik til at kopiere komplet prompt
✅ **Eksempler inkluderet** – Portal-specifikke søge-eksempler
✅ **Download option** – Download som .txt fil

---

## 🐛 Fejlfinding

### Problem: AI kalder ikke værktøjet

**Årsager:**
- External Tool ikke konfigureret korrekt
- Forkert værktøjsnavn i prompten
- Model understøtter ikke function calling

**Løsninger:**
1. Verificer External Tool er aktiveret i OpenWebUI
2. Tjek værktøjsnavnet matcher (fx `search_mfkn_naevneneshus_dk`)
3. Test med en model der understøtter function calling (GPT-4, Claude Sonnet 3.5)
4. Genstart chat-session

### Problem: Ingen resultater

**Årsager:**
- Portal er nede
- Søgeord for specifikke
- Kategori-filter for restriktiv

**Løsninger:**
1. Test samme søgning direkte på portalen (fx mfkn.naevneneshus.dk)
2. Prøv mere generelle søgetermer
3. Fjern kategori-filter
4. Tjek Monitor tab i dashboard for fejl

### Problem: Ukorrekt formatering

**Årsager:**
- Prompt ikke kopieret komplet
- Model ignorerer format-instruktioner

**Løsninger:**
1. Kopier prompten igen (brug Copy-knap i dashboard)
2. Tilføj "VIGTIGT: Følg præcis det specificerede output format" i slutningen
3. Test med anden model

---

## 📈 Monitoring

Brug dashboardet til at:

- **Monitor tab** – Se alle søgninger i real-time
- **Search tab** – Test søgninger manuelt
- **Prompts tab** – Generer og tilpas prompts

Alle søgninger via MCP-serveren logges automatisk i `query_logs` tabellen.

---

## 🔐 Sikkerhed

- Bearer token er anon key (safe til client-side brug)
- Ingen persondata gemmes
- Alle queries logges kun med timestamp, portal og søgeord
- RLS policies sikrer data-adgang

---

## 📝 Bidrag

Forbedringer til system prompts:

1. Test prompten grundigt
2. Dokumenter ændringer
3. Opdater relevante .md filer
4. Test på minimum 2 forskellige modeller

---

## 📞 Support

- **Dashboard URL:** http://localhost:5173 (lokal udvikling)
- **OpenAPI Spec:** https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
- **Health Check:** https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/health

---

## 🎓 Best Practices

### For Brugere

1. **Vær specifik** – "støj fra vejanlæg" > "støj"
2. **Brug kategorier** – Filtrerer effektivt
3. **Prøv synonymer** – Hvis ingen resultater, omformuler
4. **Brug pagination** – Bed om "næste side" for flere resultater

### For Promptudvikling

1. **Test grundigt** – Minimum 10 forskellige queries
2. **Dokumenter edge cases** – Hvad virker ikke?
3. **Hold det simpelt** – AI'en skal kunne følge instruktionerne
4. **Vær eksplicit** – "Du må ALDRIG..." > "Undgå..."

---

**Opdateret:** 2025-11-28
**Licens:** MIT
**Maintainer:** Your Name
