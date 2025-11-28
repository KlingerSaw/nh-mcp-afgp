# OpenWebUI Integration Guide

This guide explains how to integrate the Naevneneshus search API with OpenWebUI using OpenAPI specification.

## Quick Start - OpenAPI Integration (Recommended)

The API is now fully OpenAPI 3.0 compatible, making integration with OpenWebUI extremely simple.

### Step 1: Get Your Credentials

From your `.env` file or Supabase dashboard, you need:
- **Supabase URL**: `https://soavtttwnswalynemlxr.supabase.co`
- **Anon Key**: Your `VITE_SUPABASE_ANON_KEY`

### Step 2: Add to OpenWebUI External Tools

1. Open OpenWebUI Settings
2. Navigate to **External Tools** (or **Admin Settings → Tools → External Tools**)
3. Click **Add External Tool** or **Import from URL**
4. Configure:
   - **OpenAPI Spec URL**: `https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json`
   - **Authentication Type**: Bearer Token
   - **Token**: Your anon key from `.env` file
5. Click **Save** or **Import**

OpenWebUI will automatically discover **16+ tools** from the OpenAPI specification - one for each portal:
- `search_mfkn_naevneneshus_dk` - Miljø- og Fødevareklagenævnet
- `search_ekn_naevneneshus_dk` - Energiklagenævnet
- `search_pkn_naevneneshus_dk` - Planklagenævnet
- ... and 13 more portals

### Step 3: Use in Chat

Simply ask questions like:
- "Search for jordforurening cases on mfkn.naevneneshus.dk"
- "Find rulings about vindmoeller"
- "What are the latest publications?"

## Troubleshooting: OpenWebUI Shows "Connected" But No Tools

If OpenWebUI says the external tool is connected but **0 tools** appear, work through these checks:

1. **Spec requires a Bearer token** – Without it, OpenWebUI receives an empty/401 response and therefore generates no tools. In OpenWebUI set **Authentication Type: Bearer Token** and paste your anon key.
2. **Verify the spec loads with your token** – From a terminal, confirm you get JSON back:
   ```bash
   curl -H "Authorization: Bearer <YOUR_ANON_KEY>" \
     https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json | head
   ```
   If this returns HTML or an auth error, the key is wrong or missing in OpenWebUI.
3. **Remove and re-import the tool** – Some OpenWebUI versions cache failed imports. Delete the entry, re-add with the exact URL (no spaces), and include the token.
4. **Check OpenWebUI version** – External OpenAPI tools require **v0.3.x or newer**. Upgrade if you are on an older build.
5. **Look at browser network logs** – In OpenWebUI DevTools, the request to `/openapi.json` should return `200` with JSON. A `401/403` means the token is not being sent.

## API Endpoint

The API is deployed as a Supabase Edge Function:

```
https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp
```

### OpenAPI Specification

Access the full OpenAPI spec at:
```
https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
```

## Available Endpoints

### 1. Search (POST /search)

Search for publications across any naevneneshus.dk portal.

**Request Body:**
```json
{
  "portal": "mfkn.naevneneshus.dk",
  "query": "jordforurening",
  "page": 1,
  "pageSize": 10,
  "filters": {
    "category": "ruling",
    "dateRange": {
      "start": "2022-01-01",
      "end": "2025-01-27"
    }
  },
  "userIdentifier": "optional-user-id"
}
```

**Response:**
```json
{
  "totalCount": 42,
  "elapsedMilliseconds": 245,
  "categoryCounts": [
    { "category": "Jordforureningsloven", "count": 42 }
  ],
  "publications": [...],
  "meta": {
    "executionTime": 245,
    "portal": "mfkn.naevneneshus.dk"
  }
}
```

### 2. Feed (POST /feed)

Get the latest publications from a portal.

**Request Body:**
```json
{
  "portal": "mfkn.naevneneshus.dk"
}
```

### 3. Publication (POST /publication)

Get a specific publication by ID.

**Request Body:**
```json
{
  "portal": "mfkn.naevneneshus.dk",
  "id": "ba60a058-66d8-485f-8a3a-229585c81964"
}
```

### 4. Health Check (GET /health)

Check if the server is running.

## Supported Portals

- `mfkn.naevneneshus.dk` - Miljø- og Fødevareklagenævnet
- `aen.naevneneshus.dk` - Ankestyrelsen
- `ekn.naevneneshus.dk` - Energiklagenævnet
- `pn.naevneneshus.dk` - Planklagenævnet
- Any other `*.naevneneshus.dk` portal

## Tool Usage in OpenWebUI

Once connected, you'll have access to portal-specific search tools. Each tool is optimized for its specific portal with:
- Pre-loaded categories and legal areas
- Common acronyms automatically expanded
- Portal-specific examples and descriptions

### How to Use

Simply ask questions in natural language:
- "Find cases about noise pollution on MFKN"
- "Search for wind turbine rulings on EKN"
- "What are recent decisions about local plans on PKN"

The AI will automatically:
1. Select the correct portal tool
2. Format your query appropriately
3. Present results in a clear format with links

## Advanced: Custom Python Tool (Optional)

If you prefer to create a custom Python tool instead of using the OpenAPI integration, you can use this template:

```python
import requests
from typing import Optional, Dict, List

class Tools:
    """
    Custom Naevneneshus Search Tool
    Note: This is optional - the OpenAPI integration is recommended
    """

    def __init__(self):
        self.name = "naevneneshus_search"
        self.description = (
            "Search Danish appeals boards (naevneneshus.dk) for rulings and decisions. "
            "Supports multiple portals including MFKN, AEN, EKN, and PN."
        )

        # Configure with your Supabase URL and key
        self.mcp_url = "https://YOUR_SUPABASE_URL/functions/v1/naevneneshus-mcp"
        self.headers = {
            "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
            "Content-Type": "application/json"
        }

    def run(
        self,
        query: str,
        portal: str = "mfkn.naevneneshus.dk",
        page: int = 1,
        page_size: int = 10,
        category: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> str:
        """
        Search for publications on a naevneneshus.dk portal.

        Args:
            query: Search query string
            portal: Portal domain (default: mfkn.naevneneshus.dk)
            page: Page number (default: 1)
            page_size: Results per page (default: 10)
            category: Optional category filter (e.g., "ruling")
            date_from: Optional start date (YYYY-MM-DD)
            date_to: Optional end date (YYYY-MM-DD)

        Returns:
            Formatted search results
        """

        # Build request payload
        payload = {
            "portal": portal,
            "query": query,
            "page": page,
            "pageSize": page_size,
        }

        # Add filters if provided
        filters = {}
        if category:
            filters["category"] = category
        if date_from or date_to:
            filters["dateRange"] = {
                "start": date_from or "1900-01-01",
                "end": date_to or "2100-01-01"
            }

        if filters:
            payload["filters"] = filters

        try:
            # Call MCP server
            response = requests.post(
                f"{self.mcp_url}/search",
                json=payload,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            # Format results
            return self._format_results(data, portal)

        except Exception as e:
            return f"Search failed: {str(e)}"

    def _format_results(self, data: Dict, portal: str) -> str:
        """Format search results for display"""

        total = data.get("totalCount", 0)
        publications = data.get("publications", [])

        if total == 0:
            return f"No results found. Try different search terms."

        lines = [
            f"Found {total} results",
            f"Portal: {portal}",
            "",
            "Results:",
            "─" * 50
        ]

        for pub in publications:
            title = pub.get("title", "Untitled")
            categories = ", ".join(pub.get("categories", []))
            jnr = ", ".join(pub.get("jnr", []))
            date = pub.get("date", "N/A")
            pub_id = pub.get("id", "")
            pub_type = pub.get("type", "ruling")

            link = f"https://{portal}/{'nyhed' if pub_type == 'news' else 'afgoerelse'}/{pub_id}"

            lines.extend([
                f"• {title}",
                f"  Categories: {categories}",
                f"  Journal: {jnr}",
                f"  Date: {date}",
                f"  Link: {link}",
                "─" * 50
            ])

        return "\\n".join(lines)
```

### Custom Tool Configuration Steps (Optional)

**Note:** Only follow these steps if you need a custom Python tool. The OpenAPI integration is recommended for most users.

1. **Get your Supabase credentials** from the `.env` file:
   ```bash
   cat .env
   ```

2. **Update the tool code** with your credentials:
   - Open the `openwebui_tool.py` file from this repository
   - Replace `YOUR_SUPABASE_URL` with your Supabase project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

   Example:
   ```python
   self.mcp_url = "https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp"
   self.headers = {
       "Authorization": "Bearer eyJhbGci...",
       "Content-Type": "application/json"
   }
   ```

3. **Add the tool to OpenWebUI**:
   - Go to OpenWebUI Settings → Functions
   - Click "Create New Function"
   - Paste the entire updated `openwebui_tool.py` code
   - Save and enable the function

## Features

### Automatic Query Logging

All search queries are automatically logged to the Supabase database with:
- Portal used
- Query string
- Number of results
- Execution time
- Any errors encountered

### Monitoring Dashboard

The web interface provides:
- **Real-time statistics** on query volume
- **Alerts** for queries with empty results or >50 results
- **14-day history** of all queries
- **Live updates** via Supabase real-time subscriptions

### Multi-Portal Support

The MCP server works with any `naevneneshus.dk` portal. Simply specify the portal domain in your request.

## Benefits Over Direct API Calls

1. **Centralized Logging** - All queries logged automatically
2. **Error Handling** - Consistent error handling and reporting
3. **Monitoring** - Built-in monitoring dashboard
4. **Simplified Integration** - Clean API for OpenWebUI tools
5. **Performance Tracking** - Execution time tracking for all queries
6. **Multi-Portal** - Single endpoint for all portals

## Example Usage in OpenWebUI

```python
# Search for environmental cases
result = tools.run(
    query="jordforurening",
    portal="mfkn.naevneneshus.dk",
    category="ruling",
    date_from="2024-01-01"
)
print(result)

# Search another portal
result = tools.run(
    query="vindmøller",
    portal="ekn.naevneneshus.dk"
)
print(result)
```

## Troubleshooting

### Connection Errors

If you get connection errors, verify:
1. Your Supabase URL is correct
2. Your API key is valid
3. The Edge Function is deployed

### Empty Results

Check the monitoring dashboard for queries with empty results. The system automatically tracks these for review.

### Performance Issues

The monitoring dashboard shows execution times. Queries taking >5 seconds may need optimization.
