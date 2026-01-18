import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SUBSCRIPTION_TIERS } from "@/lib/stripe";
import { BillingCard } from "@/components/billing/billing-card";
import { PricingCards } from "@/components/billing/pricing-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { Check, AlertCircle } from "lucide-react";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const botCount = await db.bot.count({
    where: { userId: session.user.id },
  });

  const tier = subscription?.tier ?? "FREE";
  const tierInfo = SUBSCRIPTION_TIERS[tier];
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing settings
        </p>
      </div>

      {params.success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/15 text-green-500">
          <Check className="h-5 w-5" />
          <span>Your subscription has been updated successfully!</span>
        </div>
      )}

      {params.canceled && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-500/15 text-yellow-500">
          <AlertCircle className="h-5 w-5" />
          <span>Checkout was canceled. Your subscription remains unchanged.</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant={tier === "FREE" ? "secondary" : "default"}>
                {tierInfo.name}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-semibold">
                ${tierInfo.price}/month
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bots Used</span>
              <span>
                {botCount} / {tierInfo.bots}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Memory per Bot</span>
              <span>{tierInfo.memory}MB</span>
            </div>
            {subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? "Ends on" : "Renews on"}
                </span>
                <span>{formatDate(subscription.currentPeriodEnd)}</span>
              </div>
            )}
            {subscription?.cancelAtPeriodEnd && (
              <div className="p-3 rounded-lg bg-yellow-500/15 text-yellow-500 text-sm">
                Your subscription will be canceled at the end of the current
                billing period.
              </div>
            )}
          </CardContent>
        </Card>

        <BillingCard subscription={subscription} />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          {tier === "FREE" ? "Upgrade Your Plan" : "Change Plan"}
        </h2>
        <PricingCards currentTier={tier} />
      </div>
    </div>
  );
}
