import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WordPressData } from './wordpress.entity';
import { WordPressController } from './wordpress.controller';
import { WordPressService } from './wordpress.service';

@Module({
  imports: [MikroOrmModule.forFeature([WordPressData])],
  controllers: [WordPressController],
  providers: [WordPressService],
  exports: [WordPressService],
})
export class WordPressModule {}
