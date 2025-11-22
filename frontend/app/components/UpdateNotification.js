'use client';

import { useState, useEffect } from 'react';

export default function UpdateNotification() {
  const [appVersion, setAppVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [isDev, setIsDev] = useState(false);

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electron?.updater;

  useEffect(() => {
    if (!isElectron) return;

    // Get current version
    window.electron.updater.getVersion().then(data => {
      setAppVersion(data.version);
      setIsDev(data.isDev);
    });

    // Listen for update events
    window.electron.updater.onUpdateAvailable((data) => {
      console.log('[UpdateNotification] Update available:', data);
      setUpdateAvailable(true);
      setUpdateInfo(data);
      setChecking(false);
    });

    window.electron.updater.onUpdateNotAvailable(() => {
      console.log('[UpdateNotification] No updates available');
      setChecking(false);
    });

    window.electron.updater.onUpdateDownloadProgress((data) => {
      console.log('[UpdateNotification] Download progress:', data.percent);
      setDownloading(true);
      setDownloadProgress(data.percent);
    });

    window.electron.updater.onUpdateDownloaded((data) => {
      console.log('[UpdateNotification] Update downloaded:', data);
      setDownloading(false);
      setUpdateDownloaded(true);
    });

    window.electron.updater.onUpdateError((data) => {
      console.error('[UpdateNotification] Update error:', data);
      setError(data.message);
      setChecking(false);
      setDownloading(false);
    });
  }, [isElectron]);

  const checkForUpdates = async () => {
    if (!isElectron) return;

    setChecking(true);
    setError(null);

    try {
      const result = await window.electron.updater.checkForUpdates();
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const downloadUpdate = async () => {
    if (!isElectron) return;

    setDownloading(true);
    setError(null);

    try {
      const result = await window.electron.updater.downloadUpdate();
      if (!result.success) {
        setError(result.message);
        setDownloading(false);
      }
    } catch (err) {
      setError(err.message);
      setDownloading(false);
    }
  };

  const installUpdate = async () => {
    if (!isElectron) return;

    try {
      await window.electron.updater.installUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  // Don't show anything if not in Electron or in dev mode
  if (!isElectron || isDev) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Version Display */}
      <div className="mb-2 text-right">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          v{appVersion}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg mb-2 max-w-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Update Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-700 hover:text-red-900"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Update Downloaded - Ready to Install */}
      {updateDownloaded && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start mb-3">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Update Ready</p>
              <p className="text-sm">Version {updateInfo?.version} has been downloaded.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={installUpdate}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Install & Restart
            </button>
            <button
              onClick={() => setUpdateDownloaded(false)}
              className="px-4 py-2 text-green-800 hover:bg-green-200 rounded transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Downloading Update */}
      {downloading && !updateDownloaded && (
        <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start mb-2">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Downloading Update</p>
              <p className="text-sm">Version {updateInfo?.version}</p>
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-1">{Math.round(downloadProgress)}%</p>
        </div>
      )}

      {/* Update Available */}
      {updateAvailable && !downloading && !updateDownloaded && (
        <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start mb-3">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Update Available</p>
              <p className="text-sm">Version {updateInfo?.version} is available.</p>
              {updateInfo?.releaseNotes && (
                <p className="text-xs mt-1 text-blue-700">
                  {updateInfo.releaseNotes.substring(0, 100)}...
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadUpdate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Download Update
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="px-4 py-2 text-blue-800 hover:bg-blue-200 rounded transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Check for Updates Button */}
      {!updateAvailable && !downloading && !updateDownloaded && !checking && (
        <button
          onClick={checkForUpdates}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-lg text-sm transition-colors border border-gray-300"
        >
          Check for Updates
        </button>
      )}

      {/* Checking for Updates */}
      {checking && (
        <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Checking for updates...</span>
          </div>
        </div>
      )}
    </div>
  );
}
