const MCP_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/naevneneshus-mcp`;

const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export interface SearchParams {
  portal: string;
  query: string;
  page?: number;
  pageSize?: number;
  filters?: {
    category?: string;
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  userIdentifier?: string;
  originalQuery?: string;
}

export interface SearchResult {
  totalCount: number;
  elapsedMilliseconds: number;
  categoryCounts: Array<{ category: string; count: number }>;
  publications: any[];
  meta?: {
    executionTime: number;
    portal: string;
  };
}

export const mcpClient = {
  async search(params: SearchParams): Promise<SearchResult> {
    const response = await fetch(`${MCP_BASE_URL}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async getFeed(portal: string) {
    const response = await fetch(`${MCP_BASE_URL}/feed`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ portal }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async getPublication(portal: string, id: string) {
    const response = await fetch(`${MCP_BASE_URL}/publication`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ portal, id }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async getPortals() {
    const response = await fetch(`${MCP_BASE_URL}/portals`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async getSiteSettings(portal: string) {
    const response = await fetch(`${MCP_BASE_URL}/site-settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ portal }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async healthCheck() {
    const response = await fetch(`${MCP_BASE_URL}/health`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  },
};
