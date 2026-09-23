import { Cloud } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCloudAIConfigForAdmin } from "@/lib/cloud-ai-config";
import { CloudAIConfigForm } from "@/components/admin/cloud-ai-config-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCloudAIPage() {
  const cloudAIConfig = await getCloudAIConfigForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" /> Pengaturan Cloud AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi koneksi dengan provider AI pihak ketiga untuk membantu pembuatan draf konten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4 text-primary" /> Pengaturan Provider AI
          </CardTitle>
          <CardDescription>
            Atur kredensial dan preferensi model. API Key disimpan dalam database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CloudAIConfigForm initial={cloudAIConfig} />
        </CardContent>
      </Card>
    </div>
  );
}

