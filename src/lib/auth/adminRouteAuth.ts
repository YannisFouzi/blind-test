import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const BEARER_PREFIX = "Bearer ";
const DEFAULT_ADMIN_EMAIL = "yfouzi.dev@gmail.com";
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ||
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  DEFAULT_ADMIN_EMAIL;

const isAdminToken = (decodedToken: DecodedIdToken) => {
  const byClaim =
    decodedToken.admin === true ||
    decodedToken.role === "admin";
  const byEmail =
    typeof decodedToken.email === "string" &&
    decodedToken.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return byClaim || byEmail;
};

type AdminAuthResult =
  | { ok: true; token: DecodedIdToken }
  | { ok: false; response: NextResponse };

const unauthorized = () =>
  NextResponse.json(
    { success: false, error: "Authentication required" },
    { status: 401 }
  );

const forbidden = () =>
  NextResponse.json(
    { success: false, error: "Admin access required" },
    { status: 403 }
  );

export const requireAdminFromRequest = async (
  request: Request
): Promise<AdminAuthResult> => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    return { ok: false, response: unauthorized() };
  }

  const idToken = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!idToken) {
    return { ok: false, response: unauthorized() };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!isAdminToken(decodedToken)) {
      return { ok: false, response: forbidden() };
    }
    return { ok: true, token: decodedToken };
  } catch (error) {
    console.warn("[AdminAuth] Invalid token:", error);
    return { ok: false, response: unauthorized() };
  }
};
