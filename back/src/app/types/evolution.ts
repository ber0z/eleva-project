import { Evolution } from "@prisma/client";
import { z } from "zod";
import { evolutionUpdateSchema } from "../schemas/evolutionSchema";


export type EvolutionWithImages = Evolution & {
  EvolutionImages: {
    id: number;
    idEvolution: number;
    position: number;
    path: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
};


// types/evolution-update.ts (ou perto do service)


export type ImageField = "imageFront" | "imageSide" | "imageBack";

// base = schema de update, mas sem os campos de imagem
export type EvolutionUpdateBase =
  Omit<z.infer<typeof evolutionUpdateSchema>, "imageFront" | "imageSide" | "imageBack">;

export type EvolutionUpdateInputFixed =
  EvolutionUpdateBase &
  Partial<Record<ImageField, Buffer<ArrayBufferLike>>>;

export type ImgBuffer = Buffer<ArrayBufferLike>;


// Somente os campos do Evolution que são atualizáveis via PUT/PATCH
// (sem id, idUser, createdAt, updatedAt)
export type EvolutionWritable = Pick<
  import("@prisma/client").Evolution,
  | "date" | "goal" | "height" | "weight"
  | "rightBiceps" | "leftBiceps" | "rightThigh" | "leftThigh"
  | "waist" | "hips" | "chest" | "message" | "shoulder" | "calf" | "forearm"
>;