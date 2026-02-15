import { EntityRepository } from '@mikro-orm/postgresql';
import { Domain } from './domain.entity';

export class DomainRepository extends EntityRepository<Domain> {}
