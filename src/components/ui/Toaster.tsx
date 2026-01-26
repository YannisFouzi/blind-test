"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "bg-white text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B] rounded-2xl",
        },
      }}
    />
  );
}
