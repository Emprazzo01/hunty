import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/v1/hunts/[id]/delete
 * Soft delete or permanently delete a hunt.
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
    const { action, confirmed } = body;

    if (action === "soft-delete") {
      // Soft delete with 30-day recovery window
      const { softDeleteHunts } = await import("@/lib/huntStore");
      softDeleteHunts([huntId]);
      return NextResponse.json({
        success: true,
        message: "Hunt soft-deleted successfully. You can restore it within 30 days.",
      });
    } else if (action === "restore") {
      // Restore soft-deleted hunt
      const { restoreHunts } = await import("@/lib/huntStore");
      restoreHunts([huntId]);
      return NextResponse.json({ success: true, message: "Hunt restored successfully" });
    } else if (action === "permanent-delete") {
      // Permanent delete requires confirmation
      if (!confirmed) {
        return NextResponse.json(
          {
            error: "Confirmation required. Set confirmed=true to permanently delete.",
          },
          { status: 400 }
        );
      }
      const { permanentDeleteHunts } = await import("@/lib/huntStore");
      permanentDeleteHunts([huntId]);
      return NextResponse.json({
        success: true,
        message: "Hunt permanently deleted. This action cannot be undone.",
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Delete hunt error:", error);
    return NextResponse.json({ error: "Failed to delete hunt" }, { status: 500 });
  }
}
 