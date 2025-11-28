"""
Naevneneshus Search Tool for OpenWebUI

This is a simplified version that uses the MCP server to handle all the complexity.
All the query building, logging, and error handling happens on the server side.

Setup:
1. Get your Supabase URL and Anon Key from the .env file
2. Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY below
3. Copy this entire file as a new Function Tool in OpenWebUI
"""

import requests
from typing import Optional, Dict

class Tools:
    """
    Naevneneshus Search - Search Danish appeals boards for rulings and decisions

    Supports multiple portals:
    - mfkn.naevneneshus.dk (Miljø- og Fødevareklagenævnet)
    - aen.naevneneshus.dk (Ankestyrelsen)
    - ekn.naevneneshus.dk (Energiklagenævnet)
    - pn.naevneneshus.dk (Planklagenævnet)
    """

    def __init__(self):
        self.name = "naevneneshus_search"
        self.description = (
            "Search Danish appeals boards (naevneneshus.dk) for legal rulings and decisions. "
            "Supports environmental, energy, planning, and social appeals boards."
        )

        # TODO: Replace these with your actual Supabase credentials
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
        page_size: int = 5,
        category: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> str:
        """
        Search for publications on a naevneneshus.dk portal.

        Args:
            query: Search query (e.g., "jordforurening", "§ 72", "støj")
            portal: Portal domain (default: mfkn.naevneneshus.dk)
                   Options: mfkn, aen, ekn, pn + .naevneneshus.dk
            page: Page number (default: 1)
            page_size: Results per page (default: 5, max: 50)
            category: Filter by category (optional, e.g., "ruling", "news")
            date_from: Start date filter (optional, format: YYYY-MM-DD)
            date_to: End date filter (optional, format: YYYY-MM-DD)

        Returns:
            Formatted search results with titles, dates, and links

        Examples:
            # Basic search
            run(query="jordforurening")

            # Search with filters
            run(query="støj", category="ruling", date_from="2024-01-01")

            # Search different portal
            run(query="vindmøller", portal="ekn.naevneneshus.dk")
        """

        # Build request payload
        payload = {
            "portal": portal,
            "query": query,
            "page": page,
            "pageSize": min(page_size, 50),  # Cap at 50
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

            if response.status_code != 200:
                error_msg = response.json().get("error", "Unknown error")
                return f"❌ Search failed: {error_msg}"

            data = response.json()

            # Format results
            return self._format_results(data, portal, query)

        except requests.Timeout:
            return "⏱️ Request timed out. The portal may be slow or unavailable."
        except requests.ConnectionError:
            return "🔌 Connection error. Please check your internet connection."
        except Exception as e:
            return f"❌ Error: {str(e)}"

    def _format_results(self, data: Dict, portal: str, query: str) -> str:
        """Format search results for display"""

        total = data.get("totalCount", 0)
        publications = data.get("publications", [])
        exec_time = data.get("meta", {}).get("executionTime", 0)

        if total == 0:
            return (
                f"🔍 No results found for \"{query}\" on {portal}\n\n"
                f"💡 Try:\n"
                f"- Using different search terms\n"
                f"- Removing date filters\n"
                f"- Checking spelling"
            )

        lines = [
            f"📋 Found {total} results for \"{query}\"",
            f"🌐 Portal: {portal}",
            f"⏱️ Search time: {exec_time}ms",
            "",
        ]

        # Show category breakdown if available
        category_counts = data.get("categoryCounts", [])
        if category_counts:
            lines.append("📊 Categories:")
            for cat in category_counts[:5]:  # Limit to top 5
                lines.append(f"   • {cat['category']}: {cat['count']}")
            lines.append("")

        lines.extend([
            f"📄 Showing {len(publications)} results:",
            "─" * 60
        ])

        # Format each publication
        for i, pub in enumerate(publications, 1):
            title = pub.get("title", "Untitled")
            categories = pub.get("categories", [])
            jnr = pub.get("jnr", [])
            date = pub.get("date", "N/A")
            pub_id = pub.get("id", "")
            pub_type = pub.get("type", "ruling")

            # Build link
            link = f"https://{portal}/{'nyhed' if pub_type == 'news' else 'afgoerelse'}/{pub_id}"

            lines.extend([
                f"\n{i}. {title}",
            ])

            if categories:
                lines.append(f"   📑 {', '.join(categories)}")

            if jnr:
                lines.append(f"   📋 Journal: {', '.join(jnr)}")

            lines.extend([
                f"   📅 Date: {date}",
                f"   🔗 {link}",
            ])

        # Add pagination hint if there are more results
        if total > len(publications):
            lines.extend([
                "",
                "─" * 60,
                f"💡 Showing {len(publications)} of {total} results. Use page={page+1} for more."
            ])

        return "\n".join(lines)


# Example usage (for testing):
if __name__ == "__main__":
    tool = Tools()

    # Test search
    result = tool.run(
        query="jordforurening",
        portal="mfkn.naevneneshus.dk",
        page_size=3
    )
    print(result)
