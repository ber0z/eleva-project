import { Upload } from "@aws-sdk/lib-storage";
import { r2 } from "../lib/cloudflare";
import sharp from "sharp";
import { randomUUID } from "crypto";

export async function uploadImagesToR2(files: Buffer[]) {
  const uploadedPaths: string[] = [];
  
  for (const fileBuffer of files) {
    const processedBuffer = await sharp(fileBuffer)
      .rotate()
      .resize(800, 1200, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const fileKey = randomUUID() + ".webp";
    
    const uploader = new Upload({
      client: r2,
      params: {
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: "image/webp",
      },
    });

    await uploader.done();
    uploadedPaths.push(fileKey);
  }

  return uploadedPaths;
}