import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Github, Zap, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold">BotHost</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Host Your Bots with{" "}
              <span className="text-primary">Zero Hassle</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Deploy Discord and Telegram bots in seconds. Connect your GitHub
              repo, upload your code, or use our templates. We handle the
              infrastructure.
            </p>
            <div className="flex gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Start Hosting <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Everything You Need
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              From deployment to monitoring, we&apos;ve got you covered.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-card p-6">
              <Github className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-bold">GitHub Integration</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your repo and deploy automatically on every push.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-card p-6">
              <Zap className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-bold">Instant Deployment</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload your bot code and have it running in under a minute.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-card p-6">
              <Shield className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-bold">Secure & Isolated</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Each bot runs in its own container with encrypted secrets.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Simple Pricing
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Start free, scale as you grow.
            </p>
          </div>
          <div className="mx-auto mt-8 grid max-w-[64rem] gap-4 md:grid-cols-4">
            {[
              { name: "Free", price: "$0", bots: "1 bot", memory: "128MB" },
              { name: "Hobby", price: "$9", bots: "3 bots", memory: "256MB" },
              { name: "Pro", price: "$29", bots: "10 bots", memory: "512MB", popular: true },
              { name: "Enterprise", price: "$99", bots: "50 bots", memory: "1GB" },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`relative overflow-hidden rounded-lg border bg-card p-6 ${
                  tier.popular ? "border-primary" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                    Popular
                  </div>
                )}
                <h3 className="font-bold">{tier.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {tier.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>{tier.bots}</li>
                  <li>{tier.memory} per bot</li>
                </ul>
                <Link href="/login">
                  <Button
                    className="mt-4 w-full"
                    variant={tier.popular ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              BotHost - Deploy bots with ease
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with Next.js and Coolify
          </p>
        </div>
      </footer>
    </div>
  );
}
