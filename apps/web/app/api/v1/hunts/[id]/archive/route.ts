import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/v1/hunts/[id]/archive
 * Archive a hunt (hide from public but preserve data).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const huntId = parseInt(id, 10);
  if (isNaN(huntId)) {
    return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "archive") {
      // Archive the hunt
      const { hideHuntsFromPublic } = await import("@/lib/huntStore");
      hideHuntsFromPublic([huntId]);
      return NextResponse.json({ success: true, message: "Hunt archived successfully" });
    } else if (action === "unarchive") {
      // Unarchive the hunt
      const { unhideHuntsFromPublic } = await import("@/lib/huntStore");
      unhideHuntsFromPublic([huntId]);
      return NextResponse.json({ success: true, message: "Hunt unarchived successfully" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Archive hunt error:", error);
    return NextResponse.json({ error: "Failed to archive hunt" }, { status: 500 });
  }
}
 