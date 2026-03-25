// src/errors/AppErrors.ts
export class NotFoundError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "NotFoundError";
    this.field = field;
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
