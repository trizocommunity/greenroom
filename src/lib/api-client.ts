import "client-only";

const baseUrl =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    : "";

export const api = {
  auth: {
    login: async (data: { email: string; password: string }) => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
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
    register: async (data: { email: string; password: string }) => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
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
    logout: async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
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
    forgotPassword: async (data: { email: string }) => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
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
    resetPassword: async (data: {
      token: string;
      password: string;
      confirmPassword: string;
    }) => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
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
};
