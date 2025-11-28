import { useState } from 'react';
import { Download, Copy, Check, ExternalLink } from 'lucide-react';

export function OpenWebUIGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const mcpUrl = `${baseUrl}/functions/v1/naevneneshus-mcp`;

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'Naevneneshus Search API',
      description: 'Search Danish appeals boards for rulings and decisions',
      version: '1.0.0',
    },
    servers: [
      {
        url: mcpUrl,
      },
    ],
    paths: {
      '/mcp': {
        post: {
          summary: 'Search Naevneneshus portals',
          description:
            'Search Danish appeals boards for legal rulings and decisions. Returns formatted text results.',
          operationId: 'searchNaevneneshus',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: {
                      type: 'string',
                      description: "Search query (e.g., 'jordforurening', '§ 72', 'støj')",
                    },
                    portal: {
                      type: 'string',
                      description: 'Portal domain (default: fkn.naevneneshus.dk)',
                      default: 'fkn.naevneneshus.dk',
                      enum: [
                        'fkn.naevneneshus.dk',
                        'pkn.naevneneshus.dk',
                        'mfkn.naevneneshus.dk',
                        'dkbb.naevneneshus.dk',
                        'dnfe.naevneneshus.dk',
                        'klfu.naevneneshus.dk',
                        'tele.naevneneshus.dk',
                        'rn.naevneneshus.dk',
                        'apv.naevneneshus.dk',
                        'tvist.naevneneshus.dk',
                        'ean.naevneneshus.dk',
                        'byf.naevneneshus.dk',
                        'ekn.naevneneshus.dk',
                      ],
                    },
                    page: {
                      type: 'integer',
                      description: 'Page number',
                      default: 1,
                    },
                    pageSize: {
                      type: 'integer',
                      description: 'Results per page (max 50)',
                      default: 5,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Bearer token for authentication',
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  };

  function downloadOpenAPISpec() {
    const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naevneneshus-openapi.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const authHeader = `Bearer ${apiKey}`;

  const curlExample = `curl -X POST ${mcpUrl}/mcp \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "jordforurening", "portal": "mfkn.naevneneshus.dk"}'`;

  const pythonExample = `import requests

url = "${mcpUrl}/mcp"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
payload = {
    "query": "jordforurening",
    "portal": "mfkn.naevneneshus.dk",
    "page": 1,
    "pageSize": 5
}

response = requests.post(url, json=payload, headers=headers)
print(response.text)`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Open WebUI Integration</h1>
        <p className="text-gray-600">
          Connect Open WebUI to search Danish appeals boards directly from your AI assistant
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 mb-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Quick Setup Guide</h2>
        <ol className="space-y-3 text-blue-50">
          <li className="flex items-start">
            <span className="font-bold mr-3">1.</span>
            <span>Open Open WebUI and go to Settings → External Tools or Manage Tool Servers</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-3">2.</span>
            <span>Click "Add Connection" or "+" to add a new tool server</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-3">3.</span>
            <span>Enter the Base URL from below in the URL field</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-3">4.</span>
            <span>For OpenAPI Spec, select "URL" and enter: <code className="bg-blue-800 px-2 py-1 rounded">openapi.json</code></span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-3">5.</span>
            <span>For Authentication, select "Bearer" and paste the anon key from below</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-3">6.</span>
            <span>Click "Save" - Open WebUI will automatically discover all available search tools</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-3">7.</span>
            <span>Start asking questions like "Search for jordforurening cases on mfkn.naevneneshus.dk"</span>
          </li>
        </ol>

        <div className="mt-6 flex gap-4 flex-wrap">
          <button
            onClick={downloadOpenAPISpec}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download OpenAPI Spec (Optional)
          </button>
          <a
            href={`${mcpUrl}/openapi.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-blue-800 text-white font-semibold rounded-lg hover:bg-blue-900 transition-colors shadow-lg"
          >
            <ExternalLink className="w-5 h-5" />
            View OpenAPI Spec Online
          </a>
        </div>
      </div>

      <div className="grid gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Server Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800">
                  {mcpUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(mcpUrl, 'url')}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {copied === 'url' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAPI Spec URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800">
                  {mcpUrl}/openapi.json
                </code>
                <button
                  onClick={() => copyToClipboard(`${mcpUrl}/openapi.json`, 'openapi')}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {copied === 'openapi' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter "openapi.json" in Open WebUI (it will append to the base URL)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bearer Token (for Authentication)
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 truncate">
                  {apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(apiKey, 'token')}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {copied === 'token' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Select "Bearer" authentication in Open WebUI and paste this token
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Portals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">fkn.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Forbrugerklagenævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">pkn.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Planklagenævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">mfkn.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Miljø og Fødevareklagenævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">dkbb.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Disciplinær- og klagenævnet for beskikkede bygningssagkyndige</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">dnfe.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Disciplinærnævnet for Ejendomsmæglere</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">klfu.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Klagenævnet for Udbud</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">tele.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Teleklagenævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">rn.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Revisornævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">apv.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Ankenævnet for Patenter og Varemærker</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">tvist.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Tvistighedsnævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">ean.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Erhvervsankenævnet</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">byf.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Byfornyelsesnævnene</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900">ekn.naevneneshus.dk</div>
                <div className="text-sm text-gray-600">Energiklagenævnet</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Example Queries for Open WebUI
        </h3>
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-900">"Search for jordforurening rulings"</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-900">"Find støj decisions from 2024"</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-900">"Search ekn.naevneneshus.dk for vindmøller"</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Testing with curl</h3>
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{curlExample}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(curlExample, 'curl')}
            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied === 'curl' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Testing with Python</h3>
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{pythonExample}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(pythonExample, 'python')}
            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied === 'python' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Need Help?</h4>
            <p className="text-blue-800 text-sm">
              Visit the{' '}
              <a
                href="https://docs.openwebui.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                Open WebUI documentation
              </a>{' '}
              for detailed setup instructions and troubleshooting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
