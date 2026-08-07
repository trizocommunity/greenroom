import axios from "axios";
import "client-only";

const baseURL =
  typeof window === "undefined"
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1`
    : "/api/v1";

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: {
    message: string;
    code?: string;
  };
}

export async function handleApiResponse<T>(
  response: ApiResponse<T>,
): Promise<T> {
  if (!response.success) {
    throw new Error(response.error.message);
  }
  return response.data;
}

async function handleRes(res: Response) {
  const contentType = res.headers.get("content-type");
  const body = contentType?.includes("application/json")
    ? await res.json()
    : { error: await res.text() };
  if (!res.ok) throw { status: res.status, body };
  return { status: res.status, body };
}

const noBaseURL = baseURL.replace("/api/v1", "");

export const api = {
  auth: {
    completePersonalOnboarding: async (data: {
      fullName: string;
      displayName: string;
      userRole: string;
    }) => {
      const res = await fetch(`${noBaseURL}/api/v1/onboarding/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return handleRes(res);
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
      const res = await fetch(`${noBaseURL}/api/v1/onboarding/institutional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return handleRes(res);
    },
  },
  invitations: {
    create: async (data: {
      email: string;
      festivalId: string;
      festivalRole: string;
      stageIds?: string[];
    }) => {
      const res = await fetch(`${noBaseURL}/api/v1/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return handleRes(res);
    },
    accept: async (data: { token: string }) => {
      const res = await fetch(`${noBaseURL}/api/v1/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return handleRes(res);
    },
    list: async (festivalId: string) => {
      const res = await fetch(
        `${noBaseURL}/api/v1/invitations?festivalId=${festivalId}`,
        { credentials: "include" },
      );
      return handleRes(res);
    },
    cancel: async (data: { invitationId: string }) => {
      const res = await fetch(
        `${noBaseURL}/api/v1/invitations/${data.invitationId}`,
        { method: "DELETE", credentials: "include" },
      );
      return handleRes(res);
    },
    resend: async (data: { invitationId: string }) => {
      const res = await fetch(
        `${noBaseURL}/api/v1/invitations/${data.invitationId}/resend`,
        { method: "POST", credentials: "include" },
      );
      return handleRes(res);
    },
    details: async (token: string) => {
      const res = await fetch(`${noBaseURL}/api/v1/invitations/${token}`, {
        credentials: "include",
      });
      return handleRes(res);
    },
  },
};
