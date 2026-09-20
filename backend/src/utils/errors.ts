export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'ERR_INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'ERR_BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', code = 'ERR_VALIDATION') {
    super(message, 400, code);
  }
}

export class IllegalStateTransitionError extends AppError {
  constructor(message = 'Illegal state transition', code = 'ERR_INVALID_STATE_TRANSITION') {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'ERR_UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'ERR_FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'ERR_NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'ERR_CONFLICT') {
    super(message, 409, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', code = 'ERR_INTERNAL_SERVER_ERROR') {
    super(message, 500, code);
  }
}
