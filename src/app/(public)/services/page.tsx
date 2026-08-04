import type { Metadata } from "next";
import CTASection from "@/components/home/CTASection";
import { PageHeader } from "@/components/layout/Section";
import { ServiceList } from "@/components/services/ServiceList";

export const metadata: Metadata = {
  title: "Services | Greenroom",
  description:
    "Everything Greenroom does for a festival — from onboarding your participant list to publishing results and certificates.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="What we do"
        title={
          <>
            The whole festival,{" "}
            <span className="font-display font-normal italic text-primary">
              end to end.
            </span>
          </>
        }
        lede="Not a scoring calculator bolted onto a website. Greenroom covers the work from the first participant list to the last certificate."
      />

      <ServiceList />

      <CTASection />
    </>
  );
}
