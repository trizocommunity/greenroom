"use client";

interface AdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function AdminEmptyState({
  icon,
  title,
  description,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-500">
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-premium">
        {icon}
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
