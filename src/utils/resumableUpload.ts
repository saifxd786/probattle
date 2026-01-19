import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

export async function uploadResumableToBucket(params: {
  bucketName: string;
  objectName: string;
  file: File;
  chunkSizeBytes?: number;
  onProgress?: (info: { bytesUploaded: number; bytesTotal: number; percent: number }) => void;
}): Promise<void> {
  const { bucketName, objectName, file, chunkSizeBytes = 6 * 1024 * 1024, onProgress } = params;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing backend configuration");
  }

  const endpoint = `${supabaseUrl}/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      chunkSize: chunkSizeBytes,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "x-upsert": "true",
      },
      metadata: {
        bucketName,
        objectName,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: (err) => reject(err),
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
        onProgress?.({ bytesUploaded, bytesTotal, percent });
      },
      onSuccess: () => resolve(),
    });

    upload.start();
  });
}
