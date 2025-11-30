# OpenWebUI System Prompts Guide

**Hurtig reference til at sætte system prompts op i OpenWebUI**

---

## 🎯 Hvad er dette?

Dette projekt giver dig **færdige, copy-paste klare system prompts** til alle danske administrative nævn. Hver prompt er optimeret til at fungere perfekt med OpenWebUI 0.6.32+ og vores MCP server.

---

## 📚 Dynamisk Genererede Prompts

**ALLE prompts genereres dynamisk** via dashboardet baseret på portal-specifikke data fra Supabase.

### Sådan Genereres Prompts

1. Åbn dashboardet: `npm run dev` eller besøg deployed version
2. Klik på **"Prompts"** tab
3. Vælg portal fra dropdown (13 portaler tilgængelige)
4. Klik **"Kopier"** på System Prompt
5. Indsæt i OpenWebUI

### Fordele ved Dynamisk Generering

- ✅ **Altid opdateret** – Når database opdateres med nye kategorier, opdateres prompts automatisk
- ✅ **Portal-specifik** – Hver portal får unikke kategorier, lovområder og akronymer fra database
- ✅ **Konsistent struktur** – Samme format på tværs af alle 13 portaler
- ✅ **Eksempler inkluderet** – Portal-specifikke søge-eksempler genereres automatisk
- ✅ **En klik til at kopiere** – Kopier direkte til clipboard
- ✅ **Download option** – Download som .txt fil

### Tilgængelige Portaler

Alle 13 danske administrative nævn understøttes:
- MFKN, EKN, PKN, FKN, DKBB, DNFE, KLFU, TELE, RN, APV, TVIST, EAN, BYF

Se [SYSTEM_PROMPTS_INDEX.md](./SYSTEM_PROMPTS_INDEX.md) for komplet oversigt

---

## 🚀 Installation i 3 Trin

### Trin 1: Setup External Tool (Gør EN gang)

1. I OpenWebUI: Gå til **Settings** → **External Tools** (eller **Admin Settings** → **Tools** → **External Tools**)
2. Klik **"Add External Tool"** eller **"Import from URL"**
3. Indsæt:
   - **OpenAPI Spec URL:** `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
   - **Auth Type:** Bearer Token
   - **Token:** Din Supabase Anon Key fra `.env` filen (se trin nedenfor)
4. Klik **"Save"** eller **"Import"**
5. OpenWebUI opdager automatisk **16+ søgeværktøjer** - ét for hver portal:
   - `search_mfkn_naevneneshus_dk` - Miljø- og Fødevareklagenævnet
   - `search_ekn_naevneneshus_dk` - Energiklagenævnet
   - `search_pkn_naevneneshus_dk` - Planklagenævnet
   - `search_fkn_naevneneshus_dk` - Færdselsklagenævnet
   - ... og 12 andre portaler

**Hvor finder jeg min Anon Key?**
```bash
cat .env
# Find linjen: VITE_SUPABASE_ANON_KEY=eyJhbGci...
# Kopier hele nøglen efter '='
```

### Trin 2: Vælg System Prompt (For hver model)

**Via Dashboard (Kun Metode)**

1. Åbn: http://localhost:5173 eller deployed version
2. Gå til **"Prompts"** tab
3. Vælg portal fra dropdown (fx MFKN, EKN, PKN osv.)
4. Klik **"Kopier"** under System Prompt
5. Gå til OpenWebUI → Settings → Models → Vælg model → System Prompt
6. Indsæt prompten
7. Klik Save

**Bemærk:** Alle prompts genereres dynamisk fra database - ingen statiske filer

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

### Eksempler for Udvalgte Portaler

**MFKN (Miljø- og Fødevare)**
- Værktøj: `search_mfkn_naevneneshus_dk`
- Typiske søgninger: "Find afgørelser om støj", "Søg jordforurening", "PFAS-forurening"
- Prompt: Generer via Dashboard → Prompts tab

**EKN (Energi)**
- Værktøj: `search_ekn_naevneneshus_dk`
- Typiske søgninger: "Find afgørelser om vindmøller", "Søg solcelleanlæg", "netadgang"
- Prompt: Generer via Dashboard → Prompts tab

**PKN (Plan)**
- Værktøj: `search_pkn_naevneneshus_dk`
- Typiske søgninger: "Find afgørelser om lokalplaner", "landzonetilladelser", "§ 35"
- Prompt: Generer via Dashboard → Prompts tab

### Alle 13 Portaler

Brug **Prompts** tab i dashboardet til at generere prompts for:
**MFKN, EKN, PKN, FKN, DKBB, DNFE, KLFU, TELE, RN, APV, TVIST, EAN, BYF**

Hver portal får automatisk:
- Portal-specifikke kategorier
- Lovområder (hvor tilgængeligt)
- Akronymer (hvor tilgængeligt)
- Eksempel-forespørgsler

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
- Brug kategorier: "søgning, kategori: Miljøbeskyttelsesloven" eller "søgning, lovområde: MBL"
- MCP serveren parser automatisk kategori-syntaks og fjerner den fra søgningen
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
1. Er External Tool konfigureret? (Settings → External Tools)
2. Er værktøjsnavnet korrekt i prompten?
3. Understøtter modellen function calling? (GPT-4, Claude 3.5+, GPT-3.5-turbo)
4. Er værktøjerne synlige i chat-interfacet? (Tjek tool-ikonet)
5. Prøv at genstarte chat-sessionen

**Fix:**
- Tilføj i prompten: "Du SKAL bruge værktøjet search_xxx ved HVER søgning"
- Verificer at OpenAPI spec blev importeret korrekt (Settings → External Tools → Se om tools vises)
- Test med en simpel søgning: "Find afgørelser om støj på MFKN"

### Tools dukker ikke op efter import

**Tjek:**
1. Er OpenAPI URL korrekt? (skal ende med `/openapi.json`)
2. Er Bearer Token korrekt indtastet?
3. Er der fejl i import-loggen? (tjek browser console)
4. Har du ventet 10-30 sekunder efter import?

**Fix:**
- Slet og genimporter External Tool
- Verificer URL med curl:
  ```bash
  curl https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
  ```
- Tjek at du får et JSON-svar tilbage
- Genstart OpenWebUI hvis problemet fortsætter

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
