import { Mail } from "lucide-react";

export default function EmailSettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          Email settings
        </h2>
        <p className="text-muted-foreground">Loading…</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        <Mail className="w-6 h-6 mx-auto mb-2 opacity-50" />
        Loading email settings…
      </div>
    </div>
  );
}
