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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    e.target.value = ''; // Reset input
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
      )}

      {!status?.valid && (
        <p className="text-xs text-gray-400 mt-3">
          1. Cliquer "Ouvrir YouTube" → 2. Se connecter (idéalement en incognito) →
          3. Exporter via extension "Get cookies.txt LOCALLY" → 4. Uploader ici
        </p>
      )}
    </div>
  );
};
