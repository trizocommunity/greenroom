"use client";

export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const nonce = document.cookie.match(/_csrf_nonce=([^;]+)/)?.[1];
  const sig = document.cookie.match(/_csrf_sig=([^;]+)/)?.[1];

  const headers = new Headers(init?.headers);
  if (nonce) headers.set("x-csrf-nonce", nonce);
  if (sig) headers.set("x-csrf-signature", sig);

  return fetch(input, { ...init, headers });
}
