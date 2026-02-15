import { MikroORM } from '@mikro-orm/core';
import { SqlEntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor(
    private readonly orm: MikroORM,
    private readonly em: SqlEntityManager,
  ) {}
  async getReadiness() {
    await this.em.execute('SELECT 1');
  }
}
