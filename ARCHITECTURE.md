# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │   OpenWebUI      │              │  Web Dashboard   │         │
│  │   Chat Interface │              │  (React App)     │         │
│  └────────┬─────────┘              └────────┬─────────┘         │
│           │                                 │                    │
│           │ HTTP POST                       │ HTTP GET/POST      │
│           │ /search                         │ Real-time WS       │
└───────────┼─────────────────────────────────┼────────────────────┘
            │                                 │
            │                                 │
┌───────────▼─────────────────────────────────▼────────────────────┐
│                    SUPABASE PLATFORM                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              MCP Server (Edge Function)                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ /search  │  │  /feed   │  │/publica- │  │ /health  │  │  │
│  │  │ endpoint │  │ endpoint │  │tion      │  │ endpoint │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘  │  │
│  │       │             │             │                        │  │
│  │       └─────────────┴─────────────┘                        │  │
│  │                     │                                       │  │
│  │              Query Processing                               │  │
│  │              Error Handling                                 │  │
│  │              Logging Logic                                  │  │
│  └─────────────────────┬───────────────────────┬───────────────┘  │
│                        │                       │                  │
│                        │                       │                  │
│  ┌─────────────────────▼─────────┐  ┌─────────▼────────────────┐ │
│  │   PostgreSQL Database         │  │  Real-time Subscriptions │ │
│  │                               │  │                          │ │
│  │  ┌─────────────────────────┐  │  │  • Live query updates   │ │
│  │  │     query_logs          │  │  │  • WebSocket connections│ │
│  │  │  - id                   │  │  │  • Auto-refresh         │ │
│  │  │  - portal               │  │  └──────────────────────────┘ │
│  │  │  - query                │  │                               │
│  │  │  - result_count         │  │                               │
│  │  │  - execution_time_ms    │  │                               │
│  │  │  - error_message        │  │                               │
│  │  │  - created_at           │  │                               │
│  │  └─────────────────────────┘  │                               │
│  └───────────────────────────────┘                               │
│                        │                                          │
└────────────────────────┼──────────────────────────────────────────┘
                         │
                         │ HTTP GET/POST
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│              EXTERNAL APIS (naevneneshus.dk)                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  mfkn.naevnene-  │  │  aen.naevnene-   │  │  ekn.naevnene- │ │
│  │  shus.dk         │  │  shus.dk         │  │  shus.dk       │ │
│  │  /api/Search     │  │  /api/Search     │  │  /api/Search   │ │
│  │  /api/Feed       │  │  /api/Feed       │  │  /api/Feed     │ │
│  │  /api/Publication│  │  /api/Publication│  │  /api/Publica- │ │
│  └──────────────────┘  └──────────────────┘  │  tion          │ │
│                                               └────────────────┘ │
│  ┌──────────────────┐                                            │
│  │  pn.naevnene-    │  + Any other *.naevneneshus.dk portal     │
│  │  shus.dk         │                                            │
│  │  /api/Search     │                                            │
│  │  /api/Feed       │                                            │
│  │  /api/Publication│                                            │
│  └──────────────────┘                                            │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Search Request Flow

```
1. User enters query in OpenWebUI
   ↓
2. OpenWebUI tool formats request
   {
     "portal": "mfkn.naevneneshus.dk",
     "query": "jordforurening",
     "page": 1,
     "pageSize": 10
   }
   ↓
3. HTTP POST to MCP server
   /functions/v1/naevneneshus-mcp/search
   ↓
4. MCP server receives request
   ├─→ Validates parameters
   ├─→ Records start time
   └─→ Prepares portal API call
   ↓
5. MCP server calls portal API
   POST https://mfkn.naevneneshus.dk/api/Search
   ↓
6. Portal API searches database
   ↓
7. Portal returns results
   {
     "totalCount": 42,
     "publications": [...],
     "categoryCounts": [...]
   }
   ↓
8. MCP server processes response
   ├─→ Calculates execution time
   ├─→ Logs to database:
   │   INSERT INTO query_logs (
   │     portal, query, result_count,
   │     execution_time_ms, created_at
   │   )
   └─→ Adds metadata
   ↓
9. MCP server returns to tool
   {
     ...results,
     "meta": {
       "executionTime": 245,
       "portal": "mfkn.naevneneshus.dk"
     }
   }
   ↓
10. Tool formats for display
    📋 Found 42 results...
    ────────────────────
    1. Title...
    2. Title...
    ↓
11. Displayed to user in OpenWebUI
    ↓
12. Dashboard receives real-time update
    via Supabase subscription
    ↓
13. Dashboard updates automatically
    (new row in query history table)
```

### Dashboard Real-time Update Flow

```
1. Dashboard loads
   ↓
2. Subscribes to query_logs table
   supabase.channel('query_logs_changes')
   ↓
3. Query logged (from search above)
   INSERT INTO query_logs (...)
   ↓
4. PostgreSQL triggers notification
   ↓
5. Supabase Realtime broadcasts
   via WebSocket
   ↓
6. Dashboard receives event
   { event: 'INSERT', new: {...} }
   ↓
7. Dashboard re-fetches data
   SELECT * FROM query_logs
   WHERE created_at >= NOW() - INTERVAL '14 days'
   ↓
8. UI updates instantly
   (new row appears, stats recalculate)
```

## Component Responsibilities

### OpenWebUI Tool
```python
class Tools:
    """
    RESPONSIBILITIES:
    - Receive user query from OpenWebUI
    - Format request for MCP server
    - Call MCP server HTTP endpoint
    - Format response for display
    - Handle errors gracefully

    DOES NOT:
    - Build complex queries
    - Log anything
    - Connect to database
    - Know about other portals
    """
```

### MCP Server (Edge Function)
```typescript
/**
 * RESPONSIBILITIES:
 * - Route incoming requests
 * - Validate parameters
 * - Call portal APIs
 * - Log all queries to database
 * - Handle errors
 * - Add metadata to responses
 * - Provide health checks
 *
 * DOES NOT:
 * - Format responses for end users
 * - Store API keys (uses env vars)
 * - Cache results (stateless)
 */
```

### Database
```sql
/*
 * RESPONSIBILITIES:
 * - Store all query logs
 * - Provide fast queries via indexes
 * - Enforce security via RLS
 * - Trigger real-time updates
 * - Retain 14+ days of history
 *
 * DOES NOT:
 * - Execute searches
 * - Format results
 * - Connect to external APIs
 */
```

### Dashboard
```typescript
/**
 * RESPONSIBILITIES:
 * - Display query history
 * - Show statistics
 * - Highlight alerts
 * - Provide search interface
 * - Subscribe to real-time updates
 *
 * DOES NOT:
 * - Log queries (server does this)
 * - Call portal APIs directly
 * - Store any state server-side
 */
```

## Security Layers

```
┌──────────────────────────────────────────┐
│  1. CLIENT LAYER                         │
│  - HTTPS only                            │
│  - API key in Authorization header       │
│  - No secrets in code                    │
└───────────────┬──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│  2. EDGE FUNCTION LAYER                  │
│  - CORS configured                       │
│  - Request validation                    │
│  - Rate limiting (Supabase)              │
│  - Timeout protection                    │
└───────────────┬──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│  3. DATABASE LAYER                       │
│  - Row Level Security (RLS)              │
│  - Authenticated/Anonymous policies      │
│  - No direct public access               │
│  - Encrypted at rest                     │
└───────────────┬──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│  4. EXTERNAL API LAYER                   │
│  - Public APIs (no auth needed)          │
│  - Read-only access                      │
│  - No user data sent                     │
└──────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Developer                                                  │
│     │                                                       │
│     ├─→ npm run dev         (React app: localhost:5173)    │
│     │                                                       │
│     └─→ Supabase CLI        (Edge Functions & DB)          │
│         - Local development                                 │
│         - Local database                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Supabase Hosted Platform                                   │
│     │                                                       │
│     ├─→ Edge Function      (Global CDN)                    │
│     │   - Auto-scaling                                      │
│     │   - Cold start optimization                           │
│     │   - Multi-region                                      │
│     │                                                       │
│     ├─→ PostgreSQL         (Managed database)              │
│     │   - Automatic backups                                 │
│     │   - Replication                                       │
│     │   - Connection pooling                                │
│     │                                                       │
│     └─→ Realtime           (WebSocket server)              │
│         - Global presence                                   │
│         - Auto-reconnect                                    │
│                                                             │
│  React App                                                  │
│     └─→ Vite Build         (Static hosting)                │
│         - Vercel / Netlify / Supabase Storage              │
│         - CDN distribution                                  │
│         - HTTPS enforced                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Error occurs at any layer
   ↓
┌──────────────────────────────┐
│  Portal API Error            │
│  - Network timeout           │
│  - 404 Not Found             │
│  - 500 Server Error          │
└──────────┬───────────────────┘
           │
           ├─→ MCP Server catches
           │   ├─→ Logs error to DB
           │   │   - error_message field
           │   │   - result_count = 0
           │   │   - execution_time
           │   │
           │   └─→ Returns error response
           │       { "error": "..." }
           │
           ↓
┌──────────────────────────────┐
│  Tool receives error         │
│  - Formats friendly message  │
│  - Shows to user             │
│  - "❌ Search failed: ..."   │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  Dashboard shows alert       │
│  - Red background            │
│  - Error icon                │
│  - Alert in stats            │
└──────────────────────────────┘
```

## Scaling Considerations

### Current Capacity
- **Edge Function**: ~10,000 requests/day (free tier)
- **Database**: 500MB storage (free tier)
- **Realtime**: 200 concurrent connections
- **Query logs**: ~14 days retention

### Growth Path
```
Stage 1: Free Tier
├─→ 0-1000 queries/day
├─→ Single developer
└─→ Current setup works

Stage 2: Pro Tier ($25/month)
├─→ 1000-10,000 queries/day
├─→ Multiple users
├─→ Add caching
└─→ Optimize queries

Stage 3: Team Tier ($599/month)
├─→ 10,000+ queries/day
├─→ Organization use
├─→ Add rate limiting
├─→ Custom domain
└─→ SLA guarantees
```

## Monitoring Points

```
1. MCP Server
   ├─→ Health endpoint
   ├─→ Error rate
   ├─→ Response time
   └─→ Request count

2. Database
   ├─→ Row count
   ├─→ Query performance
   ├─→ Storage size
   └─→ Connection count

3. Dashboard
   ├─→ Page load time
   ├─→ Real-time latency
   ├─→ Active users
   └─→ Error logs

4. External APIs
   ├─→ Availability
   ├─→ Response time
   └─→ Error rate
```

This architecture provides a clean separation of concerns, easy scalability, and comprehensive monitoring for production use.
