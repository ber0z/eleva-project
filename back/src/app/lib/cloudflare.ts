import { S3Client } from '@aws-sdk/client-s3'
import dotenv from 'dotenv';
dotenv.config();

const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const endpoint = process.env.CLOUDFLARE_ENDPOINT;

if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("Missing required environment variables");
}

export const r2 = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
        accessKeyId,    
        secretAccessKey,
    },
      forcePathStyle: true, // Necessário para R2

});