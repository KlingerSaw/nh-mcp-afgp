# Complete Setup Instructions

Follow these steps to get the Naevneneshus MCP server running with OpenWebUI.

## Prerequisites

- Supabase account (free tier works)
- OpenWebUI instance
- Node.js installed (for running the dashboard locally)

## Step 1: Get Your Credentials (2 minutes)

1. Check your `.env` file:
   ```bash
   cat .env
   ```

2. You should see:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Copy both values - you'll need them next

## Step 2: Verify MCP Server is Deployed (2 minutes)

The MCP server is already deployed as an Edge Function. Let's verify it works:

```bash
# Replace with your actual URL and key
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_KEY="eyJhbGc..."

# Test health endpoint
curl "${SUPABASE_URL}/functions/v1/naevneneshus-mcp/health" \
  -H "Authorization: Bearer ${SUPABASE_KEY}"
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T..."
}
```

## Step 3: Test a Search (2 minutes)

```bash
# Test search endpoint
curl -X POST "${SUPABASE_URL}/functions/v1/naevneneshus-mcp/search" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "portal": "mfkn.naevneneshus.dk",
    "query": "støj",
    "page": 1,
    "pageSize": 3
  }'
```

Expected response:
```json
{
  "totalCount": 156,
  "publications": [...],
  "categoryCounts": [...],
  "meta": {
    "executionTime": 245,
    "portal": "mfkn.naevneneshus.dk"
  }
}
```

## Step 4: Check Database Logging (2 minutes)

Verify the query was logged:

1. Go to your Supabase dashboard
2. Click "Table Editor" in the sidebar
3. Select "query_logs" table
4. You should see your test query logged with:
   - portal: mfkn.naevneneshus.dk
   - query: støj
   - result_count: 156
   - execution_time_ms: ~245
   - created_at: (just now)

## Step 5: Set Up OpenWebUI External Tool (3 minutes)

**Recommended: OpenAPI Integration**

1. In OpenWebUI:
   - Go to **Settings** → **External Tools** (or **Admin Settings** → **Tools** → **External Tools**)
   - Click **"Add External Tool"** or **"Import from URL"**

2. Configure:
   - **OpenAPI Spec URL**: `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
   - **Auth Type**: Bearer Token
   - **Token**: Your anon key from `.env` (the value of `VITE_SUPABASE_ANON_KEY`)

3. Click **"Save"** or **"Import"**

4. OpenWebUI will automatically discover **16+ tools** - one for each portal:
   - `search_mfkn_naevneneshus_dk`
   - `search_ekn_naevneneshus_dk`
   - `search_pkn_naevneneshus_dk`
   - `search_fkn_naevneneshus_dk`
   - ... and 12 more

5. Verify tools are loaded:
   - Start a new chat
   - Look for the tool icon (should show available tools)
   - Or go to Settings → External Tools to see the list

**Alternative: Custom Python Tool (Advanced)**

If you prefer a custom Python function instead of OpenAPI:

1. Open `openwebui_tool.py` and update credentials
2. Copy the entire file
3. Go to OpenWebUI Settings → Functions → New Function
4. Paste and save

Note: The OpenAPI method is recommended as it provides 16+ specialized tools automatically.

## Step 6: Test in OpenWebUI (2 minutes)

1. Start a new chat in OpenWebUI

2. **Important**: Select a model that supports function calling (GPT-4, Claude 3.5+, or GPT-3.5-turbo)

3. Try these queries:

   ```
   Find cases about noise pollution on MFKN
   ```

   ```
   Search for jordforurening on Miljø- og Fødevareklagenævnet
   ```

   ```
   What are recent wind turbine rulings on EKN?
   ```

4. The AI should:
   - Automatically select the correct portal tool (e.g., `search_mfkn_naevneneshus_dk`)
   - Call the tool with appropriate parameters
   - Display formatted results with emojis
   - Show titles, dates, categories, and clickable links
   - Offer to show more results if available

5. Expected output format:
   ```
   📋 Found 42 results for "jordforurening"
   🌐 Portal: mfkn.naevneneshus.dk

   📄 Showing 5 results:

   1. Afgørelse om jordforurening...
      📑 Jordforureningsloven
      📅 Dato: 2024-03-15
      🔗 https://mfkn.naevneneshus.dk/afgoerelse/...
   ```

## Step 7: Run the Monitoring Dashboard (5 minutes)

1. Install dependencies (if not done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open browser to: `http://localhost:5173`

4. You should see:
   - **Search tab**: Interactive search interface
   - **Monitor tab**: Query history and statistics

5. Try a search from the Search tab

6. Switch to Monitor tab - you should see:
   - Your query logged
   - Statistics updated
   - Real-time update (no refresh needed)

## Step 8: Verify Real-time Updates (2 minutes)

1. Keep the dashboard open in your browser

2. In another window, use OpenWebUI to make a search

3. Watch the dashboard - it should update automatically:
   - New row appears in the table
   - Statistics increment
   - No manual refresh needed

4. This confirms the real-time subscription is working

## Troubleshooting

### Health Check Fails

**Problem**: `curl` to `/health` returns error

**Solutions**:
1. Verify your Supabase URL is correct (should end in `.supabase.co`)
2. Check you're using the anon key (not service role key)
3. Ensure Edge Function is deployed (check Supabase dashboard → Edge Functions)

### Search Returns No Results

**Problem**: Search works but returns 0 results

**Solutions**:
1. Try a simpler query (e.g., just "støj")
2. Remove date filters
3. Check the portal is accessible: visit `https://mfkn.naevneneshus.dk` in browser
4. Look in dashboard for error messages

### OpenWebUI External Tool Not Working

**Problem**: Tools don't appear or don't run

**Solutions**:
1. Verify the OpenAPI URL ends with `/openapi.json`
2. Check the Bearer token is correct (copy from `.env` file)
3. Test the OpenAPI endpoint:
   ```bash
   curl https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
   ```
4. Delete and re-import the External Tool
5. Check browser console for import errors
6. Ensure you're using a model that supports function calling (GPT-4, Claude 3.5+)

**Problem**: Tool runs but returns errors

**Solutions**:
1. Test the endpoint with `curl` first (Step 3)
2. Check OpenWebUI logs for detailed error messages
3. Verify the Bearer token has not expired

### Dashboard Shows No Data

**Problem**: Dashboard loads but shows "No queries"

**Solutions**:
1. Make a test search first (Step 3)
2. Check browser console for errors
3. Verify `.env` file has correct credentials
4. Try refreshing the page

### Real-time Updates Not Working

**Problem**: Dashboard doesn't update automatically

**Solutions**:
1. Check browser console for WebSocket errors
2. Verify your Supabase project has Realtime enabled
3. Try a hard refresh (Ctrl+Shift+R)
4. Check network tab for blocked WebSocket connections

## Verification Checklist

After setup, verify:

- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] OpenAPI spec is accessible at `/openapi.json`
- [ ] Test search returns results
- [ ] Query appears in `query_logs` table
- [ ] OpenWebUI External Tool is imported
- [ ] **16+ tools are discovered** (search_mfkn_naevneneshus_dk, search_ekn_naevneneshus_dk, etc.)
- [ ] Tools appear in chat interface
- [ ] AI successfully calls tools when asked
- [ ] Results are formatted with emojis and links
- [ ] Dashboard shows query history
- [ ] Dashboard updates in real-time
- [ ] Statistics are calculated correctly
- [ ] Links to publications work

## Common Issues

### "Authorization header required"
- You forgot to include the Bearer token
- Check headers in tool code

### "Function not found"
- Edge Function not deployed
- Check Supabase dashboard → Edge Functions

### "CORS error"
- Browser security issue
- Edge Function already handles CORS
- Try from command line first

### "Database connection failed"
- Check Supabase project is active
- Verify RLS policies are set up
- Run migration again if needed

## Next Steps

Once everything is working:

1. **Customize the tool**: Add your preferred formatting
2. **Set up alerts**: Configure notifications for specific patterns
3. **Explore portals**: Try aen, ekn, pn portals
4. **Review patterns**: Use dashboard to understand usage
5. **Share with team**: Add more users to OpenWebUI

## Production Deployment

### Dashboard Deployment

To deploy the dashboard to production:

```bash
# Build for production
npm run build

# Deploy to Vercel
npm install -g vercel
vercel deploy

# Or deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod

# Or use Supabase Storage
# Upload dist/ folder to Storage bucket
```

### Environment Variables for Production

Create a `.env.production` file:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### SSL/HTTPS

All endpoints automatically use HTTPS through Supabase.

## Support Resources

- **README.md** - Complete documentation
- **QUICK_START.md** - 5-minute guide
- **OPENWEBUI_INTEGRATION.md** - Detailed integration
- **ARCHITECTURE.md** - System design
- **PROJECT_SUMMARY.md** - Overview

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review the error message carefully
3. Test with `curl` to isolate the problem
4. Check Supabase logs (Dashboard → Logs)
5. Review browser console for client errors

## Success!

If all verification steps pass, you're ready to use the system. The MCP server will:
- Handle all searches
- Log everything automatically
- Provide real-time monitoring
- Work with any naevneneshus.dk portal

Enjoy your new search system! 🎉
