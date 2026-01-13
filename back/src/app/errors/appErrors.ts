// src/errors/AppErrors.ts
export class NotFoundError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "NotFoundError";
    this.field = field;
  }
}
