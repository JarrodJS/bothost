"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface EnvEditorProps {
  botId: string;
  envVars: EnvVar[];
}

export function EnvEditor({ botId, envVars: initialEnvVars }: EnvEditorProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>(initialEnvVars);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddEnvVar = async () => {
    if (!newKey.trim()) {
      toast({
        title: "Error",
        description: "Key is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envVars: { [newKey]: newValue },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add environment variable");
      }

      setEnvVars((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          key: newKey,
          value: isSecret ? "••••••••" : newValue,
          isSecret,
        },
      ]);

      setNewKey("");
      setNewValue("");
      setIsSecret(false);
      setShowAddDialog(false);

      toast({
        title: "Success",
        description: "Environment variable added",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add environment variable",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEnvVar = async (key: string) => {
    const newValue = editedValues[key];
    if (newValue === undefined) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envVars: { [key]: newValue },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update environment variable");
      }

      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      toast({
        title: "Success",
        description: "Environment variable updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update environment variable",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEnvVar = async (key: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}/env?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete environment variable");
      }

      setEnvVars((prev) => prev.filter((env) => env.key !== key));

      toast({
        title: "Success",
        description: "Environment variable deleted",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete environment variable",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Environment variables are encrypted at rest and injected into your bot
          at runtime.
        </p>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Variable
        </Button>
      </div>

      {envVars.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No environment variables configured
        </p>
      ) : (
        <div className="space-y-3">
          {envVars.map((env) => (
            <div
              key={env.id}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1 space-y-2">
                <Label className="font-mono text-sm">{env.key}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={env.isSecret && !visibleSecrets.has(env.key) ? "password" : "text"}
                    value={editedValues[env.key] ?? env.value}
                    onChange={(e) =>
                      setEditedValues((prev) => ({
                        ...prev,
                        [env.key]: e.target.value,
                      }))
                    }
                    className="font-mono"
                    placeholder={env.isSecret ? "Enter new value to update" : "Value"}
                  />
                  {env.isSecret && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSecretVisibility(env.key)}
                    >
                      {visibleSecrets.has(env.key) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editedValues[env.key] !== undefined && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleUpdateEnvVar(env.key)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEnvVar(env.key)}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Environment Variable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                placeholder="DISCORD_TOKEN"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type={isSecret ? "password" : "text"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter value"
                className="font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSecret"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isSecret" className="text-sm">
                This is a secret (token, password, etc.)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddEnvVar} disabled={isSaving}>
              {isSaving ? "Adding..." : "Add Variable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
