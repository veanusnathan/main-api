import { ApiResponseOptions } from '@nestjs/swagger';

export const statusOkResponse: ApiResponseOptions = {
  description: 'OK',
  schema: {
    properties: {
      status: { type: 'string' },
    },
  },
};
