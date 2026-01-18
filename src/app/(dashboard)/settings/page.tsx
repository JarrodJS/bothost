import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";
import { formatDate } from "@/lib/date";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: true,
      subscription: true,
    },
  });

  if (!user) redirect("/login");

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0].toUpperCase() ?? "U";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and connected services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Member since</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Subscription</span>
              <Badge
                variant={
                  user.subscription?.tier === "FREE" ? "secondary" : "default"
                }
              >
                {user.subscription?.tier ?? "FREE"}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">User ID</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {user.id}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your linked OAuth providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedAccounts accounts={user.accounts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-destructive/50 rounded-lg">
            <h4 className="font-medium text-destructive">Delete Account</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Once you delete your account, there is no going back. All your
              bots and data will be permanently deleted.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact support at support@bothost.app to delete your account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
