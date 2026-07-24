import { NextResponse } from "next/server";
import { providerConfigured } from "@/lib/oauth";

/** Which social buttons to show. Read at request time rather than baked into a NEXT_PUBLIC_ flag,
 *  so adding the credentials takes effect immediately — `NEXT_PUBLIC_*` is inlined at BUILD time
 *  and would need a full rebuild (a gotcha this project has already paid for once). */
export async function GET() {
  return NextResponse.json(
    { google: providerConfigured("google"), line: providerConfigured("line") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
