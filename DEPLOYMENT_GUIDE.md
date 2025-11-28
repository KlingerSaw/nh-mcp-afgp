# 🚀 Deployment Guide - Fix Connection Error

## ❌ Problem Du Ser Nu

**Error:** "Connection failed" i OpenWebUI
**Cause:** Edge function returnerer `500 Internal Server Error`
**Reason:** Opdateret kode med logging er ikke deployed endnu

---

## ✅ Løsning: Deploy Edge Function

### **Method 1: Supabase Dashboard (ANBEFALET)**

#### **Step 1: Åbn Supabase Functions Dashboard**
```
https://supabase.com/dashboard/project/soavtttwnswalynemlxr/functions
```

#### **Step 2: Find `naevneneshus-mcp` funktionen**
- Se listen over edge functions
- Klik på `naevneneshus-mcp`

#### **Step 3: Deploy ny kode**
1. Klik på **"Edit"** eller **"..."** menu → **"Edit function"**
2. Kopier HELE indholdet fra:
   ```
   /tmp/cc-agent/60831267/project/supabase/functions/naevneneshus-mcp/index.ts
   ```
3. Paste i Supabase editor (erstat al gammel kode)
4. Klik **"Deploy"** eller **"Save & Deploy"**
5. Vent på deployment er færdig (grøn checkmark)

#### **Step 4: Verificer deployment**
Test endpoint i terminal:
```bash
curl -i https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```

**Forventet resultat:** HTTP 200 OK (ikke 500)

---

### **Method 2: CLI Deployment**

#### **Step 1: Login til Supabase**
```bash
npx supabase login
```
Dette åbner en browser hvor du autoriserer CLI access.

#### **Step 2: Link til projekt**
```bash
npx supabase link --project-ref soavtttwnswalynemlxr
```

#### **Step 3: Deploy function**
```bash
npx supabase functions deploy naevneneshus-mcp --no-verify-jwt
```

#### **Step 4: Verificer deployment**
```bash
curl -i https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```

---

## 🔧 OpenWebUI Configuration

### **Korrekt URL Setup**

**URL til OpenAPI spec:**
```
https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```

**VIGTIGT:** Brug IKKE `/openapi.json/openapi.json` (som vist i dit screenshot)

### **Configuration i OpenWebUI:**

1. **URL:**
   ```
   https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
   ```

2. **OpenAPI Spec:** `URL` (dropdown)
   - Vælg `openapi.json` (hvis dropdown)
   - ELLER bare lad feltet være tomt

3. **Auth:** `Bearer` (dropdown)

4. **API Key:**
   ```
   [Din SUPABASE_ANON_KEY fra .env]
   ```

   Find den i `.env` filen:
   ```bash
   grep VITE_SUPABASE_ANON_KEY /tmp/cc-agent/60831267/project/.env
   ```

5. **Klik "Save"**

---

## ✅ Verification Checklist

Efter deployment, verificer disse ting:

### **1. Edge Function Svarer**
```bash
curl -i https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```
**Forventet:** HTTP 200 OK + JSON response

### **2. CORS Headers Er Til Stede**
```bash
curl -X OPTIONS -i https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```
**Forventet output skal inkludere:**
```
access-control-allow-origin: *
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-allow-headers: Content-Type, Authorization, X-Client-Info, Apikey
```

### **3. Auth Fungerer**
```bash
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```
**Forventet:** HTTP 200 OK (ikke 401)

### **4. Tools Count Er Korrekt**
```bash
curl -s https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json | grep -o '"paths":{[^}]*}' | grep -o '/' | wc -l
```
**Forventet:** 13-16 tools

### **5. Check Logs**
Åbn Monitoring Dashboard i appen:
```bash
npm run dev
# Åbn browser → klik "Monitor" tab
```

**Se efter:**
- Connection logs med "Tools Discovered: 13-16"
- Auth type: Bearer
- Success: true

---

## 🚨 Common Issues Efter Deployment

### **Issue: Stadig 500 Error**

**Mulige årsager:**
1. Deployment er ikke færdig endnu (vent 1-2 minutter)
2. Syntax error i kode
3. Manglende import statements

**Fix:**
- Tjek Supabase Function Logs:
  ```
  https://supabase.com/dashboard/project/soavtttwnswalynemlxr/functions/naevneneshus-mcp/logs
  ```
- Se efter error messages
- Hvis syntax error: Fix og redeploy

### **Issue: 401 Unauthorized**

**Mulige årsager:**
1. Forkert API key i OpenWebUI
2. RLS policies blokerer

**Fix:**
```bash
# Hent korrekt anon key
grep VITE_SUPABASE_ANON_KEY /tmp/cc-agent/60831267/project/.env

# Test med korrekt key
curl -H "Authorization: Bearer CORRECT_KEY" \
     https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```

### **Issue: CORS Error i Browser**

**Mulige årsager:**
1. OPTIONS request ikke håndteret
2. CORS headers mangler

**Fix:**
- Verificer med curl test (se ovenfor)
- Hvis CORS virker i curl men ikke browser: Check browser console for andre fejl
- Edge function har allerede korrekt CORS implementation

### **Issue: Tools Vises Ikke i OpenWebUI**

**Mulige årsager:**
1. OpenWebUI kalder forkert URL
2. JSON format er invalid
3. OpenWebUI version er for gammel

**Fix:**
1. Check URL i OpenWebUI er PRÆCIS:
   ```
   https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
   ```
2. Test JSON er valid:
   ```bash
   curl -s https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json | python3 -m json.tool
   ```
3. Check OpenWebUI version ≥ 0.3.x

---

## 📊 After Successful Deployment

### **Monitoring**

**1. Real-time Monitoring Dashboard**
```bash
npm run dev
# Klik "Monitor" tab
```

**2. Supabase Logs**
```
https://supabase.com/dashboard/project/soavtttwnswalynemlxr/functions/naevneneshus-mcp/logs
```

**3. Database Logs**
```sql
-- Se connection logs
SELECT * FROM connection_logs
ORDER BY created_at DESC
LIMIT 10;

-- Se query logs
SELECT * FROM query_logs
ORDER BY created_at DESC
LIMIT 10;
```

### **Success Indicators**

✅ Edge function returnerer 200 OK
✅ CORS headers er til stede
✅ Tools discovered = 13-16
✅ Auth type = Bearer
✅ Connection logs vises i monitoring dashboard
✅ Tools vises i OpenWebUI interface

---

## 🆘 Need Help?

**Quick Debug Commands:**
```bash
# Test endpoint
curl -i https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json

# Test CORS
curl -X OPTIONS -i https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json

# Test Auth
curl -H "Authorization: Bearer $(grep VITE_SUPABASE_ANON_KEY .env | cut -d'=' -f2)" \
     https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json

# View logs
supabase functions logs naevneneshus-mcp
```

**Documentation:**
- OpenWebUI Integration: `OPENWEBUI_INTEGRATION.md`
- Monitoring Guide: `MONITORING.md`
- System Prompts: `SYSTEM_PROMPTS_INDEX.md`

---

## 📝 Summary

**Problem:** Connection failed + 500 error
**Root Cause:** Opdateret kode ikke deployed
**Solution:** Deploy via Supabase Dashboard eller CLI
**Correct URL:** `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
**Verification:** Monitoring dashboard + curl tests

After deployment, du vil se real-time logs i Monitoring Dashboard! 🎉
