"use client";

import { useState, useEffect } from "react";
import { pressable } from "@/styles/ui";

interface CookieStatusData {
  valid: boolean;
  message: string;
  testVideo?: string;
}

export const CookieStatus = () => {
  const [status, setStatus] = useState<CookieStatusData | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/admin/cookie-check");
      setStatus(await response.json());
    } catch {
      setStatus({ valid: false, message: "Erreur de verification" });
    }
    setChecking(false);
  };

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith(".txt")) {
      setStatus({ valid: false, message: "Seuls les fichiers .txt sont acceptes" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("cookies", file);

      const response = await fetch("/api/admin/upload-cookies", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        await checkStatus();
      } else {
        setStatus({ valid: false, message: result.error || "Erreur upload" });
      }
    } catch {
      setStatus({ valid: false, message: "Erreur upload" });
    }
    setUploading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const actionButton =
    `px-3 py-2 text-sm font-bold bg-white hover:bg-[var(--color-surface-overlay)] ${pressable}`;

  return (
    <div
      className={`p-4 rounded-2xl border-[3px] border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B] ${
        status?.valid ? "bg-[#ECFDF5]" : "bg-[#FEE2E2]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-extrabold text-[#1B1B1B] flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border-2 border-[#1B1B1B] bg-white px-2 py-0.5 text-xs font-bold">
              {status?.valid ? "OK" : "KO"}
            </span>
            Cookies YouTube
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {status?.message || "Verification..."}
          </p>
          {status?.testVideo && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Test: {status.testVideo}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={checkStatus} disabled={checking} className={actionButton}>
            {checking ? "..." : "Verifier"}
          </button>
        </div>
      </div>

      {!status?.valid && (
        <>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t-2 border-[#1B1B1B]/30">
            <a
              href="https://www.youtube.com/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className={actionButton}
            >
              Ouvrir YouTube
            </a>

            <label className={`${actionButton} cursor-pointer`}>
              {uploading ? "Upload..." : "Uploader cookies.txt"}
              <input
                type="file"
                accept=".txt"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-3 p-6 border-2 border-dashed rounded-2xl transition-all ${
              isDragging
                ? "border-[#1B1B1B] bg-[#FFF1C9]"
                : "border-[#1B1B1B]/40 bg-white/70"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {isDragging
                  ? "Deposez le fichier ici"
                  : "Glissez-deposez cookies.txt ici"}
              </p>
              {uploading && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  Upload en cours...
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {!status?.valid && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          1. Cliquer &quot;Ouvrir YouTube&quot; -&gt; 2. Se connecter (idealement en incognito) -&gt;
          3. Exporter via extension &quot;Get cookies.txt LOCALLY&quot; -&gt; 4. Uploader ici
        </p>
      )}
    </div>
  );
};
