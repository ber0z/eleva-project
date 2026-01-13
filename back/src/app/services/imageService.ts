import sharp from "sharp";

export class ImageService {
  static async processImage(fileBuffer: Buffer, maxSize: number, width: number = 800, height: number = 1200): Promise<Buffer> {
    let quality = 80;
    let outputBuffer: Buffer = await sharp(fileBuffer)
      .rotate()
      .resize(width, height, { fit: "cover" })
      .webp({ quality })
      .toBuffer();

    while (outputBuffer.length > maxSize && quality > 10) {
      quality -= 5; 
      outputBuffer = await sharp(fileBuffer)
        .rotate()
        .resize(width, height, { fit: "cover" })
        .webp({ quality })
        .toBuffer();
    }

    return outputBuffer;
  }
}
