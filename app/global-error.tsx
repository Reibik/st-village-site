"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: "#0b0f14", color: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(100%, 560px)", padding: 32, border: "1px solid rgba(148,163,184,.2)", borderRadius: 24, background: "#111827", textAlign: "center" }}>
            <strong style={{ color: "#38bdf8", letterSpacing: ".12em" }}>ST VILLAGE</strong>
            <h1 style={{ margin: "18px 0 10px", fontSize: 34 }}>Сайт временно недоступен</h1>
            <p style={{ margin: "0 0 24px", color: "#94a3b8", lineHeight: 1.65 }}>Мы уже скрыли технические детали. Попробуйте загрузить страницу ещё раз.</p>
            <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 22px", border: 0, borderRadius: 12, background: "#38bdf8", color: "#04111d", font: "inherit", fontWeight: 800, cursor: "pointer" }}>Повторить</button>
          </section>
        </main>
      </body>
    </html>
  );
}
