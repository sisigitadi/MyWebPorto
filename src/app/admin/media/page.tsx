import { Images } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMedia } from "@/lib/local-upload";
import { MediaList } from "@/components/admin/media-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaPage() {
  const { items, error } = await listMedia();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" /> Media Library
        </h1>
        <p className="text-sm text-muted-foreground">
          Semua gambar yang diunggah via panel admin. Salin URL untuk dipakai ulang di form.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Penyimpanan aktif{" "}
            <Badge variant="default">Database (Neon Postgres)</Badge>
          </CardTitle>
          <CardDescription>
            Gambar disimpan langsung di Postgres (bytea) dan dilayani via /api/media/&lt;id&gt;. Persisten di semua environment, tanpa CDN eksternal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <MediaList items={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
