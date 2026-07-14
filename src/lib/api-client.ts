import "client-only";

const baseUrl =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    : "";

export const api = {
  auth: {
    logout: async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth?action=logout`, {
        method: "POST",
        credentials: "include",
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    me: async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        credentials: "include",
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    sendMagicLink: async (data: { email: string }) => {
      const res = await fetch(`${baseUrl}/api/v1/auth?action=magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    verifyMagicLink: async (data: { token: string }) => {
      const res = await fetch(
        `${baseUrl}/api/v1/auth?action=verify-magic-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        },
      );
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    v1Me: async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth`, {
        credentials: "include",
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    v1Logout: async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth?action=logout`, {
        method: "POST",
        credentials: "include",
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    completePersonalOnboarding: async (data: {
      fullName: string;
      displayName: string;
      userRole: string;
    }) => {
      const res = await fetch(`${baseUrl}/api/v1/onboarding/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    completeInstitutionalOnboarding: async (data: {
      fullName: string;
      displayName: string;
      userRole: string;
      institutionName: string;
      institutionType: string;
      affiliation?: string | null;
      city?: string | null;
      sizeRange?: string | null;
    }) => {
      const res = await fetch(`${baseUrl}/api/v1/onboarding/institutional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    completeOnboarding: async (data: {
      fullName: string;
      displayName: string;
    }) => {
      const res = await fetch(`${baseUrl}/api/auth/complete-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
  },
  invitations: {
    create: async (data: {
      email: string;
      festivalId: string;
      festivalRole: string;
    }) => {
      const res = await fetch(`${baseUrl}/api/v1/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    accept: async (data: { token: string }) => {
      const res = await fetch(`${baseUrl}/api/v1/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    list: async (festivalId: string) => {
      const res = await fetch(
        `${baseUrl}/api/v1/invitations?festivalId=${festivalId}`,
        {
          credentials: "include",
        },
      );
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    cancel: async (data: { invitationId: string }) => {
      const res = await fetch(
        `${baseUrl}/api/v1/invitations/${data.invitationId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
    details: async (token: string) => {
      const res = await fetch(`${baseUrl}/api/v1/invitations/${token}`, {
        credentials: "include",
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) throw { status: res.status, body };
      return { status: res.status, body };
    },
  },
};
