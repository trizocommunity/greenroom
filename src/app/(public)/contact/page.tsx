import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import { PageHeader, Section } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Greenroom team to set up your next cultural festival, competition, or arts fest using our paperless management software.",
};

const CHANNELS = [
  {
    label: "Email",
    value: "support@greenroom.com",
    href: "mailto:support@greenroom.com",
  },
  { label: "Phone", value: "+91 98470 00000", href: "tel:+919847000000" },
  { label: "Support hours", value: "Mon–Sat, 9:00 – 19:00 IST" },
  { label: "Response time", value: "Within one business day" },
];

const ASK = [
  "What kind of festival it is, and roughly how many participants",
  "How your scoring works — grades, points, or both",
  "Whether you need stages and a schedule, or just results",
  "When it runs",
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title={
          <>
            Tell us what you&apos;re{" "}
            <span className="font-display font-normal italic text-primary">
              running.
            </span>
          </>
        }
        lede="The more we know about the format, the faster we can tell you whether Greenroom fits — and what setting it up would look like."
      />

      <Section className="py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <dl className="divide-y divide-border border-y border-border">
              {CHANNELS.map((channel) => (
                <div
                  key={channel.label}
                  className="flex items-baseline justify-between gap-4 py-4"
                >
                  <dt className="text-sm text-muted-foreground">
                    {channel.label}
                  </dt>
                  <dd className="text-right text-[15px] font-medium text-heading">
                    {channel.href ? (
                      <a
                        href={channel.href}
                        className="transition-colors hover:text-primary"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      channel.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Helpful to include
              </h2>
              <ul className="space-y-2.5">
                {ASK.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-10 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
