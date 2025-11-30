/*
  # Add raw request and tool response logging

  1. Changes
    - Add `raw_request` column to store the request received by the MCP function
    - Add `tool_response` column to store the payload returned to the caller

  2. Purpose
    - Allow debugging of both the incoming request and the response delivered to tools
    - Complements existing payload/response logging for downstream portal calls
*/

ALTER TABLE query_logs
ADD COLUMN IF NOT EXISTS raw_request jsonb,
ADD COLUMN IF NOT EXISTS tool_response jsonb;
