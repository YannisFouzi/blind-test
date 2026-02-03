"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

export const navigateToUrl = (url: string, onBeforeNavigate?: () => void) => {
  if (onBeforeNavigate) {
    onBeforeNavigate();
  }
  setTimeout(() => {
    window.location.href = url;
  }, 0);
};

export const useGameNavigation = () => {
  const router = useRouter();

  const navigate = useCallback(
    (url: string, onBeforeNavigate?: () => void) => {
      if (onBeforeNavigate) {
        onBeforeNavigate();
      }
      router.push(url);
    },
    [router]
  );

  return useMemo(() => ({ navigate }), [navigate]);
};
