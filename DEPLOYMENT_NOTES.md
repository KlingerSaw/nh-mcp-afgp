# Deployment Notes

## Edge Function Deployment Required

The MCP server edge function (`naevneneshus-mcp`) has been updated with important fixes for acronym detection and category matching. The code changes are complete, but the function needs to be redeployed to Supabase.

### Changes Made

1. **Fallback Logic for Acronym Detection** (index.ts:321-325)
   - If `detectedAcronym` parameter is not provided, the server now uses the first acronym from the `detected_acronyms` array
   - This fixes the issue where OpenWebUI sends acronyms in the array but not as a direct parameter

2. **Enhanced Debug Logging** (index.ts:365-373)
   - Added detailed logging when category matching fails
   - Logs all available categories and their aliases to help diagnose issues
   - Console logs show which acronym is being matched and the result

3. **Python Tool Updated** (openwebui_tool.py:49, 99-101)
   - Added `detected_acronym` parameter to function signature
   - Tool now passes detectedAcronym to MCP server if provided by AI

4. **NBL Alias Verified**
   - Confirmed NBL is included in both `generateAliases()` function and `categoryParser.ts`
   - NBL → Naturbeskyttelsesloven mapping is correct

### Deployment Instructions

Since automatic deployment via Supabase CLI is not available in this environment, the edge function must be deployed manually.

**Option 1: Deploy via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/functions
2. Select the `naevneneshus-mcp` function
3. Click "Deploy new version"
4. Upload both files:
   - `supabase/functions/naevneneshus-mcp/index.ts`
   - `supabase/functions/naevneneshus-mcp/categoryParser.ts`

**Option 2: Deploy via Supabase CLI (if available)**
```bash
supabase functions deploy naevneneshus-mcp
```

### Testing After Deployment

Test the NBL acronym detection with this curl command:

```bash
curl -X POST "https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "NBL § 26 a nedlæggelse af sti",
    "portal": "mfkn.naevneneshus.dk",
    "detected_acronyms": [{"acronym": "NBL", "context": "NBL § 26 a nedlæggelse af sti"}]
  }'
```

**Expected result after deployment:**
- The response should include a `category` field in the filters
- The category should be matched to "Naturbeskyttelsesloven"
- Console logs (viewable in Supabase dashboard) should show:
  ```
  Using acronym from detected_acronyms array: NBL
  Attempting to match acronym: NBL
  Successfully matched "NBL" to category: Naturbeskyttelsesloven
  ```

### Monitoring Dashboard

After deployment, check the monitoring dashboard at your application URL:
1. Navigate to the "Monitoring" tab
2. Search for queries containing "NBL"
3. You should now see a green badge showing: **📂 Kategori: Naturbeskyttelsesloven (AI detekteret)**

### Files Modified

- `supabase/functions/naevneneshus-mcp/index.ts` - Added fallback logic and debug logging
- `supabase/functions/naevneneshus-mcp/categoryParser.ts` - Already had NBL mapping
- `openwebui_tool.py` - Added detected_acronym parameter
- `src/components/MonitoringDashboard.tsx` - Already displays category badges
- `src/components/PromptLibrary.tsx` - Updated system prompt instructions

All frontend changes are already deployed and build successfully.
