import type { RequestHandler } from "express";

const BEARER_PREFIX = "Bearer ";
const AUTH_BYPASS = process.env.INGESTION_REQUIRE_AUTH === "false";
const EXPECTED_TOKEN = process.env.INGESTION_SERVICE_TOKEN?.trim() ?? "";
let bypassWarningShown = false;

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const unauthorizedBody = {
  success: false,
  error: "Authentication required",
};

const forbiddenBody = {
  success: false,
  error: "Invalid token",
};

const misconfiguredBody = {
  success: false,
  error: "Ingestion auth misconfigured",
};

export const requireIngestionAuth: RequestHandler = (req, res, next) => {
  if (AUTH_BYPASS) {
    if (!bypassWarningShown) {
      bypassWarningShown = true;
      console.warn("[Auth] Ingestion auth disabled via INGESTION_REQUIRE_AUTH=false");
    }
    next();
    return;
  }

  if (!EXPECTED_TOKEN) {
    console.error("[Auth] Missing INGESTION_SERVICE_TOKEN while auth is enabled");
    res.status(500).json(misconfiguredBody);
    return;
  }

  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    res.status(401).json(unauthorizedBody);
    return;
  }

  const providedToken = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!providedToken) {
    res.status(401).json(unauthorizedBody);
    return;
  }

  if (!timingSafeEqual(providedToken, EXPECTED_TOKEN)) {
    res.status(403).json(forbiddenBody);
    return;
  }

  next();
};
