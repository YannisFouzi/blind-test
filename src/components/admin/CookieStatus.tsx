'use client';

import { useState, useEffect } from "react";

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
      const response = await fetch('/api/admin/cookie-check');
      setStatus(await response.json());
    } catch {
      setStatus({ valid: false, message: "Erreur de vérification" });
    }
    setChecking(false);
  };

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.txt')) {
      setStatus({ valid: false, message: "Seuls les fichiers .txt sont acceptés" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cookies', file);

      const response = await fetch('/api/admin/upload-cookies', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        await checkStatus(); // Re-vérifier après upload
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
    e.target.value = ''; // Reset input
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

  return (
    <div className={`p-4 rounded-lg border-2 ${
      status?.valid ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            {status?.valid ? '🟢' : '🔴'} Cookies YouTube
          </h3>
          <p className="text-sm text-gray-300">{status?.message || "Vérification..."}</p>
          {status?.testVideo && (
            <p className="text-xs text-gray-400 mt-1">Test: {status.testVideo}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
          >
            {checking ? '...' : 'Vérifier'}
          </button>
        </div>
      </div>

      {!status?.valid && (
        <>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
            <a
              href="https://www.youtube.com/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
            >
              Ouvrir YouTube
            </a>

            <label className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm cursor-pointer text-white">
              {uploading ? 'Upload...' : 'Uploader cookies.txt'}
              <input
                type="file"
                accept=".txt"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Zone de drag & drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-3 p-6 border-2 border-dashed rounded-lg transition-all ${
              isDragging
                ? 'border-purple-400 bg-purple-900/30'
                : 'border-gray-600 bg-gray-800/30'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="text-center">
              <p className="text-sm text-gray-300">
                {isDragging ? '📂 Déposez le fichier ici' : '📄 Glissez-déposez cookies.txt ici'}
              </p>
              {uploading && (
                <p className="text-xs text-purple-400 mt-2">Upload en cours...</p>
              )}
            </div>
          </div>
        </>
      )}

      {!status?.valid && (
        <p className="text-xs text-gray-400 mt-3">
          1. Cliquer &quot;Ouvrir YouTube&quot; → 2. Se connecter (idéalement en incognito) →
          3. Exporter via extension &quot;Get cookies.txt LOCALLY&quot; → 4. Uploader ici
        </p>
      )}
    </div>
  );
};
