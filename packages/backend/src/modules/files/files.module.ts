import { Module } from '@nestjs/common';
import { FileExtractorService } from './file-extractor.service';

@Module({
  providers: [FileExtractorService],
  exports: [FileExtractorService],
})
export class FilesModule {}
