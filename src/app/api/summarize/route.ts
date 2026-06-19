import Anthropic from "@anthropic-ai/sdk";
import type { ApiResponse, Summary } from "@/types";

const SUMMARY_MODEL = "claude-haiku-4-5";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SummarizeRequestBody {
  title: string;
  description: string;
}

function isSummarizeRequestBody(value: unknown): value is SummarizeRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SummarizeRequestBody).title === "string" &&
    typeof (value as SummarizeRequestBody).description === "string"
  );
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

function isSummary(value: unknown): value is Summary {
  const v = value as Partial<Summary>;
  return (
    typeof v?.summaryEn === "string" &&
    typeof v?.summaryFr === "string" &&
    typeof v?.category === "string" &&
    Array.isArray(v?.tags) &&
    v.tags.every((tag) => typeof tag === "string")
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isSummarizeRequestBody(body)) {
      return Response.json(
        { success: false, error: "Request body must include title and description strings" } satisfies ApiResponse<Summary>,
        { status: 400 }
      );
    }

    const { title, description } = body;

    const message = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Summarize this news article in 1-2 concise sentences, in both English and French. Also assign a single category (e.g. "world", "politics", "business", "technology", "science", "sports", "entertainment", "health") and up to 5 short topical tags.

Title: ${title}
Description: ${description}

Respond with ONLY a JSON object in this exact shape, no markdown formatting:
{"summaryEn": "...", "summaryFr": "...", "category": "...", "tags": ["...", "..."]}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content returned from Claude");
    }

    const parsed = extractJson(textBlock.text);
    if (!isSummary(parsed)) {
      throw new Error("Claude response did not match the expected Summary shape");
    }

    return Response.json({ success: true, data: parsed } satisfies ApiResponse<Summary>);
  } catch (error) {
    console.error("[/api/summarize] Failed to summarize article:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to summarize article",
      } satisfies ApiResponse<Summary>,
      { status: 500 }
    );
  }
}
