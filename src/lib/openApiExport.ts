export function exportOpenAPISpec(baseUrl: string, anonKey: string) {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Naevneneshus MCP Search API",
      description: "Search Danish appeals boards (naevneneshus.dk) for legal rulings and decisions across environmental, energy, planning, consumer, and social appeals boards.",
      version: "1.0.4"
    },
    servers: [
      {
        url: baseUrl
      }
    ],
    paths: {
      "/mcp": {
        post: {
          summary: "Search publications",
          description: "Search for publications across Danish appeals board portals with optional filters",
          operationId: "searchPublications",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["query"],
                  properties: {
                    query: {
                      type: "string",
                      description: "Search query (e.g., 'jordforurening', '§ 72', 'støj')",
                      example: "jordforurening"
                    },
                    portal: {
                      type: "string",
                      description: "Portal domain to search",
                      default: "mfkn.naevneneshus.dk",
                      enum: [
                        "mfkn.naevneneshus.dk",
                        "aen.naevneneshus.dk",
                        "ekn.naevneneshus.dk",
                        "pn.naevneneshus.dk"
                      ],
                      example: "mfkn.naevneneshus.dk"
                    },
                    page: {
                      type: "integer",
                      description: "Page number for pagination",
                      default: 1,
                      minimum: 1,
                      example: 1
                    },
                    pageSize: {
                      type: "integer",
                      description: "Number of results per page",
                      default: 5,
                      minimum: 1,
                      maximum: 50,
                      example: 5
                    }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Successful search with formatted results",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                    description: "Formatted search results with titles, dates, categories, journal numbers, and links"
                  },
                  example: "📋 Fandt 210 resultater for \"jordforurening\"\n🌐 Portal: mfkn.naevneneshus.dk\n⏱️ Søgetid: 156ms\n\n📊 Kategorier:\n   • Jordforureningsloven: 68\n   • Miljøbeskyttelsesloven: 51\n\n📄 Viser 5 resultater:\n────────────────────────────────────────────────────────────\n\n1. Afgørelse om påbud..."
                }
              }
            },
            "400": {
              description: "Bad request - missing required parameters",
              content: {
                "text/plain": {
                  schema: {
                    type: "string"
                  }
                }
              }
            },
            "500": {
              description: "Server error",
              content: {
                "text/plain": {
                  schema: {
                    type: "string"
                  }
                }
              }
            }
          },
          security: [
            {
              BearerAuth: []
            }
          ]
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: `Use your Supabase Anon Key: ${anonKey}`
        }
      }
    }
  };

  const jsonStr = JSON.stringify(openApiSpec, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'naevneneshus_openapi.json';
  a.click();
  URL.revokeObjectURL(url);
}
