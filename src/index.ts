#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { encode } from "gpt-tokenizer";
import * as Diff from "diff";

const server = new Server(
  {
    name: "Optimized Token Diff Editor",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_tokens",
        description: "Analyze token usage in original and modified code",
        inputSchema: {
          type: "object",
          properties: {
            originalCode: {
              type: "string",
              description: "Original code to analyze"
            },
            modifiedCode: {
              type: "string",
              description: "Modified code to analyze"
            }
          },
          required: ["originalCode", "modifiedCode"]
        }
      },
      {
        name: "generate_diff",
        description: "Generate a diff between original and modified code",
        inputSchema: {
          type: "object",
          properties: {
            originalCode: {
              type: "string",
              description: "Original code"
            },
            modifiedCode: {
              type: "string",
              description: "Modified code"
            }
          },
          required: ["originalCode", "modifiedCode"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "analyze_tokens": {
      const originalCode = String(request.params.arguments?.originalCode);
      const modifiedCode = String(request.params.arguments?.modifiedCode);

      const originalTokens = await encode(originalCode);
      const modifiedTokens = await encode(modifiedCode);

      const tokenDiff = originalTokens.length - modifiedTokens.length;

      return {
        content: [{
          type: "text",
          text: `Original Tokens: ${originalTokens.length}, Modified Tokens: ${modifiedTokens.length}, Token Difference: ${tokenDiff}`
        }]
      };
    }

    case "generate_diff": {
      const originalCode = String(request.params.arguments?.originalCode);
      const modifiedCode = String(request.params.arguments?.modifiedCode);

      const changes = Diff.diffLines(originalCode, modifiedCode);
      let formattedDiff = '';

      changes.forEach((part: Diff.Change) => {
        if (part.removed) {
          formattedDiff += '<<<<<<< SEARCH\n' + part.value;
          formattedDiff += '=======\n';
        } else if (part.added) {
          formattedDiff += part.value + '>>>>>>> REPLACE\n';
        } else {
          formattedDiff += part.value;
        }
      });

      return {
        content: [{
          type: "text",
          text: formattedDiff
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
