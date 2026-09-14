import { Images } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMedia } from "@/lib/local-upload";
import { MediaList } from "@/components/admin/media-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaPage() {
  const { items, remote, error } = await listMedia();

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
            <Badge variant={remote ? "default" : "secondary"}>
              {remote ? "Bunny Storage" : "Lokal public/uploads"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {remote
              ? "Upload baru tersimpan persisten di Bunny CDN."
              : "Bunny belum dikonfigurasi — upload tersimpan lokal (hilang saat redeploy serverless). Isi BUNNY_STORAGE_* untuk produksi."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <MediaList items={items} remote={remote} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
