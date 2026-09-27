import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runAssistant } from "@/lib/assistant";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(20_000),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  try {
    const reply = await runAssistant(parsed.data.messages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Errore assistente", error);
    let message = "Qualcosa è andato storto. Riprova tra poco.";
    if (error instanceof Anthropic.AuthenticationError) {
      message = "Chiave API di Anthropic mancante o non valida (ANTHROPIC_API_KEY).";
    } else if (error instanceof Anthropic.RateLimitError) {
      message = "Troppe richieste all'assistente: riprova tra qualche secondo.";
    } else if (error instanceof Anthropic.APIError) {
      message = `Errore dell'assistente (${error.status}). Riprova tra poco.`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
