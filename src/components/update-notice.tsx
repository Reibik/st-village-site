"use client";

import { useEffect, useState } from "react";

const currentVersion = __ST_VILLAGE_BUILD_VERSION__;
const checkIntervalMs = 60_000;

type VersionResponse = {
  updateAvailable?: boolean;
};

export function UpdateNotice() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function checkForUpdate() {
      try {
        const response = await fetch(
          `/api/version?current=${encodeURIComponent(currentVersion)}&t=${Date.now()}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const payload = (await response.json()) as VersionResponse;
        if (!disposed && payload.updateAvailable === true) {
          setUpdateAvailable(true);
        }
      } catch {
        // A failed background check must never interrupt the site.
      }
    }

    function checkWhenVisible() {
      if (document.visibilityState === "visible") void checkForUpdate();
    }

    void checkForUpdate();
    const interval = window.setInterval(checkForUpdate, checkIntervalMs);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside className="update-notice" role="status" aria-live="polite" aria-label="Доступно обновление сайта">
      <span className="update-notice-icon" aria-hidden="true">↻</span>
      <div className="update-notice-copy">
        <strong>Сайт обновился</strong>
        <span>Доступна новая версия.</span>
      </div>
      <button className="update-notice-button" type="button" onClick={() => window.location.reload()}>
        Обновить
      </button>
    </aside>
  );
}
