"use client";

import { useState } from "react";
import { Subscription } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BillingCardProps {
  subscription: Subscription | null;
}

export function BillingCard({ subscription }: BillingCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Failed to open billing portal");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open billing portal",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const hasBillingAccount = subscription?.stripeCustomerId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>Manage your payment details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasBillingAccount ? (
          <>
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Manage Payment Methods</p>
                <p className="text-sm text-muted-foreground">
                  Update your card or billing address
                </p>
              </div>
            </div>
            <Button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Billing
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No payment method on file. Upgrade to a paid plan to add one.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
