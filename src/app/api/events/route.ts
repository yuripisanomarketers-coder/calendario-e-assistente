import { NextResponse, type NextRequest } from "next/server";
import { listEvents } from "@/lib/google";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const timeMin = request.nextUrl.searchParams.get("timeMin");
  const timeMax = request.nextUrl.searchParams.get("timeMax");
  if (!timeMin || !timeMax || Number.isNaN(Date.parse(timeMin)) || Number.isNaN(Date.parse(timeMax))) {
    return NextResponse.json({ error: "Intervallo non valido" }, { status: 400 });
  }
  try {
    const events = await listEvents({ timeMin, timeMax, maxResults: 250 });
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Errore calendario", error);
    return NextResponse.json({ error: "Impossibile caricare il calendario" }, { status: 502 });
  }
}
