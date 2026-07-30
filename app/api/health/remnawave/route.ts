import { collectStatus } from "@/src/server/status/collector";

export async function GET() {
  const snapshot = await collectStatus();
  const remnawave = snapshot.services.find((service) => service.id === "remnawave");
  const available = remnawave?.status === "operational";
  return Response.json(
    {
      status: available ? "ok" : "unavailable",
      dependency: "remnawave",
      message: remnawave?.message ?? "Интеграция Remnawave не настроена",
    },
    { status: available ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
