// import { FastifyRequest } from 'fastify';
// import type { JwtPayloadWithUserId } from '../utils/tokenUtils'; 
import "fastify";

declare module 'fastify' {
  interface FastifyRequest {
     auth?: {
      authId: number;                           
      subjectType: "user" | "professional" | "admin";
      subjectId: number;                      
      roles?: string[];                     
    }; 
  }

 
} 