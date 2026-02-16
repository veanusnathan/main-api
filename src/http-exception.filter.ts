import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';

interface ErrorResponse {
  message?: string | string[];
  errors?: string[];
}

/** API error body: always has errors[] for clients; optional stack for debugging (e.g. in Network tab). */
interface ApiErrorBody {
  errors: string[];
  stack?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let responseBody: ApiErrorBody;
    let httpStatus: number;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse() as ErrorResponse;
      const errs =
        res.errors ??
        (res.message
          ? typeof res.message === 'string'
            ? [res.message]
            : res.message
          : ['Unauthorized']);
      responseBody = { errors: errs };
      this.logger.warn(exception.message);
    } else {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(exception);
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      responseBody = {
        errors: [message],
        ...(process.env.NODE_ENV !== 'production' && stack && { stack }),
      };
    }

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
