# Documentation Index

Welcome to the Naevneneshus MCP Server project! This index will help you find the right documentation for your needs.

## Quick Links

| If you want to... | Read this |
|-------------------|-----------|
| **Get started in 5 minutes** | [QUICK_START.md](./QUICK_START.md) |
| **Understand what was built** | [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) |
| **Set up step-by-step** | [SETUP.md](./SETUP.md) |
| **Integrate with OpenWebUI** | [OPENWEBUI_INTEGRATION.md](./OPENWEBUI_INTEGRATION.md) |
| **Understand the architecture** | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **Learn everything** | [README.md](./README.md) |

## Documentation Overview

### 1. QUICK_START.md
**Best for**: First-time users who want to get running quickly

**Contents**:
- Get credentials (1 min)
- Test MCP server (1 min)
- Set up OpenWebUI tool (2 min)
- Run dashboard (1 min)

**When to use**: When you just want to get it working ASAP.

---

### 2. SETUP.md
**Best for**: Complete step-by-step setup with troubleshooting

**Contents**:
- Detailed setup instructions
- Verification steps
- Common issues and solutions
- Production deployment guide

**When to use**: When you want detailed guidance and troubleshooting help.

---

### 3. OPENWEBUI_INTEGRATION.md
**Best for**: OpenWebUI users who want to integrate the tool

**Contents**:
- MCP server endpoints documentation
- Python tool code with examples
- Configuration instructions
- Usage examples
- Benefits over direct API calls

**When to use**: When you're setting up the OpenWebUI integration.

---

### 4. PROJECT_SUMMARY.md
**Best for**: Understanding what was built and why

**Contents**:
- Complete component list
- Before/after comparison
- Architecture benefits
- File structure
- Success metrics

**When to use**: When you want to understand the full scope of the project.

---

### 5. ARCHITECTURE.md
**Best for**: Developers who want to understand how it works

**Contents**:
- System diagrams
- Data flow explanations
- Component responsibilities
- Security layers
- Scaling considerations

**When to use**: When you need to understand or modify the system.

---

### 6. README.md
**Best for**: Complete project documentation

**Contents**:
- Features overview
- Setup instructions
- API documentation
- Tech stack
- Development guide

**When to use**: When you want comprehensive documentation in one place.

---

### 7. openwebui_tool.py
**Best for**: Ready-to-use OpenWebUI tool code

**Contents**:
- Complete Python tool class
- Detailed docstrings
- Usage examples
- Error handling

**When to use**: When you're adding the tool to OpenWebUI (just copy and paste).

---

## Code Files

### Frontend (Web Dashboard)

```
src/
├── App.tsx                    # Main app with navigation
├── components/
│   ├── Dashboard.tsx          # Monitoring dashboard
│   └── SearchInterface.tsx    # Search UI
└── lib/
    ├── supabase.ts           # Supabase client setup
    └── mcpClient.ts          # MCP API client
```

**Purpose**: React app for searching and monitoring queries

**To run**:
```bash
npm install
npm run dev
```

---

### Backend (MCP Server)

```
supabase/functions/naevneneshus-mcp/
└── index.ts                  # Edge Function (MCP server)
```

**Purpose**: Handles API requests, logging, error handling

**Endpoints**:
- POST /search
- POST /feed
- POST /publication
- GET /health

---

### Database

**Table**: `query_logs`

**Purpose**: Stores all search queries with results and timing

**Fields**:
- portal (text)
- query (text)
- result_count (integer)
- execution_time_ms (integer)
- error_message (text)
- created_at (timestamptz)

---

## Usage Scenarios

### Scenario 1: "I just want to search Danish appeals boards from OpenWebUI"

1. Read: [QUICK_START.md](./QUICK_START.md)
2. Get credentials from `.env`
3. Update `openwebui_tool.py` with your credentials
4. Add tool to OpenWebUI
5. Start searching!

**Time**: 5 minutes

---

### Scenario 2: "I want to monitor all queries and see statistics"

1. Read: [SETUP.md](./SETUP.md) (Step 7)
2. Run `npm install && npm run dev`
3. Open `http://localhost:5173`
4. Click "Monitor" tab
5. Make some searches to see data

**Time**: 10 minutes

---

### Scenario 3: "I want to understand how everything works"

1. Read: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
2. Read: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. Review code in `src/` and `supabase/functions/`
4. Check database schema in migration file

**Time**: 30 minutes

---

### Scenario 4: "I'm having problems and need help"

1. Check: [SETUP.md](./SETUP.md) → Troubleshooting section
2. Verify: Health endpoint works
3. Test: With curl before OpenWebUI
4. Check: Browser console for errors
5. Review: Supabase logs

**Time**: 10-20 minutes

---

## API Quick Reference

### Search
```bash
POST /functions/v1/naevneneshus-mcp/search
{
  "portal": "mfkn.naevneneshus.dk",
  "query": "jordforurening",
  "page": 1,
  "pageSize": 10
}
```

### Feed
```bash
POST /functions/v1/naevneneshus-mcp/feed
{
  "portal": "mfkn.naevneneshus.dk"
}
```

### Publication
```bash
POST /functions/v1/naevneneshus-mcp/publication
{
  "portal": "mfkn.naevneneshus.dk",
  "id": "ba60a058-66d8-485f-8a3a-229585c81964"
}
```

### Health
```bash
GET /functions/v1/naevneneshus-mcp/health
```

---

## Portals

| Domain | Board Name |
|--------|-----------|
| `mfkn.naevneneshus.dk` | Miljø- og Fødevareklagenævnet |
| `aen.naevneneshus.dk` | Ankestyrelsen |
| `ekn.naevneneshus.dk` | Energiklagenævnet |
| `pn.naevneneshus.dk` | Planklagenævnet |

---

## Key Features

### ✅ Multi-Portal Support
Works with any `*.naevneneshus.dk` portal

### ✅ Automatic Logging
Every query logged to database automatically

### ✅ Real-time Monitoring
Dashboard updates instantly via WebSocket

### ✅ Alert System
Highlights queries with 0 or >50 results

### ✅ Simple Integration
OpenWebUI tool is just ~150 lines of code

### ✅ Complete Documentation
6 docs covering every aspect

---

## Development Commands

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

---

## Environment Variables

Required in `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Support

### Documentation
- All questions answered in one of the 6 docs
- Use this index to find the right doc

### Testing
- Test with `curl` first
- Check Supabase dashboard logs
- Review browser console

### Help
- Troubleshooting in [SETUP.md](./SETUP.md)
- Common issues documented
- Step-by-step verification

---

## What's Next?

After successful setup:

1. **Customize**: Modify the OpenWebUI tool formatting
2. **Explore**: Try different portals and queries
3. **Monitor**: Review query patterns in dashboard
4. **Extend**: Add new features or integrations
5. **Share**: Add more users to your OpenWebUI instance

---

## Project Stats

- **Backend**: 1 Edge Function (~500 lines)
- **Frontend**: 3 components (~800 lines)
- **Database**: 1 table with 3 indexes
- **Documentation**: 6 comprehensive guides
- **Tool**: 1 OpenWebUI tool (~150 lines)
- **Total Setup Time**: ~15 minutes
- **Maintenance**: Minimal (automatic updates)

---

## License

MIT - Feel free to use, modify, and distribute

---

## Quick Decision Tree

```
Start here
    │
    ├─→ Want to search now?
    │   └─→ QUICK_START.md
    │
    ├─→ Need step-by-step setup?
    │   └─→ SETUP.md
    │
    ├─→ Setting up OpenWebUI?
    │   └─→ OPENWEBUI_INTEGRATION.md
    │
    ├─→ Want to understand it?
    │   └─→ PROJECT_SUMMARY.md
    │
    ├─→ Need technical details?
    │   └─→ ARCHITECTURE.md
    │
    └─→ Want everything?
        └─→ README.md
```

---

**Ready to start?** Head to [QUICK_START.md](./QUICK_START.md) for the fastest path to success! 🚀
