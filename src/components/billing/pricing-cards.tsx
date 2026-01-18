"use client";

import { useState } from "react";
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface PricingCardsProps {
  currentTier: SubscriptionTierKey;
}

export function PricingCards({ currentTier }: PricingCardsProps) {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTierKey | null>(null);

  const handleUpgrade = async (tier: SubscriptionTierKey) => {
    if (tier === "FREE" || tier === currentTier) return;

    setLoadingTier(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Failed to create checkout session");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
      setLoadingTier(null);
    }
  };

  const tiers = Object.entries(SUBSCRIPTION_TIERS) as [
    SubscriptionTierKey,
    (typeof SUBSCRIPTION_TIERS)[SubscriptionTierKey]
  ][];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {tiers.map(([key, tier]) => {
        const isCurrent = key === currentTier;
        const isPopular = key === "PRO";
        const isDowngrade =
          Object.keys(SUBSCRIPTION_TIERS).indexOf(key) <
          Object.keys(SUBSCRIPTION_TIERS).indexOf(currentTier);

        return (
          <Card
            key={key}
            className={cn(
              "relative",
              isPopular && "border-primary",
              isCurrent && "bg-muted/50"
            )}
          >
            {isPopular && (
              <Badge className="absolute -top-3 right-4">Popular</Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {tier.name}
                {isCurrent && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </CardTitle>
              <div className="text-3xl font-bold">
                ${tier.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              {key === "FREE" ? (
                <Button variant="outline" className="w-full" disabled>
                  {isCurrent ? "Current Plan" : "Free"}
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : isDowngrade ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleUpgrade(key)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === key ? "Loading..." : "Downgrade"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade(key)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === key ? "Loading..." : "Upgrade"}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
