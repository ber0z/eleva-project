// src/services/upload.service.ts
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2 } from '../lib/cloudflare'
import { randomUUID } from 'crypto'
import { todayUTC } from '../utils/timeUtils'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.CLOUDFLARE_BUCKET_NAME!

type UploadEvolutionParams = {
  userId: number | string
  evolutionId: number | string
  position: 1 | 2 | 3
  buffer: Buffer
  contentType?: string // default: image/webp=
}

export async function uploadEvolutionImageR2(p: UploadEvolutionParams): Promise<string> {
  const { yyyy, mm, dd } = todayUTC()
  const key = `users/${p.userId}/evolutions/${p.evolutionId}/pos${p.position}/${yyyy}/${mm}/${dd}/${randomUUID()}.webp`

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: p.buffer, 
      ContentType: p.contentType ?? 'image/webp',
      CacheControl: 'private, max-age=0, no-store',
    })
  )

  return key 
}

export async function uploadUserProfilePhotoR2(params: {
  userId: number;
  buffer: Buffer;
  contentType?: string; // default: image/webp
}): Promise<string> {
  const { userId, buffer, contentType = "image/webp" } = params;
  const { yyyy, mm, dd } = todayUTC();
  const key = `users/${userId}/profile/${yyyy}/${mm}/${dd}/${randomUUID()}.webp`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "private, max-age=0, no-store",
  }));

  return key;
}

export async function uploadProfessionalProfilePhotoR2(params: {
  professionalId: number;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const { professionalId, buffer, contentType = "image/webp" } = params;
  const { yyyy, mm, dd } = todayUTC();
  const key = `professionals/${professionalId}/profile/${yyyy}/${mm}/${dd}/${randomUUID()}.webp`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "private, max-age=0, no-store",
  }));

  return key;
}

export async function presignR2GetUrlByKey(
  key: string,
  ttlSeconds = 300
): Promise<{ url: string; expiresAt: string }> {
  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: ttlSeconds }
  );
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url, expiresAt };
}




export async function uploadTrainingDocumentR2(params: {
  userId: number;
  buffer: Buffer;
  contentType?: string;
  originalName?: string;
}): Promise<{ key: string; size: number; contentType?: string }> {
  const { userId, buffer, contentType, originalName } = params;
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const uuid = randomUUID();
  const base = originalName ? sanitize(originalName) : `${uuid}.bin`;
  const key = `users/${userId}/trainings/docs/${y}/${m}/${d}/${uuid}-${base}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: undefined, // bucket privado
  }));

  return { key, size: buffer.length, contentType };
}

export async function getTrainingDocumentUrlByKey(
  key: string,
  ttlSeconds = 300,
  filename?: string,
  contentType?: string
): Promise<{ url: string; expiresAt: string }> {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    // dica: forçar comportamento "inline" no browser
    ResponseContentDisposition: filename ? `inline; filename="${filename}"` : "inline",
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });

  const url = await getSignedUrl(r2, cmd, { expiresIn: ttlSeconds });
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url, expiresAt };
}

export async function uploadDietDocumentR2(p: {
  userId: number | string;
  buffer: Buffer;
  contentType?: string;
  originalName?: string;
}) {
  const d = todayUTC(); // { yyyy, mm, dd }
  const name = p.originalName?.replace(/[^\w.-]+/g, "_") || "document";
  const key = `users/${p.userId}/diets/docs/${d.yyyy}/${d.mm}/${d.dd}/${randomUUID()}-${name}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: p.buffer,
    ContentType: p.contentType ?? "application/octet-stream",
    // ContentDisposition inline/attachment fica a seu critério
  }));
  return { key, size: p.buffer.length };
}

export async function getDietDocumentUrlByKey(
  key: string,
  ttlSeconds = 300,
  filename?: string,
  contentType?: string
): Promise<{ url: string; expiresAt: string }> {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: filename ? `inline; filename="${filename}"` : "inline",
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });
  const url = await getSignedUrl(r2, cmd, { expiresIn: ttlSeconds });
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url, expiresAt };
}



//metodos auxiliares

function sanitize(name: string) {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}




















//upload with R2

// import { Upload } from "@aws-sdk/lib-storage";
// import { DeleteObjectCommand } from "@aws-sdk/client-s3";
// // import { randomUUID } from "crypto";
// import { r2 } from "../lib/cloudflare";

// export class UploadService {
//   static async uploadToR2(
//     fileBuffer: Buffer,
//     key: string // Key completa com extensão
//   ): Promise<string> {
//     const uploadParams = {
//       Bucket: process.env.CLOUDFLARE_BUCKET_NAME!,
//       Key: key,
//       Body: fileBuffer,
//       ContentType: "image/webp", // Corresponde à extensão .webp
//     };

//     const uploader = new Upload({
//       client: r2,
//       params: uploadParams,
//     });

//     await uploader.done();
//     return key; // Retorna a key exatamente como foi enviada
//   }

//   static async deleteFromR2(fileKey: string): Promise<void> {
//     const deleteParams = {
//       Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
//       Key: fileKey,
//     };

//     await r2.send(new DeleteObjectCommand(deleteParams));
//   }

// }
