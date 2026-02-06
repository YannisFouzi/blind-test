"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { pressable } from "@/styles/ui";

type CookieStatusData = {
  valid: boolean;
  message: string;
  testVideo?: string;
};

const STATUS_REFRESH_LABEL = "Verifier";
const STATUS_REFRESHING_LABEL = "...";
const UPLOAD_LABEL = "Uploader cookies.txt";
const UPLOAD_IN_PROGRESS_LABEL = "Upload...";
const FILE_TYPE_ERROR = "Seuls les fichiers .txt sont acceptes";
const GENERIC_UPLOAD_ERROR = "Erreur upload";
const GENERIC_CHECK_ERROR = "Erreur de verification";
const AUTH_REQUIRED_ERROR = "Connexion admin requise";
const INITIAL_STATUS = "Verification...";
const DROPZONE_IDLE_TEXT = "Glissez-deposez cookies.txt ici";
const DROPZONE_ACTIVE_TEXT = "Deposez le fichier ici";
const UPLOAD_PROGRESS_TEXT = "Upload en cours...";
const STEPS_TEXT =
  '1. Cliquer "Ouvrir YouTube" -> 2. Se connecter (idealement en incognito) -> 3. Exporter via extension "Get cookies.txt LOCALLY" -> 4. Uploader ici';

export const CookieStatus = () => {
  const [status, setStatus] = useState<CookieStatusData | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const actionButtonClassName = useMemo(
    () =>
      `px-3 py-2 text-sm font-bold bg-white hover:bg-[var(--color-surface-overlay)] ${pressable}`,
    []
  );

  const getAuthorizationHeader = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error(AUTH_REQUIRED_ERROR);
    }
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const headers = await getAuthorizationHeader();
      const response = await fetch("/api/admin/cookie-check", { headers });
      const data = await response.json();
      setStatus(
        response.ok
          ? data
          : { valid: false, message: data.error || GENERIC_CHECK_ERROR }
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === AUTH_REQUIRED_ERROR
          ? AUTH_REQUIRED_ERROR
          : GENERIC_CHECK_ERROR;
      setStatus({ valid: false, message });
    }
    setChecking(false);
  }, [getAuthorizationHeader]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".txt")) {
        setStatus({ valid: false, message: FILE_TYPE_ERROR });
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("cookies", file);
        const headers = await getAuthorizationHeader();

        const response = await fetch("/api/admin/upload-cookies", {
          method: "POST",
          body: formData,
          headers,
        });

        const result = await response.json();
        if (result.success) {
          await checkStatus();
        } else {
          setStatus({ valid: false, message: result.error || GENERIC_UPLOAD_ERROR });
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message === AUTH_REQUIRED_ERROR
            ? AUTH_REQUIRED_ERROR
            : GENERIC_UPLOAD_ERROR;
        setStatus({ valid: false, message });
      }
      setUploading(false);
    },
    [checkStatus, getAuthorizationHeader]
  );

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await uploadFile(file);
      event.target.value = "";
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        await uploadFile(file);
      }
    },
    [uploadFile]
  );

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const buttonLabel = checking ? STATUS_REFRESHING_LABEL : STATUS_REFRESH_LABEL;
  const uploaderLabel = uploading ? UPLOAD_IN_PROGRESS_LABEL : UPLOAD_LABEL;
  const isValid = status?.valid ?? false;
  const statusMessage = status?.message || INITIAL_STATUS;

  return (
    <div
      className={`p-4 rounded-2xl border-[3px] border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B] ${
        isValid ? "bg-[#ECFDF5]" : "bg-[#FEE2E2]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-extrabold text-[#1B1B1B] flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border-2 border-[#1B1B1B] bg-white px-2 py-0.5 text-xs font-bold">
              {isValid ? "OK" : "KO"}
            </span>
            Cookies YouTube
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{statusMessage}</p>
          {status?.testVideo && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Test: {status.testVideo}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={checkStatus} disabled={checking} className={actionButtonClassName}>
            {buttonLabel}
          </button>
        </div>
      </div>

      {!isValid && (
        <>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t-2 border-[#1B1B1B]/30">
            <a
              href="https://www.youtube.com/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className={actionButtonClassName}
            >
              Ouvrir YouTube
            </a>

            <label className={`${actionButtonClassName} cursor-pointer`}>
              {uploaderLabel}
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
                {isDragging ? DROPZONE_ACTIVE_TEXT : DROPZONE_IDLE_TEXT}
              </p>
              {uploading && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  {UPLOAD_PROGRESS_TEXT}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {!isValid && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">{STEPS_TEXT}</p>
      )}
    </div>
  );
};
