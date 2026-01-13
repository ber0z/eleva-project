// src/services/r2-urls.service.ts
import { GetObjectCommand, DeleteObjectsCommand  } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../lib/cloudflare";



export async function presignR2Get(key: string, expiresSeconds = 300, bucket = process.env.CLOUDFLARE_BUCKET_NAME) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn: expiresSeconds });
}



export async function deleteR2Keys(keys: string[]): Promise<string[]> {
  if (!keys.length) return [];
  const failed: string[] = [];

  // chunk de 1000 (limite do DeleteObjects)
  for (let i = 0; i < keys.length; i += 1000) {
    const slice = keys.slice(i, i + 1000);
    const res = await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
        Delete: { Objects: slice.map((Key) => ({ Key })) },
      })
    );

    if (res.Errors?.length) {
      for (const err of res.Errors) {
        if (err.Key) failed.push(err.Key);
      }
    }
  }

  return failed;
}
