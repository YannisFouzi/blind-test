"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "bg-slate-900 text-white border border-slate-800",
        },
      }}
    />
  );
}
