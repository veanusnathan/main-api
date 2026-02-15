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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let responseBody: { errors: string[] };
    let httpStatus: number;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse() as ErrorResponse;
      const errs = res.errors ?? (res.message ? (typeof res.message === 'string' ? [res.message] : res.message) : ['Unauthorized']);
      responseBody = { errors: errs };
      this.logger.warn(exception.message);
    } else {
      this.logger.error(exception);
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      responseBody = { errors: ['internal server error'] };
    }

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
