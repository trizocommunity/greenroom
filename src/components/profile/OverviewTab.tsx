import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CreateFestivalModal } from "./CreateFestivalModal";
import { PRICING_TIERS } from "@/config/pricing";
import { EditionTier } from "@prisma/client";

interface OverviewTabProps {
  displayName: string;
}

export function OverviewTab({ displayName }: OverviewTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const standardTier = PRICING_TIERS.find((t) => t.id === EditionTier.STANDARD);
  const basicTier = PRICING_TIERS.find((t) => t.id === EditionTier.BASIC);
  const proTier = PRICING_TIERS.find((t) => t.id === EditionTier.PRO);

  if (!standardTier || !basicTier || !proTier) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">
          Welcome back, {displayName}!
        </h2>
        <p className="text-muted-foreground">
          Ready to launch your next big event? Choose a plan below to get
          started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STANDARD PLAN - Full Width */}
        <Card className="md:col-span-2 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <Sparkles className="w-24 h-24 text-primary/10" />
          </div>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                  Most Popular
                </Badge>
                <CardTitle className="text-2xl md:text-3xl">
                  {standardTier.name} Plan
                </CardTitle>
                <CardDescription className="text-base mt-2 max-w-2xl">
                  {standardTier.description}
                </CardDescription>
              </div>
              <div className="hidden md:block text-right">
                <span className="text-3xl font-bold">
                  ${standardTier.price}
                </span>
                <span className="text-muted-foreground">/edition</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-2">
              {standardTier.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="flex items-end justify-end">
              <Button
                size="lg"
                className="w-full md:w-auto font-semibold shadow-lg shadow-primary/20"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Pay to Proceed
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BASIC PLAN */}
        <Card className="hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl">{basicTier.name} Plan</CardTitle>
            <CardDescription>{basicTier.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-2xl font-bold">
              ${basicTier.price}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /edition
              </span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {basicTier.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Pay to Proceed
            </Button>
          </CardContent>
        </Card>

        {/* PRO PLAN */}
        <Card className="hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl">{proTier.name} Plan</CardTitle>
            <CardDescription>{proTier.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-2xl font-bold">
              ${proTier.price}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /edition
              </span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {proTier.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Pay to Proceed
            </Button>
          </CardContent>
        </Card>
      </div>

      <CreateFestivalModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
