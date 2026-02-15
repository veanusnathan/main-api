import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WordPressService } from './wordpress.service';
import { CreateWordPressDto } from './dtos/create-wordpress.dto';
import { UpdateWordPressDto } from './dtos/update-wordpress.dto';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

const PASSWORD_CENSOR = '***';

function censorPasswordIfNeeded<T extends { password?: string }>(
  item: T,
  isSuperuser: boolean,
): T {
  if (isSuperuser || !item.password) return item;
  return { ...item, password: PASSWORD_CENSOR };
}

@ApiTags('WordPress Data')
@Controller('wordpress')
export class WordPressController {
  constructor(private readonly wordpressService: WordPressService) {}

  @Get()
  @ApiOperation({ summary: 'List all WordPress data' })
  async findAll(@CurrentUser() user: JwtUser) {
    const list = await this.wordpressService.findAll();
    const isSuperuser = user?.roles?.includes('superuser');
    return list.map((item) => censorPasswordIfNeeded(item, isSuperuser));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get WordPress data by id' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    const item = await this.wordpressService.findOne(id);
    return censorPasswordIfNeeded(item, user?.roles?.includes('superuser') ?? false);
  }

  @Post()
  @ApiOperation({ summary: 'Create WordPress data' })
  create(@Body() dto: CreateWordPressDto) {
    return this.wordpressService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update WordPress data' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWordPressDto,
  ) {
    return this.wordpressService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete WordPress data' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.wordpressService.remove(id);
  }
}
