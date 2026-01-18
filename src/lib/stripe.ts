import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: "Free",
    priceId: null,
    price: 0,
    bots: 1,
    memory: 128,
    features: ["1 bot", "128MB memory", "Basic support"],
  },
  HOBBY: {
    name: "Hobby",
    priceId: process.env.STRIPE_HOBBY_PRICE_ID,
    price: 9,
    bots: 3,
    memory: 256,
    features: ["3 bots", "256MB memory", "GitHub integration", "Email support"],
  },
  PRO: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    price: 29,
    bots: 10,
    memory: 512,
    features: [
      "10 bots",
      "512MB memory",
      "GitHub integration",
      "Custom domains",
      "Priority support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    price: 99,
    bots: 50,
    memory: 1024,
    features: [
      "50 bots",
      "1GB memory",
      "All features",
      "Custom integrations",
      "Dedicated support",
      "SLA",
    ],
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;

export function getTierByPriceId(priceId: string): SubscriptionTierKey | null {
  for (const [key, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tier.priceId === priceId) {
      return key as SubscriptionTierKey;
    }
  }
  return null;
}

export function getTierLimits(tier: SubscriptionTierKey) {
  return {
    bots: SUBSCRIPTION_TIERS[tier].bots,
    memory: SUBSCRIPTION_TIERS[tier].memory,
  };
}
