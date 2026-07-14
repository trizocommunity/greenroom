import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  LoginInput,
  LoginResponse,
  LogoutResponse,
  RegisterInput,
  User,
} from "@/api/contracts/auth";
import { loginInput, registerInput } from "@/api/contracts/auth";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/auth?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<LoginResponse>(res);
    },
  });
}

export function useRegister() {
  return useMutation<User, Error, RegisterInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/auth?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse<User>(res);
    },
  });
}

export function useLogout() {
  return useMutation<LogoutResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/auth?action=logout`, {
        method: "POST",
      });
      return handleResponse<LogoutResponse>(res);
    },
  });
}

export function useMe() {
  return useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth`);
      return handleResponse<User>(res);
    },
    staleTime: 30 * 1000,
  });
}
