// src/utils/fileHelper.ts
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";


const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * Garante que a pasta de uploads (diet ou training) exista.
 * Retorna o caminho absoluto para a subpasta correta.
 */
export async function getUploadFolder(fileType: "diet" | "training"): Promise<string> {
  const subfolder = fileType === "diet" ? "diet" : "training";
  const folderPath = path.join(UPLOADS_ROOT, subfolder);
  await fs.mkdir(folderPath, { recursive: true });
  return folderPath;
}

/**
 * Gera um nome único para o arquivo, usando fileType, userId e timestamp.
 * Exemplo: "diet-42-1696512345678.pdf"
 */
export function generateFilename(
  originalName: string,
  fileType: "diet" | "training",
  userId: number
): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  return `${fileType}-${userId}-${timestamp}${ext}`;
}


export function generateUniqueFilename(
  originalName: string
): string {
  const ext = path.extname(originalName);           // ".pdf", ".webp", etc.
  const timestamp = Date.now();                     // ex: 1696534567890
  const randomId  = uuidv4().split("-")[0];         // ex: "9f1c2a7b"
  return `${timestamp}-${randomId}${ext}`;          // "1696534567890-9f1c2a7b.pdf"
}