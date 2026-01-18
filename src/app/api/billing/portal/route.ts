import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBillingService } from "@/modules/billing/services/billing-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billingService = getBillingService();
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const portalUrl = await billingService.createPortalSession(
      session.user.id,
      `${origin}/billing`
    );

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("Failed to create portal session:", error);

    if (error instanceof Error && error.message === "No billing account found") {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
