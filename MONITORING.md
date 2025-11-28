# Monitoring Guide - OpenWebUI Tool Discovery

Dette dokument forklarer hvordan du overvåger OpenAPI spec kald og ser om OpenWebUI opdager tools korrekt.

## 📊 Monitoring Features

Edge function logfører nu automatisk:
- **Console logs**: Alle OpenAPI spec requests
- **Database logs**: Full header analysis og tool count
- **User agent tracking**: Se hvilke klienter der kalder APIet
- **Auth type tracking**: Verificer auth er konfigureret korrekt

## 🔍 Tjek Supabase Console Logs

### Via Supabase Dashboard:

1. Gå til **Supabase Dashboard** → Din project
2. Klik på **Edge Functions** i sidebar
3. Vælg **naevneneshus-mcp** funktionen
4. Klik på **Logs** tab
5. Se real-time logs

### Hvad at kigge efter:

```
📖 OpenAPI spec requested
🌐 User-Agent: Mozilla/5.0...
🔍 OpenAPI Spec Request:
  - User-Agent: OpenWebUI/1.0
  - Auth Type: Bearer
  - Headers: {...}
✅ Generated OpenAPI spec with 13 portal-specific tools
📊 Total paths: 16
```

## 📋 Tjek Database Logs

### SQL Query til at se alle OpenAPI requests:

```sql
SELECT
  created_at,
  user_agent,
  auth_type,
  tools_discovered,
  request_headers->>'host' as host,
  request_headers->>'accept' as accept
FROM connection_logs
WHERE endpoint = '/openapi.json'
ORDER BY created_at DESC
LIMIT 10;
```

### Via Supabase SQL Editor:

1. Gå til **SQL Editor** i Supabase Dashboard
2. Kør queryen ovenfor
3. Se alle OpenAPI spec requests

## 🎯 Troubleshooting Checklist

### ❌ Ingen logs dukker op:

**Problem**: OpenWebUI kalder aldrig `/openapi.json` endpoint

**Løsning**:
1. Verificer URL er korrekt: `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
2. Test med curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_ANON_KEY" \
        https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
   ```
3. Tjek at OpenWebUI External Tools import lykkedes

### ✅ Logs viser request MEN tools_discovered = 0:

**Problem**: OpenAPI spec genereres men ingen portal tools findes

**Løsning**:
1. Tjek at `portal_metadata` table har data:
   ```sql
   SELECT COUNT(*) FROM portal_metadata;
   ```
2. Hvis 0, kør data collection:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://soavtttwnswalynemlxr.supabase.co/functions/v1/collect-portal-data
   ```

### ✅ Logs viser korrekt tools_discovered (13-16) MEN OpenWebUI ser dem ikke:

**Problem**: OpenWebUI parser ikke OpenAPI spec korrekt

**Løsning**:
1. Download OpenAPI spec manually og valider:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" \
        https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json > spec.json
   ```
2. Tjek JSON er valid:
   ```bash
   cat spec.json | python3 -m json.tool
   ```
3. Verificer `operationId` fields er unikke
4. Tjek OpenWebUI version understøtter OpenAPI 3.0

### ✅ User-Agent viser ikke "OpenWebUI":

**Problem**: OpenWebUI bruger måske en anden user agent

**Check logs for actual user agent**:
```sql
SELECT DISTINCT user_agent
FROM connection_logs
WHERE endpoint = '/openapi.json';
```

## 🔬 Advanced: Real-time Monitoring

### 1. Watch Logs Live

```bash
# Install supabase CLI først
npx supabase login
npx supabase link --project-ref soavtttwnswalynemlxr

# Stream logs
npx supabase functions logs naevneneshus-mcp --tail
```

### 2. Database Subscription (via Supabase Realtime)

Tilføj til din frontend:

```typescript
const { data, error } = await supabase
  .from('connection_logs')
  .select('*')
  .eq('endpoint', '/openapi.json')
  .order('created_at', { ascending: false })
  .limit(10);

// Subscribe to new logs
supabase
  .channel('connection_logs')
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'connection_logs',
      filter: 'endpoint=eq./openapi.json'
    },
    (payload) => {
      console.log('New OpenAPI request:', payload.new);
    }
  )
  .subscribe();
```

## 📈 Success Metrics

✅ **Successful Setup:**
- `connection_logs` har entries
- `tools_discovered` er 13-16
- `auth_type` er `'Bearer'`
- Console logs viser "Generated OpenAPI spec"

✅ **OpenWebUI Integration Working:**
- User agent indeholder "OpenWebUI" eller lignende
- Multiple requests fra samme IP
- Tools vises i OpenWebUI interface

## 🚨 Common Issues

### Issue: CORS Error in Browser Console ⚠️

**Problem**: OpenWebUI får CORS fejl når den forsøger at hente OpenAPI spec

**Symptomer**:
```
Access to fetch at 'https://...openapi.json' from origin 'http://localhost:3000'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Verificer CORS virker**:
```bash
# Test OPTIONS preflight request
curl -X OPTIONS -i \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json

# Forventet output skal inkludere:
# access-control-allow-origin: *
# access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
# access-control-allow-headers: Content-Type, Authorization, X-Client-Info, Apikey
```

**Status**: ✅ CORS er korrekt konfigureret og verificeret
- `Access-Control-Allow-Origin: *` (tillader alle origins)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey`

Hvis du stadig får CORS fejl, tjek OpenWebUI kører på korrekt URL/port.

### Issue: Auth Type = "none"
**Problem**: Bearer token ikke sendt
**Fix**: Tjek OpenWebUI External Tools config har Bearer token korrekt indtastet

### Issue: 401 Unauthorized
**Problem**: Forkert anon key eller RLS policy blokerer
**Fix**: Verificer anon key er korrekt, tjek RLS policies på connection_logs

### Issue: Tools discovered = 0
**Problem**: Ingen portaler i database
**Fix**: Kør `collect-portal-data` edge function eller sync categories

## 📞 Next Steps

Hvis alle logs ser korrekte ud men tools stadig ikke vises i OpenWebUI:

1. **Check OpenWebUI version**: Minimum krav er OpenWebUI v0.3.x+
2. **Browser console**: Åbn developer tools i OpenWebUI og se efter JavaScript errors
3. **Test med anden client**: Brug Postman eller curl til at verificere OpenAPI spec er valid
4. **OpenWebUI GitHub Issues**: Søg efter lignende problemer med External Tools

---

## Quick Test Script

```bash
#!/bin/bash

ANON_KEY="YOUR_ANON_KEY_HERE"
BASE_URL="https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp"

echo "🧪 Testing OpenAPI Endpoint..."
echo ""

# Test OpenAPI spec
echo "1. Fetching OpenAPI spec..."
curl -s -H "Authorization: Bearer $ANON_KEY" \
     "${BASE_URL}/openapi.json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"✅ Version: {data['info']['version']}\")
print(f\"✅ Server URL: {data['servers'][0]['url']}\")
portal_tools = [p for p in data['paths'].keys() if p.startswith('/mcp/')]
print(f\"✅ Portal tools: {len(portal_tools)}\")
print(f\"✅ Total paths: {len(data['paths'])}\")
"

echo ""
echo "2. Checking connection logs..."
echo "   (Check Supabase Dashboard → SQL Editor)"
echo ""
echo "SELECT * FROM connection_logs WHERE endpoint = '/openapi.json' ORDER BY created_at DESC LIMIT 1;"
```

Gem dette som `test-monitoring.sh` og kør:
```bash
chmod +x test-monitoring.sh
./test-monitoring.sh
```
