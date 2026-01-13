// // import { FastifyRequest, FastifyReply } from "fastify";
// import { PutObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
// import { r2 } from '../lib/cloudflare'; 


// export class UploadController {
//     async uploadImage() { 
//       try {
//        const signedUrl = await getSignedUrl(
//         r2,
//         new PutObjectCommand({
//             Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
//             Key: '',
//             ContentType: '',
//         }),
//         { expiresIn: 600 },
//        )
//        return signedUrl
//       } catch (err){
//        return err
//       }
//     }
//   }
  