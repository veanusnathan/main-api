import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsInt, Min, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export type DomainSortBy = 'name' | 'expiryDate' | 'created' | 'status' | 'used';
export type DomainSortOrder = 'asc' | 'desc';
export type DomainStatusFilter = 'all' | 'expired' | 'needsRenewal' | 'active';
export type DomainUsedFilter = 'used' | 'notUsed' | 'all';
export type DomainNawalaFilter = 'all' | 'blocked' | 'notBlocked';
export const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
export type DomainPageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export class GetDomainsDto {
  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['name', 'expiryDate', 'created', 'status', 'used'],
  })
  @IsOptional()
  @IsIn(['name', 'expiryDate', 'created', 'status', 'used'])
  sortBy?: DomainSortBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: DomainSortOrder;

  @ApiPropertyOptional({
    description: 'Search by domain name (partial match, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by CPanel id (domains linked to this CPanel)',
  })
  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsInt()
  cpanelId?: number;

  @ApiPropertyOptional({
    description: 'When true, return only domains not linked to any CPanel',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unlinkedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by domain lifecycle status',
    enum: ['all', 'expired', 'needsRenewal', 'active'],
  })
  @IsOptional()
  @IsIn(['all', 'expired', 'needsRenewal', 'active'])
  status?: DomainStatusFilter;

  @ApiPropertyOptional({
    description: 'Filter by used status (default: used)',
    enum: ['used', 'notUsed', 'all'],
  })
  @IsOptional()
  @IsIn(['used', 'notUsed', 'all'])
  usedFilter?: DomainUsedFilter;

  @ApiPropertyOptional({
    description: 'Filter by Nawala (blocked) status',
    enum: ['all', 'blocked', 'notBlocked'],
  })
  @IsOptional()
  @IsIn(['all', 'blocked', 'notBlocked'])
  nawalaFilter?: DomainNawalaFilter;

  @ApiPropertyOptional({
    description: 'When true, return only domains where isDefense is true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDefense?: boolean;

  @ApiPropertyOptional({
    description: 'When true, return only domains where isLinkAlt is true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLinkAlt?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by domain group id',
  })
  @IsOptional()
  @Transform(({ value }) => (value != null && value !== '' ? Number(value) : undefined))
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({
    description: 'When true, return only domains with no group',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ungroupedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (10, 50, or 100)',
    enum: [10, 50, 100],
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : 10))
  @IsInt()
  @IsIn([10, 50, 100])
  limit?: DomainPageSize = 10;
}
