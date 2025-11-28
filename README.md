# Naevneneshus MCP Server & Monitoring Dashboard

A comprehensive solution for searching and monitoring Danish appeals boards (naevneneshus.dk) portals with built-in query logging and real-time monitoring.

## Features

### MCP Server (Supabase Edge Function)
- **Multi-portal support** - Works with any `*.naevneneshus.dk` portal
- **Automatic query logging** - All searches logged to Supabase database
- **Error tracking** - Captures and logs failed queries
- **Performance monitoring** - Tracks execution time for all requests
- **RESTful API** - Clean endpoints for search, feed, and publication retrieval

### Web Dashboard
- **Real-time monitoring** - Live updates via Supabase subscriptions
- **14-day query history** - View all queries from the last two weeks
- **Automatic alerts** - Highlights queries with 0 results or >50 results
- **Statistics overview** - Total queries, empty results, large results, errors
- **Interactive search** - Test the MCP server directly from the web interface

### OpenWebUI Integration
- **Simplified tool** - Easy integration with OpenWebUI
- **All complexity handled by MCP server** - Query building, logging, error handling
- **Clean responses** - Formatted results ready for AI consumption

## Architecture

```
┌─────────────┐
│  OpenWebUI  │
│   Function  │
└──────┬──────┘
       │
       │ HTTP POST
       ▼
┌──────────────────┐
│   MCP Server     │
│  (Edge Function) │
└──────┬───────────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────────┐  ┌──────────────┐
│  Portal APIs │  │   Supabase   │
│ (*.naevnene- │  │   Database   │
│  shus.dk)    │  │ (query_logs) │
└──────────────┘  └──────────────┘
       │                  │
       │                  │
       └─────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Web Dashboard  │
        │   (React App)   │
        └─────────────────┘
```

## Setup Instructions

### 1. Database Setup

The database schema is already created with the migration. It includes:
- `query_logs` table for storing all search queries
- Indexes for efficient querying
- Row Level Security (RLS) policies

### 2. MCP Server Deployment

The MCP server is deployed as a Supabase Edge Function at:
```
https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp
```

Endpoints:
- `POST /search` - Search for publications
- `POST /feed` - Get latest publications
- `POST /publication` - Get specific publication by ID
- `GET /health` - Health check

### 3. Web Dashboard Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment variables are already configured in `.env`

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### 4. OpenWebUI Integration

See [OPENWEBUI_INTEGRATION.md](./OPENWEBUI_INTEGRATION.md) for detailed instructions.

Quick setup:
1. Get your Supabase URL and Anon Key from `.env`
2. Copy the Python tool code from the integration guide
3. Update the credentials in the tool
4. Add the tool to OpenWebUI

## Supported Portals

- **mfkn.naevneneshus.dk** - Miljø- og Fødevareklagenævnet
- **aen.naevneneshus.dk** - Ankestyrelsen
- **ekn.naevneneshus.dk** - Energiklagenævnet
- **pn.naevneneshus.dk** - Planklagenævnet
- Any other `*.naevneneshus.dk` portal

## API Examples

### Search Request

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp/search \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "portal": "mfkn.naevneneshus.dk",
    "query": "jordforurening",
    "page": 1,
    "pageSize": 10,
    "filters": {
      "category": "ruling",
      "dateRange": {
        "start": "2024-01-01",
        "end": "2025-01-27"
      }
    }
  }'
```

### Feed Request

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp/feed \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "portal": "mfkn.naevneneshus.dk"
  }'
```

## Monitoring Dashboard

The web dashboard provides:

### Statistics Cards
- **Total Queries** - All queries in the last 14 days
- **Empty Results** - Queries returning 0 results (highlighted for review)
- **Large Results** - Queries returning >50 results (highlighted for review)
- **Errors** - Failed queries

### Query History Table
Shows all queries with:
- Timestamp
- Portal
- Query string
- Result count (color-coded)
- Execution time
- Status (success/error)

### Real-time Updates
The dashboard automatically updates when new queries are logged via Supabase real-time subscriptions.

## Alerts System

The system automatically highlights queries that need attention:

1. **Empty Results (Yellow)** - Queries that returned 0 results
   - May indicate search terms need refinement
   - Could signal data availability issues

2. **Large Results (Orange)** - Queries returning >50 results
   - May be too broad
   - Could impact performance

3. **Errors (Red)** - Failed queries
   - Network issues
   - Invalid parameters
   - Portal unavailability

## Benefits

### For OpenWebUI Users
- **Simplified integration** - No complex query building in Python
- **Automatic logging** - All queries tracked automatically
- **Better error handling** - Consistent error messages
- **Multi-portal support** - Single tool for all portals

### For Administrators
- **Complete visibility** - See all queries and their results
- **Performance monitoring** - Track execution times
- **Problem detection** - Automatic alerts for issues
- **Usage analytics** - Understand query patterns

### For Developers
- **Clean API** - Well-documented RESTful endpoints
- **Type safety** - TypeScript throughout
- **Scalable** - Built on Supabase infrastructure
- **Extensible** - Easy to add new features

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL
- **Real-time**: Supabase Realtime subscriptions
- **Build**: Vite
- **Deployment**: Supabase hosting

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type check
npm run typecheck
```

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## License

MIT

## Support

For issues or questions:
1. Check the [integration guide](./OPENWEBUI_INTEGRATION.md)
2. Review the monitoring dashboard for query issues
3. Check Supabase logs for Edge Function errors
