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
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 p-6 shadow-2xl ring-1 ring-border/50">
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-black tracking-tight text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}
