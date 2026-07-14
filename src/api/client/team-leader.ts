import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  RequestOtpInput,
  RequestOtpResponse,
  TeamLeaderLogoutResponse,
  VerifyOtpInput,
  VerifyOtpResponse,
} from "@/api/contracts/team-leader";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useTeamLeaderFestivals() {
  return useQuery<unknown>({
    queryKey: ["team-leader", "festivals"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/team-leader`);
      return handleResponse<unknown>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useTeamLeaderDashboard() {
  return useQuery<unknown>({
    queryKey: ["team-leader", "dashboard"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/team-leader/dashboard`);
      return handleResponse<unknown>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useTeamLeaderStudents() {
  return useQuery<unknown>({
    queryKey: ["team-leader", "students"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/team-leader/students`);
      return handleResponse<unknown>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useRequestOtp() {
  return useMutation<RequestOtpResponse, Error, RequestOtpInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/team-leader/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<RequestOtpResponse>(res);
    },
  });
}

export function useVerifyOtp() {
  return useMutation<VerifyOtpResponse, Error, VerifyOtpInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/team-leader/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<VerifyOtpResponse>(res);
    },
  });
}

export function useTeamLeaderLogout() {
  return useMutation<TeamLeaderLogoutResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/team-leader/logout`, {
        method: "POST",
      });
      return handleResponse<TeamLeaderLogoutResponse>(res);
    },
  });
}
