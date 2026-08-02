import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EMAIL_KIND_META,
  EMAIL_KINDS,
  type EmailKindName,
} from "@/core/integrations/email/types";
import { EmailPreferencesService } from "@/features/email-preferences/services/email-preferences.service";
import { EmailSettingsClient } from "./EmailSettingsClient";

export default async function EmailSettingsPage() {
  const enabled = await EmailPreferencesService.getAll();
  const items = EMAIL_KINDS.map((kind: EmailKindName) => ({
    kind,
    label: EMAIL_KIND_META[kind].label,
    description: EMAIL_KIND_META[kind].description,
    enabled: enabled[kind],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          Email settings
        </h2>
        <p className="text-muted-foreground">
          Globally enable or disable each kind of transactional email the
          platform sends. Disabled kinds are silently skipped at send time — the
          caller still receives a success result with{" "}
          <code className="text-xs">kindDisabled: true</code>.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Email kinds</CardTitle>
              <CardDescription>
                Each row is one transactional email kind. Toggle off to stop the
                platform from sending it. Default is on.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmailSettingsClient items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
