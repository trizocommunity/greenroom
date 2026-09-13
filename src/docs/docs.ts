import type { ComponentType } from "react";
import ContactOperators, {
  docMeta as contactOperatorsMeta,
} from "./articles/contact-operators.mdx";
import CustomSubdomain, {
  docMeta as customSubdomainMeta,
} from "./articles/custom-subdomain.mdx";
import DnsSetup, { docMeta as dnsSetupMeta } from "./articles/dns-setup.mdx";
import FestivalSetup, {
  docMeta as festivalSetupMeta,
} from "./articles/festival-setup.mdx";
import GettingStarted, {
  docMeta as gettingStartedMeta,
} from "./articles/getting-started.mdx";
import LaunchWebsite, {
  docMeta as launchWebsiteMeta,
} from "./articles/launch-website.mdx";
import Participants, {
  docMeta as participantsMeta,
} from "./articles/participants.mdx";
import Payments, { docMeta as paymentsMeta } from "./articles/payments.mdx";
import Programmes, {
  docMeta as programmesMeta,
} from "./articles/programmes.mdx";
import Results, { docMeta as resultsMeta } from "./articles/results.mdx";
import Schedule, { docMeta as scheduleMeta } from "./articles/schedule.mdx";
import StagePortal, {
  docMeta as stagePortalMeta,
} from "./articles/stage-portal.mdx";
import Troubleshooting, {
  docMeta as troubleshootingMeta,
} from "./articles/troubleshooting.mdx";

export type DocArticle = {
  slug: string;
  title: string;
  description: string;
  section: string;
  component: ComponentType;
};

export const docOrder = [
  "getting-started",
  "festival-setup",
  "launch-website",
  "dns-setup",
  "custom-subdomain",
  "participants",
  "programmes",
  "schedule",
  "stage-portal",
  "results",
  "payments",
  "troubleshooting",
  "contact-operators",
] as const;

const articles = {
  "getting-started": {
    component: GettingStarted,
    meta: gettingStartedMeta,
  },
  "festival-setup": {
    component: FestivalSetup,
    meta: festivalSetupMeta,
  },
  "launch-website": {
    component: LaunchWebsite,
    meta: launchWebsiteMeta,
  },
  "dns-setup": {
    component: DnsSetup,
    meta: dnsSetupMeta,
  },
  "custom-subdomain": {
    component: CustomSubdomain,
    meta: customSubdomainMeta,
  },
  participants: {
    component: Participants,
    meta: participantsMeta,
  },
  programmes: {
    component: Programmes,
    meta: programmesMeta,
  },
  schedule: {
    component: Schedule,
    meta: scheduleMeta,
  },
  "stage-portal": {
    component: StagePortal,
    meta: stagePortalMeta,
  },
  results: {
    component: Results,
    meta: resultsMeta,
  },
  payments: {
    component: Payments,
    meta: paymentsMeta,
  },
  troubleshooting: {
    component: Troubleshooting,
    meta: troubleshootingMeta,
  },
  "contact-operators": {
    component: ContactOperators,
    meta: contactOperatorsMeta,
  },
} satisfies Record<
  (typeof docOrder)[number],
  {
    component: ComponentType;
    meta?: {
      title?: string;
      description?: string;
      section?: string;
    };
  }
>;

export function getDocArticle(slug: string): DocArticle | null {
  if (!docOrder.includes(slug as (typeof docOrder)[number])) return null;
  const article = articles[slug as (typeof docOrder)[number]];

  if (!article) return null;
  return {
    slug,
    title: article.meta?.title ?? slug,
    description: article.meta?.description ?? "",
    section: article.meta?.section ?? "Guide",
    component: article.component,
  };
}

export function getAllDocArticles(): DocArticle[] {
  return docOrder
    .map((slug) => getDocArticle(slug))
    .filter((article): article is DocArticle => article !== null);
}

export function getDocsBySection() {
  const sections = new Map<string, DocArticle[]>();

  for (const article of getAllDocArticles()) {
    const items = sections.get(article.section) ?? [];
    items.push(article);
    sections.set(article.section, items);
  }

  return Array.from(sections.entries()).map(([section, articles]) => ({
    section,
    articles,
  }));
}
