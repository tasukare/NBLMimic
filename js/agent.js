/**
 * NBLMimic — Autonomous Capable AI Agent Subsystem
 * Function Calling, Dynamic Workspace Tools (Drive, Sources, Lab Notes, Live News),
 * Multi-turn ReAct execution loop, and real-time step visualization.
 * ZERO EMOJIS in UI.
 */

import { state } from './state.js';
import { getIcon, escapeHtml, showToast } from './ui.js';
import { appendLabNote, getLabNotes } from './notes.js';
import { searchWorkspaceSources, readWorkspaceDocument } from './sources-reader.js';

// ── Agent Native Tools Specification (Gemini Function Declarations) ──
export const AGENT_TOOLS = [
  {
    function_declarations: [
      {
        name: 'save_to_notes',
        description: 'Save research findings, hypotheses, outlines, or synthesized summaries directly into the researcher\'s encrypted Lab Notes scratchpad.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: {
              type: 'STRING',
              description: 'Clear, informative title for the note entry (e.g. "Attention Mechanism Breakdown", "CRISPR Safety Review")'
            },
            content: {
              type: 'STRING',
              description: 'Rich Markdown formatted note content with headers, bullet points, key equations, or quotes.'
            },
            tags: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Relevant research tags (e.g. ["#ai", "#architecture", "#attention"])'
            }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'search_workspace_sources',
        description: 'Search across all loaded sources and research papers in the workspace by keyword or topic to find relevant quotes and excerpts.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'Search query, topic, or keyword phrase'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'read_source_document',
        description: 'Read the full text or detailed content of a specific source document in the workspace by its title or ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            source_title_or_id: {
              type: 'STRING',
              description: 'The title or ID of the document to inspect'
            }
          },
          required: ['source_title_or_id']
        }
      },
      {
        name: 'get_live_world_news',
        description: 'Fetch breaking real-time news articles from the last 72 hours on topics like AI, science, policy, or markets to cross-reference with current research.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category_or_topic: {
              type: 'STRING',
              description: 'Optional category ("AI & Tech", "Science", "Markets", "Policy") or keyword filter'
            }
          }
        }
      },
      {
        name: 'read_lab_notes',
        description: 'Read the researcher\'s current Lab Notes scratchpad to inspect existing hypotheses, questions, or previous discoveries.',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      }
    ]
  }
];

// ── Agent Tool Execution Router ──
export async function executeAgentTool(name, args = {}) {
  try {
    switch (name) {
      case 'save_to_notes': {
        const { title, content, tags } = args;
        return await appendLabNote({ title, content, tags });
      }

      case 'search_workspace_sources': {
        const { query } = args;
        const matches = await searchWorkspaceSources(query);
        return {
          query,
          matchCount: matches.length,
          matches: matches.length > 0 ? matches : 'No direct matches found in current workspace sources.'
        };
      }

      case 'read_source_document': {
        const { source_title_or_id } = args;
        const doc = await readWorkspaceDocument(source_title_or_id);
        return doc;
      }

      case 'get_live_world_news': {
        const topic = (args.category_or_topic || '').toLowerCase();
        let articles = [];
        try {
          const res = await fetch('/api/news');
          if (res.ok) {
            const data = await res.json();
            articles = data.articles || [];
          }
        } catch (e) {}

        if (topic && articles.length > 0) {
          articles = articles.filter(a =>
            (a.title || '').toLowerCase().includes(topic) ||
            (a.category || '').toLowerCase().includes(topic) ||
            (a.excerpt || '').toLowerCase().includes(topic)
          );
        }

        return {
          totalFetched: articles.length,
          recentArticles: articles.slice(0, 4).map(a => ({
            title: a.title,
            source: a.source,
            date: a.date,
            category: a.category,
            excerpt: a.excerpt
          }))
        };
      }

      case 'read_lab_notes': {
        const notes = getLabNotes();
        return {
          hasNotes: Boolean(notes && notes.trim()),
          notesContent: notes || '(Lab Notes are currently empty.)'
        };
      }

      default:
        return { error: `Unknown tool "${name}" requested.` };
    }
  } catch (err) {
    return { error: `Tool execution failed: ${err.message}` };
  }
}

// ── Multi-turn Autonomous ReAct Agent Loop ──
export async function runAgentSession({
  userPrompt,
  context = '',
  model = 'gemini-3.5-flash-lite',
  primaryKey = null,
  parsedKeys = [],
  onStep = () => {}
}) {
  const systemInstruction = context.trim()
    ? `You are an elite autonomous research partner inside NBLMimic.
You have native tools to search workspace documents, read sources, fetch breaking live news, and write notes directly into the researcher's Lab Notes scratchpad.
When the user asks you to save, record, draft, or take notes, use the "save_to_notes" tool.
When the user asks about topics that may be in their sources, use "search_workspace_sources" or "read_source_document" to retrieve evidence.
When answering, ground your synthesis with numbered bracket citation notation like [1], [2] corresponding to active source numbers.
Maintain rigorous, objective, academic depth with zero fluff.`
    : `You are an elite autonomous research partner inside NBLMimic.
You have native tools to query live world news, inspect workspace sources, and draft findings into the researcher's Lab Notes.
Help the researcher brainstorm, explore concepts, summarize information, and plan experiments with rigorous depth.`;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: context.trim()
            ? `WORKSPACE SOURCES CONTEXT:\n${context}\n\nRESEARCH REQUEST:\n${userPrompt}`
            : userPrompt
        }
      ]
    }
  ];

  const maxAgentIterations = 4;
  let iteration = 0;
  let finalMarkdownReply = '';

  while (iteration < maxAgentIterations) {
    iteration++;

    // Prepare API call payload
    const payload = {
      model,
      apiKey: primaryKey,
      apiKeys: parsedKeys.length > 0 ? parsedKeys : undefined,
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      tools: AGENT_TOOLS
    };

    let responseData = null;

    // 1. Primary: Server Proxy
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        responseData = await res.json();
      }
    } catch (e) {
      // Fall through to direct call
    }

    // 2. Direct Fallback if proxy unreachable
    if (!responseData && parsedKeys.length > 0) {
      for (const k of parsedKeys) {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(k)}`;
        try {
          const directRes = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: payload.system_instruction,
              contents: payload.contents,
              tools: AGENT_TOOLS
            })
          });
          if (directRes.ok) {
            responseData = await directRes.json();
            break;
          }
        } catch (err) {}
      }
    }

    if (!responseData) {
      throw new Error('Unable to contact Gemini agent API.');
    }

    const candidate = responseData.candidates?.[0];
    if (!candidate || !candidate.content) {
      finalMarkdownReply = 'The agent could not generate a response.';
      break;
    }

    const parts = candidate.content.parts || [];
    const functionCallPart = parts.find(p => p.functionCall);

    // If Gemini requested a tool execution
    if (functionCallPart && functionCallPart.functionCall) {
      const call = functionCallPart.functionCall;
      const toolName = call.name;
      const toolArgs = call.args || {};

      // Notify UI of active tool step
      const stepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      onStep({
        id: stepId,
        status: 'running',
        name: toolName,
        args: toolArgs
      });

      // Execute tool locally
      const toolResult = await executeAgentTool(toolName, toolArgs);

      // Notify UI of tool completion
      onStep({
        id: stepId,
        status: 'completed',
        name: toolName,
        args: toolArgs,
        result: toolResult
      });

      // Append model call to conversation history
      contents.push({
        role: 'model',
        parts: [{ functionCall: call }]
      });

      // Append tool execution response to conversation history
      contents.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: toolResult
            }
          }
        ]
      });

      // Continue agent loop to let model reason over the result
      continue;
    }

    // No tool call requested — model produced final answer text
    const textPart = parts.find(p => p.text);
    finalMarkdownReply = textPart?.text || 'Synthesis complete.';
    break;
  }

  return finalMarkdownReply;
}
