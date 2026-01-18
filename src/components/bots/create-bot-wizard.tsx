"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Github, Upload, LayoutTemplate, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DeploymentSource = "GITHUB" | "UPLOAD" | "TEMPLATE";
type BotPlatform = "DISCORD" | "TELEGRAM";
type BotRuntime = "NODEJS_20" | "NODEJS_18" | "PYTHON_311" | "PYTHON_310";

interface BotFormData {
  name: string;
  description: string;
  platform: BotPlatform;
  runtime: BotRuntime;
  source: DeploymentSource;
  githubRepo: string;
  githubBranch: string;
  envVars: { key: string; value: string }[];
}

const sourceOptions = [
  {
    id: "GITHUB" as const,
    title: "GitHub Repository",
    description: "Connect your GitHub repo for automatic deployments",
    icon: Github,
  },
  {
    id: "UPLOAD" as const,
    title: "File Upload",
    description: "Upload a ZIP file containing your bot code",
    icon: Upload,
  },
  {
    id: "TEMPLATE" as const,
    title: "Template",
    description: "Start from a pre-built bot template",
    icon: LayoutTemplate,
    disabled: true,
  },
];

const platformOptions = [
  { value: "DISCORD", label: "Discord" },
  { value: "TELEGRAM", label: "Telegram" },
];

const runtimeOptions = [
  { value: "NODEJS_20", label: "Node.js 20" },
  { value: "NODEJS_18", label: "Node.js 18" },
  { value: "PYTHON_311", label: "Python 3.11" },
  { value: "PYTHON_310", label: "Python 3.10" },
];

export function CreateBotWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BotFormData>({
    name: "",
    description: "",
    platform: "DISCORD",
    runtime: "NODEJS_20",
    source: "GITHUB",
    githubRepo: "",
    githubBranch: "main",
    envVars: [{ key: "", value: "" }],
  });

  const updateFormData = <K extends keyof BotFormData>(
    key: K,
    value: BotFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addEnvVar = () => {
    setFormData((prev) => ({
      ...prev,
      envVars: [...prev.envVars, { key: "", value: "" }],
    }));
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    setFormData((prev) => ({
      ...prev,
      envVars: prev.envVars.map((env, i) =>
        i === index ? { ...env, [field]: value } : env
      ),
    }));
  };

  const removeEnvVar = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      envVars: prev.envVars.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Bot name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.source === "GITHUB" && !formData.githubRepo.trim()) {
      toast({
        title: "Error",
        description: "GitHub repository is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert envVars array to object
      const envVarsObject = formData.envVars
        .filter((env) => env.key.trim())
        .reduce(
          (acc, env) => ({ ...acc, [env.key]: env.value }),
          {} as Record<string, string>
        );

      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          platform: formData.platform,
          runtime: formData.runtime,
          source: formData.source,
          githubRepo: formData.source === "GITHUB" ? formData.githubRepo : undefined,
          githubBranch: formData.source === "GITHUB" ? formData.githubBranch : undefined,
          envVars: Object.keys(envVarsObject).length > 0 ? envVarsObject : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Failed to create bot");
      }

      const bot = await res.json();

      toast({
        title: "Success",
        description: "Bot created successfully",
      });

      router.push(`/bots/${bot.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bot",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={cn(
                  "w-24 h-1 mx-2",
                  step > s ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose deployment source */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Deployment Source</h2>
          <div className="grid gap-4">
            {sourceOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    formData.source === option.id && "border-primary",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() =>
                    !option.disabled && updateFormData("source", option.id)
                  }
                >
                  <CardHeader className="flex flex-row items-center gap-4 p-4">
                    <Icon className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        {option.title}
                        {option.disabled && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Coming Soon)
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{option.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Bot details */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Bot Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bot Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="My Awesome Bot"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                placeholder="A brief description of what your bot does"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => updateFormData("platform", v as BotPlatform)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platformOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Runtime</Label>
                <Select
                  value={formData.runtime}
                  onValueChange={(v) => updateFormData("runtime", v as BotRuntime)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {runtimeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.source === "GITHUB" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="githubRepo">GitHub Repository</Label>
                  <Input
                    id="githubRepo"
                    value={formData.githubRepo}
                    onChange={(e) => updateFormData("githubRepo", e.target.value)}
                    placeholder="username/repository"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter in the format: owner/repo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="githubBranch">Branch</Label>
                  <Input
                    id="githubBranch"
                    value={formData.githubBranch}
                    onChange={(e) => updateFormData("githubBranch", e.target.value)}
                    placeholder="main"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Environment variables */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Environment Variables</h2>
          <p className="text-sm text-muted-foreground">
            Add any environment variables your bot needs (e.g., DISCORD_TOKEN, API_KEYS).
            These will be encrypted and securely stored.
          </p>

          <div className="space-y-3">
            {formData.envVars.map((env, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={env.key}
                  onChange={(e) => updateEnvVar(index, "key", e.target.value.toUpperCase())}
                  placeholder="KEY"
                  className="font-mono flex-1"
                />
                <Input
                  type="password"
                  value={env.value}
                  onChange={(e) => updateEnvVar(index, "value", e.target.value)}
                  placeholder="Value"
                  className="font-mono flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEnvVar(index)}
                  disabled={formData.envVars.length === 1}
                >
                  &times;
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addEnvVar}>
              Add Variable
            </Button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Bot"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
