export function GET() {
  return Response.json(
    { error: "Sunucu üzerinden bağlantı kontrolü veri gizliliği nedeniyle kapatıldı." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = GET;
