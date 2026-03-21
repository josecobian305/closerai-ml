/**
 * Brain Chat — Real AI powered by Bedrock Claude
 * 
 * Each user's brain has access to their config files and can:
 * - Answer questions about their setup
 * - Modify dashboard preferences
 * - Change agent rules
 * - Explain features
 * - Give business advice
 */

import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();

// In-memory conversation history per user (swap for Redis in prod)
const conversations = new Map<string, Array<{ role: string; content: string }>>();

/**
 * POST /api/v1/brain/chat
 * Body: { message: string, userId: string, config: object }
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { message, userId, config } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  try {
    // Get or create conversation history
    const convKey = userId || 'anonymous';
    if (!conversations.has(convKey)) {
      conversations.set(convKey, []);
    }
    const history = conversations.get(convKey)!;
    
    // Add user message
    history.push({ role: 'user', content: message });
    
    // Keep last 20 messages for context
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Build system prompt with user's config
    const systemPrompt = buildSystemPrompt(config);
    
    // Call Bedrock Claude
    const reply = await callBedrock(systemPrompt, history);
    
    // Add assistant reply to history
    history.push({ role: 'assistant', content: reply });
    
    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Brain chat error', { err: String(err) });
    res.status(500).json({ error: 'Brain is thinking... try again in a moment.' });
  }
});

function buildSystemPrompt(config: any): string {
  const businessName = config?.businessName || 'your business';
  const agentName = config?.agent?.name || 'your agent';
  const industry = config?.industry || 'general';
  const tone = config?.tone || 'professional';
  const ownerName = config?.owner?.name || 'there';
  const capabilities = config?.capabilities || {};

  return `You are the Brain — the AI operating system for ${businessName}'s CloserAI dashboard.

IDENTITY:
- You are ${ownerName}'s personal AI assistant inside the CloserAI platform
- You help manage their sales agents, customize their dashboard, and grow their business
- Their AI sales agent is named ${agentName}
- Their industry is ${industry}
- Their preferred tone is ${tone}

CAPABILITIES YOU CAN HELP WITH:
${capabilities.sms ? '- SMS outreach campaigns (enabled)' : '- SMS outreach (disabled — tell them to enable it)'}
${capabilities.email ? '- Email follow-ups (enabled)' : '- Email (disabled)'}
${capabilities.voiceNotes ? '- Voice notes (enabled)' : '- Voice notes (disabled)'}
${capabilities.autoReply ? '- Auto-reply to leads (enabled)' : '- Auto-reply (disabled)'}
${capabilities.docCollection ? '- Document collection (enabled)' : '- Document collection (disabled)'}
${capabilities.courtSearch ? '- Court records search (enabled)' : '- Court records search (disabled)'}

WHAT YOU CAN DO:
1. Answer questions about the platform, features, and how things work
2. Help customize the dashboard layout and preferences
3. Explain agent behavior and suggest improvements
4. Give business growth advice specific to ${industry}
5. Help troubleshoot issues
6. Suggest optimal outreach strategies
7. Help write better SMS/email templates
8. Explain analytics and metrics

RULES:
- Be helpful, direct, and actionable
- Keep responses concise (2-4 sentences unless they ask for detail)
- If they ask to change something, confirm what you'd change and do it
- If they ask about a feature that's disabled, explain how to enable it
- Reference their business by name
- Reference their agent by name
- Be encouraging about their progress
- If you don't know something, say so honestly`;
}

async function callBedrock(systemPrompt: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  // Use AWS SDK to call Bedrock
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });
  
  // Use Haiku for speed + cost (upgrade to Sonnet for Pro users)
  const modelId = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
  
  const bedrockMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: [{ text: m.content }],
  }));

  const command = new ConverseCommand({
    modelId,
    system: [{ text: systemPrompt }],
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: 500,
      temperature: 0.7,
    },
  });

  const response = await client.send(command);
  const outputContent = response.output?.message?.content;
  
  if (outputContent && outputContent.length > 0) {
    return outputContent[0].text || 'I\'m here — what do you need?';
  }
  
  return 'I\'m here — what do you need?';
}

export const brainRouter = router;
