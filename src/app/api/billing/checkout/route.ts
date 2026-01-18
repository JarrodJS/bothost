import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBillingService } from "@/modules/billing/services/billing-service";
import { z } from "zod";

const checkoutSchema = z.object({
  tier: z.enum(["HOBBY", "PRO", "ENTERPRISE"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tier } = checkoutSchema.parse(body);

    const billingService = getBillingService();
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const checkoutUrl = await billingService.createCheckoutSession(
      session.user.id,
      tier,
      `${origin}/billing?success=true`,
      `${origin}/billing?canceled=true`
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Failed to create checkout session:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid tier", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
