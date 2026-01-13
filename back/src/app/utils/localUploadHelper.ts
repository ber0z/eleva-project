// src/app/utils/localUploadHelper.ts
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";


const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const EVOLUTION_DIR = path.join(UPLOADS_ROOT, "evolutionImages");

const PROFILE_PICS_DIR = path.join(UPLOADS_ROOT, "profilePictures");



export async function ensureProfilePicsDir() {
  await fs.mkdir(PROFILE_PICS_DIR, { recursive: true });
}

/**
 * Garante que o diretório /uploads/evolutionImages exista.
 */
export async function ensureEvolutionDir(): Promise<void> {
  await fs.mkdir(EVOLUTION_DIR, { recursive: true });
}

/**
 * Salva um Buffer em disco e devolve o caminho relativo (para gravar no BD).
 * ex.: "evolutionImages/evolution_17_pos1.webp"
 */
export async function saveEvolutionImage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  await ensureEvolutionDir();
  const filePath = path.join(EVOLUTION_DIR, filename);
  await fs.writeFile(filePath, buffer);
  // Armazena só o caminho relativo no banco
  return path.join("evolutionImages", filename).replace(/\\/g, "/");
}

/**
 * Remove o arquivo (caso exista) usando caminho relativo salvo no BD.
 */
export async function deleteEvolutionImage(relativePath: string): Promise<void> {
  const absolutePath = path.join(UPLOADS_ROOT, relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch {
    /* silencia se já não existir */
  }
}

export async function saveProfilePicture(
  buffer: Buffer
): Promise<string> {
  await ensureProfilePicsDir();
  const filename = `${Date.now()}-${uuidv4().slice(0,8)}.webp`;
  const absolute = path.join(PROFILE_PICS_DIR, filename);
  await fs.writeFile(absolute, buffer);
  return path.join("profilePictures", filename).replace(/\\/g, "/");

}
/**
 * Deleta um arquivo local a partir do path relativo (dentro de uploads/).
 */
export async function deleteLocalFile(relativePath: string): Promise<void> {
  const absolute = path.join(UPLOADS_ROOT, relativePath);
  try {
    await fs.unlink(absolute);
  } catch {
    // ignora se não existir
  }
}