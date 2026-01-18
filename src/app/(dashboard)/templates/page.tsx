import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, LayoutTemplate } from "lucide-react";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const templates = [
    {
      id: "discord-basic",
      name: "Discord Basic Bot",
      description: "A simple Discord bot with slash commands and event handlers",
      platform: "DISCORD",
      runtime: "NODEJS_20",
      features: ["Slash commands", "Event handling", "Embed messages"],
      comingSoon: true,
    },
    {
      id: "discord-moderation",
      name: "Discord Moderation Bot",
      description: "A moderation bot with kick, ban, warn, and auto-mod features",
      platform: "DISCORD",
      runtime: "NODEJS_20",
      features: ["Auto-mod", "Kick/Ban", "Warning system", "Logging"],
      comingSoon: true,
    },
    {
      id: "telegram-basic",
      name: "Telegram Basic Bot",
      description: "A simple Telegram bot with command handlers",
      platform: "TELEGRAM",
      runtime: "PYTHON_311",
      features: ["Commands", "Inline keyboards", "Message handling"],
      comingSoon: true,
    },
    {
      id: "discord-music",
      name: "Discord Music Bot",
      description: "Stream music from YouTube and Spotify in voice channels",
      platform: "DISCORD",
      runtime: "NODEJS_20",
      features: ["YouTube", "Spotify", "Queue system", "Volume control"],
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bot Templates</h1>
        <p className="text-muted-foreground">
          Start quickly with pre-built bot templates
        </p>
      </div>

      <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
        <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Templates are coming soon! For now, you can create bots from GitHub
          repositories or file uploads.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="opacity-60 cursor-not-allowed"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  {template.name}
                </CardTitle>
                {template.comingSoon && (
                  <Badge variant="secondary">Coming Soon</Badge>
                )}
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{template.platform}</Badge>
                <Badge variant="outline">{template.runtime.replace("_", " ")}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {template.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
