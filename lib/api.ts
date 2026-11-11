"use client";

import type { DrawElement } from "@/lib/drawing";

// Same-origin by default: next.config.mjs proxies /api/* to the backend.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type ApiUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type RoomAccess = {
  roomId: string;
  isOwner: boolean;
  isPrivate: boolean;
  hasAccess: boolean;
  accessVersion: number;
  token: string | null;
};

export type RecentRoom = {
  id: string;
  visitedAt: string;
  isPrivate: boolean;
  elements: DrawElement[];
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new ApiError(data.error ?? "Something went wrong.", response.status);
  return data;
}

export const api = {
  session: () => request<{ user: ApiUser | null }>("/api/auth/session"),
  register: (values: { name: string; email: string; password: string }) =>
    request<{ user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
    }),
  signIn: (values: { email: string; password: string }) =>
    request<{ user: ApiUser }>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify(values),
    }),
  signOut: () => request<void>("/api/auth/signout", { method: "POST" }),
  recentRooms: () => request<{ rooms: RecentRoom[] }>("/api/rooms/recent"),
  createRoom: (password?: string) =>
    request<{ roomId: string }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(password === undefined ? {} : { password }),
    }),
  roomAccess: (roomId: string) => request<RoomAccess>(`/api/rooms/${roomId}/access`),
  unlockRoom: (roomId: string, password: string) =>
    request<{ roomId: string }>(`/api/rooms/${roomId}/unlock`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  updateRoomPrivacy: (roomId: string, password: string | null) =>
    request<{ roomId: string }>(`/api/rooms/${roomId}/privacy`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    }),
};

export const googleSignInUrl = () => `${API_URL}/api/auth/google`;
