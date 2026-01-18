import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateBotWizard } from "@/components/bots/create-bot-wizard";

export default async function NewBotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Bot</h1>
        <p className="text-muted-foreground mt-2">
          Deploy a Discord or Telegram bot in just a few steps.
        </p>
      </div>
      <CreateBotWizard />
    </div>
  );
}
