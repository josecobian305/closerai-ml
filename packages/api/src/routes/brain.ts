/**
 * Brain Chat — Full Operator Mode
 *
 * Powered by Bedrock Claude with tool use (Converse API).
 * The Brain doesn't just advise — it EXECUTES:
 *   - get_stats          → live dashboard stats
 *   - get_contacts       → search/list GHL contacts
 *   - get_messages       → SMS conversation history
 *   - send_sms           → send text via TextTorrent
 *   - update_agent_config → write agent workspace files
 *   - stop_outreach      → add phone to opt-out list
 *   - navigate_ui        → instruct frontend to navigate
 *   - search_court_records → run court search script
 *   - get_agent_workspace → view agent config files
 *   - get_agent_leads    → view lead states
 *   - save_integration   → save API credentials
 *   - update_preferences → update dashboard preferences
 */

import { Router, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { logger } from '../logger';

const router = Router();

// In-memory conversation history per user (swap for Redis in prod)
const conversations = new Map<string, Array<{ role: string; content: any }>>(); // eslint-disable-line @typescript-eslint/no-explicit-any

// ── Tool definitions ───────────────────────────────────────────────────────

const TOOL_SPECS = [
  {
    toolSpec: {
      name: 'get_stats',
      description: 'Get live dashboard stats — total contacts, SMS sent today, SMS sent total, replies, reply categories, and per-agent stats. Call this when the user asks about stats, numbers, performance, or how things are going.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_contacts',
      description: 'Search or list contacts from GHL CRM. Can filter by name, phone, email, company, or status. Returns enriched contact data including SMS history.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query — name, phone, email, or company name. Leave empty to list recent contacts.',
            },
            limit: {
              type: 'number',
              description: 'Max number of contacts to return (default 10, max 50).',
            },
            filter: {
              type: 'string',
              description: 'Optional filter: "hot", "new", "replied", "opted_out".',
            },
          },
          required: [],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_messages',
      description: 'Get the full SMS/email conversation history for a specific phone number. Returns all outbound messages sent and inbound replies received.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'Phone number in E.164 format (e.g. +13051234567). Required.',
            },
          },
          required: ['phone'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'send_sms',
      description: 'Send an SMS message to a specific phone number via TextTorrent. Use this when the user says "send a text to X" or "message [name/number] saying...".',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'Recipient phone number in E.164 format (e.g. +13051234567).',
            },
            message: {
              type: 'string',
              description: 'The SMS message body to send.',
            },
            from: {
              type: 'string',
              description: 'Sender number to use: "jacob" (default) or "angie". Optional.',
            },
          },
          required: ['phone', 'message'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'update_agent_config',
      description: 'Update an agent\'s configuration file — SOUL.md, REPLY-RULES.md, OUTREACH-RULES.md, etc. Use this when the user wants to change how an agent behaves, its tone, rules, or identity.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'Agent name: "jacob", "angie", "jacob-2", "angie-2", etc.',
            },
            file: {
              type: 'string',
              description: 'Config file to update: "SOUL.md", "REPLY-RULES.md", "OUTREACH-RULES.md", "IDENTITY.md", "HEARTBEAT.md".',
            },
            content: {
              type: 'string',
              description: 'New full content of the file.',
            },
          },
          required: ['agentName', 'file', 'content'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'stop_outreach',
      description: 'Stop all outreach to a specific phone number — adds them to the opt-out list for the specified agent. Use when user says "stop texting X", "blacklist this number", "opt out +1...".',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'Phone number in E.164 format to stop contacting.',
            },
            agentName: {
              type: 'string',
              description: 'Agent to stop outreach for: "jacob" or "angie". Defaults to both if not specified.',
            },
          },
          required: ['phone'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'navigate_ui',
      description: 'Navigate the user to a specific page or view in the CloserAI dashboard. Use when user says "show me X", "take me to X", "open the contacts page", etc.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            page: {
              type: 'string',
              description: 'Page to navigate to: "contacts", "messages", "pipeline", "agents", "integrations", "analytics", "settings".',
            },
            filter: {
              type: 'string',
              description: 'Optional filter to apply on the page, e.g. "hot", "replied", a specific phone number.',
            },
            contactPhone: {
              type: 'string',
              description: 'If navigating to a specific contact\'s detail view, provide their phone number.',
            },
          },
          required: ['page'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'search_court_records',
      description: 'Search public court records for defaults or judgments against a business. Use when user asks about court records, defaults, judgments, or due diligence on a company.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            businessName: {
              type: 'string',
              description: 'Name of the business to search court records for.',
            },
            state: {
              type: 'string',
              description: 'Two-letter US state code to narrow the search (e.g. "FL", "NY"). Optional.',
            },
          },
          required: ['businessName'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_agent_workspace',
      description: 'View an agent\'s current configuration files — SOUL.md, rules, and identity. Use when user asks "what are Jacob\'s rules?" or "show me Angie\'s config".',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'Agent name: "jacob", "angie", "jacob-2", "angie-2", etc.',
            },
          },
          required: ['agentName'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_agent_leads',
      description: 'Get lead states for an agent — who has been contacted, who replied, opt-outs, and today\'s send count.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'Agent name: "jacob", "angie", "jacob-2", "angie-2", etc.',
            },
          },
          required: ['agentName'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'save_integration',
      description: 'Save API credentials for an integration (GHL, Twilio, TextTorrent, OpenAI, etc.). Use when user wants to connect or update a service.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              description: 'Integration provider: "ghl", "texttorrent", "twilio", "openai", "stripe", etc.',
            },
            credentials: {
              type: 'object',
              description: 'Key-value credentials object (e.g. { "apiKey": "...", "sid": "..." }).',
            },
          },
          required: ['provider', 'credentials'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'update_preferences',
      description: `Update dashboard visual preferences. Available options:
- layout: "overview_first" | "contacts_first" | "messages_first" | "pipeline_first"
- theme: "dark" | "light" | "midnight" | "ocean" | "sunset"
- invertColors: true/false (CSS inversion of all colors)
- compactMode: true/false (tighter layout, smaller cards)
- fontSize: "small" | "medium" | "large"
- sidebarCollapsed: true/false (icon-only sidebar)
- accentColor: hex color string like "#10b981" for green, "#ef4444" for red, "#f59e0b" for amber
- defaultFilter: "all" | "hot" | "warm" | "cold" | "docs" | "funded"
- widgetOrder: array like ["stats","contacts","agents","pipeline"]
Use this when user wants to change how their dashboard looks. You can set multiple at once.`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            preferences: {
              type: 'object',
              description: 'Preferences to merge. Keys: layout, theme, invertColors, compactMode, fontSize, sidebarCollapsed, accentColor, defaultFilter, widgetOrder.',
            },
          },
          required: ['preferences'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "report_bug",
      description: "Report a bug or issue to tech support. Sends an SMS to the CloserAI admin (Jose) with the bug description. Use this when the user reports a problem, encounters an error, or asks to contact support/admin/tech team.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            description: { type: "string", description: "Description of the bug or issue the user is experiencing" },
            page: { type: "string", description: "Which page/section the bug is on (if known)" },
            userId: { type: "string", description: "The user ID reporting the bug" },
            businessName: { type: "string", description: "The business name of the user" }
          },
          required: ["description"]
        }
      }
    }
  },
];

// ── HTTP helper ────────────────────────────────────────────────────────────

function httpGet(url: string): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    }).on('error', reject);
  });
}

function httpRequest(method: string, url: string, body: any, headers?: Record<string, string>): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(headers || {}),
      },
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Tool executor ──────────────────────────────────────────────────────────

interface ToolAction {
  type: 'navigate' | 'update_preferences' | 'refresh_stats' | 'show_contact' | 'none';
  payload?: Record<string, unknown>;
}

let pendingAction: ToolAction | null = null;

async function executeTool(name: string, input: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const BASE = 'http://localhost:3002/api/v1';

  try {
    switch (name) {

      // ── get_stats ──────────────────────────────────────────────────────
      case 'get_stats': {
        const stats = await httpGet(`${BASE}/stats`);
        pendingAction = { type: 'refresh_stats' };
        return stats;
      }

      // ── get_contacts ───────────────────────────────────────────────────
      case 'get_contacts': {
        const { query, limit = 10, filter } = input;
        let url = `${BASE}/contacts?limit=${Math.min(limit, 50)}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        const result = await httpGet(url);
        // Apply client-side filter if needed
        if (filter && result.contacts) {
          const f = filter.toLowerCase();
          if (f === 'hot') {
            result.contacts = result.contacts.filter((c: any) => c.tags?.includes('hot') || c.tier === 'hot');
          } else if (f === 'replied') {
            result.contacts = result.contacts.filter((c: any) => c.smsSentCount > 0 && c.lastSmsPreview);
          }
        }
        return result;
      }

      // ── get_messages ───────────────────────────────────────────────────
      case 'get_messages': {
        const { phone } = input;
        const encodedPhone = encodeURIComponent(phone);
        const result = await httpGet(`${BASE}/contacts/${encodedPhone}/messages`);
        return result;
      }

      // ── send_sms ───────────────────────────────────────────────────────
      case 'send_sms': {
        const { phone, message, from } = input;
        const ttSid = process.env.TT_SID;
        const ttKey = process.env.TT_KEY;
        const fromNumber = from === 'angie'
          ? (process.env.TT_FROM_ANGIE || '16469682289')
          : (process.env.TT_FROM_NUMBER || '12624191533');

        if (!ttSid || !ttKey) {
          return { success: false, error: 'TextTorrent credentials not configured' };
        }

        const ttUrl = 'https://api.texttorrent.com/api/v1/Messages';
        const credentials = Buffer.from(`${ttSid}:${ttKey}`).toString('base64');
        const result = await httpRequest('POST', ttUrl, {
          From: fromNumber,
          To: phone.replace(/^\+/, ''),
          Body: message,
        }, {
          'Authorization': `Basic ${credentials}`,
        });

        logger.info('Brain sent SMS', { phone, from: fromNumber, status: result.status });
        return {
          success: result.status === 200 || result.status === 201,
          phone,
          from: fromNumber,
          message,
          response: result.body,
        };
      }

      // ── update_agent_config ────────────────────────────────────────────
      case 'update_agent_config': {
        const { agentName, file, content } = input;
        const wsMap: Record<string, string> = {
          'jacob': '/home/ubuntu/.openclaw/workspace-jacob',
          'jacob-2': '/home/ubuntu/.openclaw/workspace-jacob-2',
          'jacob-3': '/home/ubuntu/.openclaw/workspace-jacob-3',
          'angie': '/home/ubuntu/.openclaw/workspace-angie',
          'angie-2': '/home/ubuntu/.openclaw/workspace-angie-2',
          'angie-3': '/home/ubuntu/.openclaw/workspace-angie-3',
        };
        const wsPath = wsMap[agentName?.toLowerCase()];
        if (!wsPath) {
          return { success: false, error: `Unknown agent: ${agentName}` };
        }
        // Only allow safe file names
        const SAFE_FILES = ['SOUL.md', 'IDENTITY.md', 'REPLY-RULES.md', 'OUTREACH-RULES.md',
          'EMAIL-RULES.md', 'VOICE-RULES.md', 'HEARTBEAT.md', 'USER.md', 'AGENTS.md', 'TOOLS.md'];
        const safeFile = SAFE_FILES.find(f => f.toLowerCase() === file?.toLowerCase()) || file;
        if (!SAFE_FILES.includes(safeFile)) {
          return { success: false, error: `File ${file} is not in the allowed list` };
        }
        const filePath = path.join(wsPath, safeFile);
        // Back up old file
        if (fs.existsSync(filePath)) {
          fs.copyFileSync(filePath, `${filePath}.bak`);
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        logger.info('Brain updated agent config', { agentName, file: safeFile });
        return { success: true, agentName, file: safeFile, path: filePath };
      }

      // ── stop_outreach ──────────────────────────────────────────────────
      case 'stop_outreach': {
        const { phone, agentName } = input;
        const agents = agentName ? [agentName.toLowerCase()] : ['jacob', 'angie'];
        const results: any[] = [];
        for (const agent of agents) {
          const result = await httpRequest('POST', `${BASE}/agents/${agent}/stop`, { phone });
          results.push({ agent, ...result.body });
        }
        return { success: true, phone, results };
      }

      // ── navigate_ui ───────────────────────────────────────────────────
      case 'navigate_ui': {
        const { page, filter, contactPhone } = input;
        pendingAction = {
          type: 'navigate',
          payload: { page, filter, contactPhone },
        };
        return { success: true, navigating: page, filter };
      }

      // ── search_court_records ───────────────────────────────────────────
      case 'search_court_records': {
        const { businessName, state } = input;
        // Try to run the court search script if it exists
        const scriptPaths = [
          '/home/ubuntu/.openclaw/workspace/scripts/court-search.sh',
          '/home/ubuntu/.openclaw/workspace/court-search.sh',
        ];
        let scriptPath = scriptPaths.find(p => fs.existsSync(p));
        if (scriptPath) {
          try {
            const args = state ? `"${businessName}" "${state}"` : `"${businessName}"`;
            const output = execSync(`bash ${scriptPath} ${args}`, { timeout: 30000 }).toString();
            return { success: true, businessName, state, results: output };
          } catch (err) {
            logger.warn('Court search script failed', { err: String(err) });
          }
        }
        // Fallback: return web search instructions
        const query = `"${businessName}" court judgment default ${state || ''} site:pacer.gov OR site:courtlistener.com`.trim();
        return {
          success: true,
          businessName,
          state,
          note: 'Court search script not found. Use web search.',
          suggestedSearch: query,
          searchUrls: [
            `https://www.courtlistener.com/?q=${encodeURIComponent(businessName)}&type=p&order_by=score+desc`,
            `https://pacer.gov/`,
          ],
        };
      }

      // ── get_agent_workspace ────────────────────────────────────────────
      case 'get_agent_workspace': {
        const { agentName } = input;
        const result = await httpGet(`${BASE}/agents/${agentName?.toLowerCase()}/workspace`);
        return result;
      }

      // ── get_agent_leads ───────────────────────────────────────────────
      case 'get_agent_leads': {
        const { agentName } = input;
        const result = await httpGet(`${BASE}/agents/${agentName?.toLowerCase()}/leads`);
        return result;
      }

      // ── save_integration ───────────────────────────────────────────────
      case 'save_integration': {
        const { provider, credentials } = input;
        const result = await httpRequest('PUT', `${BASE}/integrations/${provider}`, { credentials });
        return { success: result.status < 300, provider, ...result.body };
      }

      // ── update_preferences ─────────────────────────────────────────────
      case 'update_preferences': {
        const { preferences } = input;
        pendingAction = {
          type: 'update_preferences',
          payload: preferences,
        };
        return { success: true, preferences, note: 'Preferences queued for frontend update' };
      }


      case "report_bug": {
        const bugDesc = input.description || "No description";
        const bugPage = input.page || "unknown";
        const bugUser = input.businessName || input.userId || "anonymous";
        const ADMIN_EMAIL = "jcobian@chccapitalgroup.com";
        const bugSubject = `[CloserAI Bug] ${bugPage} - ${bugUser}`;
        const bugBody = `From: ${bugUser}\nPage: ${bugPage}\nIssue: ${bugDesc}\nTime: ${new Date().toISOString()}`;
        try {
          const emailMml = `From: jclaude@chccapitalgroup.com\nTo: ${ADMIN_EMAIL}\nSubject: ${bugSubject}\n\n${bugBody}`;
          execSync(`echo '${emailMml.replace(/'/g, "\'")}' | himalaya template send`, { timeout: 10000 });
          return { sent: true, to: ADMIN_EMAIL, subject: bugSubject };
        } catch (e) {
          logger.error("Bug report email failed", { error: String(e) });
          return { sent: false, error: String(e), fallback: "Bug logged internally" };
        }
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    logger.error('Tool execution error', { tool: name, err: String(err) });
    return { error: `Tool execution failed: ${String(err)}` };
  }
}

// ── System prompt builder ──────────────────────────────────────────────────

function buildSystemPrompt(config: any): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  const businessName = config?.businessName || 'your business';
  const agentName = config?.agent?.name || 'your agent';
  const industry = config?.industry || 'business funding';
  const tone = config?.tone || 'professional';
  const ownerName = config?.owner?.name || 'there';

  return `You are the Brain — the AI operating system for ${businessName}'s CloserAI dashboard.

IDENTITY:
- You are ${ownerName}'s executive AI operator inside the CloserAI platform
- You DON'T just give instructions — you EXECUTE actions directly using your tools
- You manage sales agents (${agentName}), customize the dashboard, and run operations
- Industry: ${industry} | Tone: ${tone}

CRITICAL BEHAVIOR — CONVERSATIONAL WORKFLOW BUILDER:
When a user describes a goal, project, or set of leads — DON'T immediately act.
Instead, ASK CLARIFYING QUESTIONS to build the perfect workflow. Be like a senior sales strategist.

Example flow:
User: "I have 500 restaurant leads"
You: "Nice! Let me build a custom workflow for those. Quick questions:
1. How fresh are these leads? (just came in, 1-7 days old, 30+ days)
2. Do you have phone numbers, emails, or both?
3. What's your main goal — get them to apply, book a call, or send docs?"

User: "Fresh, phone only, get docs"
You: "Perfect. Here's what I'd build:
📱 Day 1: Personalized intro SMS — casual, restaurant-specific
📱 Day 2: Follow-up with funding range
🎤 Day 3: Voice note from ${agentName}
📧 Day 5: Email with application + doc checklist
📱 Day 7: Last chance urgency text
📱 Day 14: Re-engagement if no response

Estimated: 500 leads × 5 SMS + 1 email + 1 voice = ~$50 in costs
Expected replies: ~15-25 (3-5% rate)
Expected doc submissions: ~5-8

Want me to activate this sequence now, or adjust anything?"

User: "Do it"
You: *actually creates the config, sets up the sequence, starts the agents*

WHEN TO ASK QUESTIONS (always for these):
- User mentions leads, campaigns, or outreach → ask about lead type, age, goal
- User wants to change strategy → ask what's not working, what they want instead
- User asks about pricing/ROI → ask about their volume and current conversion
- User wants to set up automation → ask what triggers it, who it targets, what it does
- Anything ambiguous → ask, don't guess

WHEN TO ACT IMMEDIATELY (no questions needed):
- "Show me my stats" → get_stats
- "Send a text to +1234567890" → send_sms
- "Take me to contacts" → navigate_ui
- "Report a bug" → report_bug
- "What are my settings?" → get_agent_workspace
- "Stop texting this number" → stop_outreach
- Simple factual questions → answer directly

TOOLS AVAILABLE:
- get_stats: Live dashboard numbers
- get_contacts: Search/list CRM contacts
- get_messages: Get conversation history for a number
- send_sms: Send a text message right now
- update_agent_config: Edit agent rules, tone, SOUL.md
- stop_outreach: Opt a number out immediately
- navigate_ui: Take the user to a specific dashboard page
- search_court_records: Look up business court records
- get_agent_workspace: View an agent's config files
- get_agent_leads: See lead states, opt-outs, sent today
- save_integration: Store API credentials
- update_preferences: Change dashboard theme/layout/colors
- report_bug: Send bug report to admin via email

PERSONALITY:
- Be a strategic partner, not just a tool executor
- Give opinions and recommendations based on ${industry} expertise
- Be encouraging but honest about expectations
- Use numbers when possible (reply rates, costs, timelines)
- Be concise but thorough when building workflows
- Reference their business (${businessName}) and agent (${agentName}) by name`;
}

// ── Bedrock caller with tool use loop ─────────────────────────────────────

async function callBedrockWithTools(
  systemPrompt: string,
  messages: Array<{ role: string; content: any }>, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<string> {
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });
  const modelId = 'us.anthropic.claude-opus-4-6-v1';

  // Working copy of messages (so we can append tool results without mutating the stored history)
  const workingMessages = [...messages];

  // Tool loop — max 5 iterations to prevent runaway chains
  for (let iteration = 0; iteration < 5; iteration++) {
    const command = new ConverseCommand({
      modelId,
      system: [{ text: systemPrompt }],
      messages: workingMessages as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      toolConfig: { tools: TOOL_SPECS as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 0.5,
      },
    });

    const response = await client.send(command);
    const outputMessage = response.output?.message;

    if (!outputMessage) {
      return "I'm here — what do you need?";
    }

    // If Claude wants to use a tool
    if (response.stopReason === 'tool_use') {
      // Find all tool use blocks (Claude may request multiple)
      const toolUseBlocks = outputMessage.content?.filter((c: any) => c.toolUse) || []; // eslint-disable-line @typescript-eslint/no-explicit-any

      if (toolUseBlocks.length === 0) {
        // Shouldn't happen, but handle gracefully
        const text = outputMessage.content?.find((c: any) => c.text)?.text; // eslint-disable-line @typescript-eslint/no-explicit-any
        return text || "Done.";
      }

      // Push the assistant's tool_use message
      workingMessages.push({ role: 'assistant', content: outputMessage.content });

      // Execute all requested tools
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const toolName = block.toolUse.name;
          const toolInput = block.toolUse.input;
          logger.info('Brain executing tool', { tool: toolName, input: toolInput });

          const result = await executeTool(toolName, toolInput);
          logger.info('Brain tool result', { tool: toolName, result });

          return {
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ json: result }],
            },
          };
        })
      );

      // Push tool results as a user message
      workingMessages.push({ role: 'user', content: toolResults });

      // Continue the loop to get Claude's final response
      continue;
    }

    // Stop reason is 'end_turn' or similar — return the text response
    const text = outputMessage.content?.find((c: any) => c.text)?.text; // eslint-disable-line @typescript-eslint/no-explicit-any
    return text || "Done.";
  }

  return "I completed the requested actions.";
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/brain/chat
 * Body: { message: string, userId: string, config: object }
 *
 * Response: { reply: string, action?: { type: string, payload: object }, timestamp: string }
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { message, userId, config } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  try {
    const convKey = userId || 'anonymous';
    if (!conversations.has(convKey)) {
      conversations.set(convKey, []);
    }
    const history = conversations.get(convKey)!;

    // Add user message (text only for history storage)
    history.push({ role: 'user', content: [{ text: message }] });

    // Keep last 20 exchanges for context
    if (history.length > 40) {
      history.splice(0, history.length - 40);
    }

    const systemPrompt = buildSystemPrompt(config);

    // Reset pending action before each call
    pendingAction = null;

    // Call Bedrock with tool use
    const reply = await callBedrockWithTools(systemPrompt, history);

    // Add assistant reply to history
    history.push({ role: 'assistant', content: [{ text: reply }] });

    // Build response — include any frontend action
    const responseBody: Record<string, unknown> = {
      reply,
      timestamp: new Date().toISOString(),
    };

    if (pendingAction && (pendingAction as ToolAction).type !== 'none') {
      responseBody.action = pendingAction;
    }

    res.json(responseBody);
  } catch (err) {
    logger.error('Brain chat error', { err: String(err) });
    res.status(500).json({ error: 'Brain is thinking... try again in a moment.' });
  }
});

/**
 * DELETE /api/v1/brain/history/:userId
 * Clear conversation history for a user.
 */
router.delete('/history/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  conversations.delete(userId);
  res.json({ success: true, userId });
});

export const brainRouter = router;
