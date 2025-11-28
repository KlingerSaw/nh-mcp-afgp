# Quick Start Guide

Get up and running with the Naevneneshus MCP server in 5 minutes.

## What You've Got

1. **MCP Server** (Edge Function) - Deployed and ready at:
   ```
   https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp
   ```

2. **Database** - Query logging table created and configured

3. **Web Dashboard** - React app for monitoring queries

4. **OpenWebUI Tool** - Ready-to-use Python code

## Step 1: Get Your Credentials

Your Supabase credentials are in the `.env` file:

```bash
cat .env
```

You'll see:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Step 2: Test the MCP Server

```bash
# Test health endpoint
curl "https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp/health" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return: {"status":"healthy","timestamp":"..."}
```

## Step 3: Test a Search

```bash
curl -X POST "https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp/search" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "portal": "mfkn.naevneneshus.dk",
    "query": "støj",
    "page": 1,
    "pageSize": 5
  }'
```

## Step 4: Set Up OpenWebUI Tool

1. Open `openwebui_tool.py` in this project

2. Replace these lines with your credentials:
   ```python
   self.mcp_url = "https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp"
   self.headers = {
       "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
       "Content-Type": "application/json"
   }
   ```

3. Copy the entire file content

4. In OpenWebUI:
   - Go to Settings → Functions
   - Click "Create New Function"
   - Paste the code
   - Save

5. Test it:
   ```
   You: "Search for jordforurening cases on MFKN"
   AI: [Uses the tool and returns formatted results]
   ```

## Step 5: Run the Monitoring Dashboard

```bash
# Install dependencies (if not done)
npm install

# Start the dev server
npm run dev

# Open browser to http://localhost:5173
```

You'll see:
- **Search tab** - Test searches directly
- **Monitor tab** - View query history and alerts

## What Happens When You Search

1. **OpenWebUI tool** receives your query
2. **Tool formats** and sends request to MCP server
3. **MCP server**:
   - Forwards search to the portal API
   - Logs the query to database
   - Returns results
4. **Tool** formats results for display
5. **Dashboard** shows the query in real-time

## Common Portals

| Portal | Description |
|--------|-------------|
| `mfkn.naevneneshus.dk` | Environment & Food Appeals Board |
| `aen.naevneneshus.dk` | Social Appeals Board |
| `ekn.naevneneshus.dk` | Energy Appeals Board |
| `pn.naevneneshus.dk` | Planning Appeals Board |

## Example Searches

```python
# Environment case
tool.run(query="jordforurening", portal="mfkn.naevneneshus.dk")

# With date filter
tool.run(
    query="støj",
    portal="mfkn.naevneneshus.dk",
    date_from="2024-01-01"
)

# Energy case
tool.run(query="vindmøller", portal="ekn.naevneneshus.dk")

# Planning case
tool.run(query="lokalplan", portal="pn.naevneneshus.dk")
```

## Monitoring Alerts

The dashboard automatically highlights:

| Alert Type | Meaning | Color |
|------------|---------|-------|
| Empty Results | 0 results found | Yellow |
| Large Results | >50 results | Orange |
| Errors | Query failed | Red |

## Troubleshooting

### "Connection error"
- Check your Supabase URL is correct
- Verify the Edge Function is deployed

### "Authorization error"
- Check your Anon Key is correct
- Make sure you copied the full key

### "No results in dashboard"
- Make a test search first
- Check browser console for errors
- Verify database connection

### OpenWebUI tool not working
1. Verify credentials are updated in the tool
2. Test the MCP endpoint with curl first
3. Check OpenWebUI function logs

## Next Steps

1. **Customize the tool** - Add your own query logic or formatting
2. **Set up alerts** - Configure notifications for specific query patterns
3. **Analyze patterns** - Use the dashboard to understand usage
4. **Add more portals** - The system supports any `*.naevneneshus.dk` portal

## Get Help

- Check `README.md` for full documentation
- See `OPENWEBUI_INTEGRATION.md` for detailed integration guide
- Review `openwebui_tool.py` for code examples

## Success Checklist

- [ ] MCP server health check returns "healthy"
- [ ] Test search returns results
- [ ] Query appears in database
- [ ] Dashboard shows the query
- [ ] OpenWebUI tool is configured
- [ ] Test search from OpenWebUI works

If all boxes are checked, you're ready to go! 🚀
