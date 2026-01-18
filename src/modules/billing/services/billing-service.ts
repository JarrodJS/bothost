import { db } from "@/lib/db";
import { getStripe, SUBSCRIPTION_TIERS, getTierByPriceId, SubscriptionTierKey } from "@/lib/stripe";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";

export class BillingService {
  // Create a Stripe checkout session for subscription
  async createCheckoutSession(
    userId: string,
    tier: Exclude<SubscriptionTierKey, "FREE">,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const priceId = SUBSCRIPTION_TIERS[tier].priceId;
    if (!priceId) {
      throw new Error("Invalid tier");
    }

    // Get or create Stripe customer
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription record with customer ID
      if (user.subscription) {
        await db.subscription.update({
          where: { userId: user.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return session.url!;
  }

  // Create a Stripe billing portal session
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  // Handle Stripe webhook events
  async handleWebhook(event: {
    type: string;
    data: { object: Record<string, unknown> };
  }): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          metadata: { userId: string; tier: SubscriptionTierKey };
          subscription: string;
        };
        await this.handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          id: string;
          status: string;
          items: { data: Array<{ price: { id: string } }> };
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
        };
        await this.handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as { id: string };
        await this.handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { subscription: string };
        await this.handlePaymentFailed(invoice);
        break;
      }
    }
  }

  private async handleCheckoutCompleted(session: {
    metadata: { userId: string; tier: SubscriptionTierKey };
    subscription: string;
  }): Promise<void> {
    const { userId, tier } = session.metadata;

    // Get subscription details from Stripe
    const stripeSubscription = await getStripe().subscriptions.retrieve(
      session.subscription
    );

    await db.subscription.update({
      where: { userId },
      data: {
        tier: tier as SubscriptionTier,
        status: "ACTIVE",
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: {
    id: string;
    status: string;
    items: { data: Array<{ price: { id: string } }> };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  }): Promise<void> {
    const dbSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    const priceId = subscription.items.data[0].price.id;
    const tier = getTierByPriceId(priceId) ?? "FREE";

    let status: SubscriptionStatus = "ACTIVE";
    if (subscription.status === "past_due") {
      status = "PAST_DUE";
    } else if (subscription.status === "canceled") {
      status = "CANCELED";
    } else if (subscription.status === "trialing") {
      status = "TRIALING";
    }

    await db.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        tier: tier as SubscriptionTier,
        status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: {
    id: string;
  }): Promise<void> {
    const dbSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    // Downgrade to free tier
    await db.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        tier: "FREE",
        status: "CANCELED",
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handlePaymentFailed(invoice: {
    subscription: string;
  }): Promise<void> {
    const dbSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!dbSubscription) return;

    await db.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: "PAST_DUE",
      },
    });
  }
}

// Singleton instance
let billingService: BillingService | null = null;

export function getBillingService(): BillingService {
  if (!billingService) {
    billingService = new BillingService();
  }
  return billingService;
}
