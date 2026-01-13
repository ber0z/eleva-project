import {randomInt} from 'crypto';

export const generateRecoveryCode = (): string => {
  const code = randomInt(0, 1000000); 
  return code.toString().padStart(6, '0'); 
};
