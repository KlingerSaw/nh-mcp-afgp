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
        # Get these from the web interface at the top of the Search page
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
    ) -> str:
        """
        Search for publications on a naevneneshus.dk portal.

        Args:
            query: Search query (e.g., "jordforurening", "§ 72", "støj")
            portal: Portal domain (default: mfkn.naevneneshus.dk)
                   Options: mfkn, aen, ekn, pn + .naevneneshus.dk
            page: Page number (default: 1)
            page_size: Results per page (default: 5, max: 50)
            category: Filter by category (optional, e.g., "Miljøbeskyttelsesloven")

        Returns:
            Formatted search results with titles, dates, and links

        Examples:
            # Basic search
            run(query="jordforurening")

            # Search with category
            run(query="støj", category="Miljøbeskyttelsesloven")

            # Search different portal
            run(query="vindmøller", portal="ekn.naevneneshus.dk")
        """

        # Debug logging to see what parameters were received
        print(f"[OpenWebUI Tool] Received parameters:")
        print(f"  query: {query}")
        print(f"  category: {category}")
        print(f"  portal: {portal}")

        # Build request payload for MCP endpoint
        # Explicitly include the portal and originalRequest so the MCP server
        # can log the correct portal/query combination in the monitoring UI.
        payload = {
            "portal": portal,
            "query": query,
            "page": page,
            "pageSize": min(page_size, 50),  # Cap at 50
            "originalRequest": query,
        }

        # Add category filter if provided
        if category:
            print(f"[OpenWebUI Tool] Adding category to payload: {category}")
            payload["filters"] = {
                "category": category
            }
        else:
            print(f"[OpenWebUI Tool] No category provided")

        try:
            # Call MCP endpoint (includes automatic logging to database)
            response = requests.post(
                self.mcp_url,
                json=payload,
                headers=self.headers,
                timeout=30
            )

            if response.status_code != 200:
                try:
                    error_msg = response.json().get("error", "Unknown error")
                except:
                    error_msg = response.text
                return f"❌ Search failed: {error_msg}"

            # MCP endpoint returns plain text, not JSON
            result_text = response.text
            return result_text

        except requests.Timeout:
            return "⏱️ Request timed out. The portal may be slow or unavailable."
        except requests.ConnectionError:
            return "🔌 Connection error. Please check your internet connection."
        except Exception as e:
            return f"❌ Error: {str(e)}"


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
