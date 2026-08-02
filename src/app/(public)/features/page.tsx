import type { Metadata } from "next";
import { FeatureIndex } from "@/components/features/FeatureIndex";
import CTASection from "@/components/home/CTASection";
import { PageHeader } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "Features | Greenroom",
  description:
    "Every module inside Greenroom — pre-event setup, stages and schedule, judging, results, the public site, and exports.",
};

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="What's inside"
        title={
          <>
            Six modules.{" "}
            <span className="font-display font-normal italic text-primary">
              One festival.
            </span>
          </>
        }
        lede="Greenroom is not a pile of settings. It is six modules that hand work to each other, in the order a festival actually happens."
      />

      <FeatureIndex />

      <CTASection />
    </>
  );
}
