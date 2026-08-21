import type { Metadata } from "next";
import CTASection from "@/components/home/CTASection";
import { PageHeader } from "@/components/layout/Section";
import { ServiceList } from "@/components/services/ServiceList";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Discover the end-to-end festival management services offered by Greenroom, from scheduling and scoring to publishing live results and automated certificates.",
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
