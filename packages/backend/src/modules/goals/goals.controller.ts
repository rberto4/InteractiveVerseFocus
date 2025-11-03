import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoalsService, CreateGoalDto, UpdateGoalDto } from './goals.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { FileExtractorService } from '../files/file-extractor.service';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly fileExtractorService: FileExtractorService,
  ) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(user.userId, createGoalDto);
  }

  @Post('with-file')
  @UseInterceptors(FileInterceptor('file'))
  async createWithFile(
    @CurrentUser() user: any,
    @Body() createGoalDto: CreateGoalDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Convert allowRecurrence from string to boolean (FormData sends strings)
    if (typeof (createGoalDto as any).allowRecurrence === 'string') {
      (createGoalDto as any).allowRecurrence = (createGoalDto as any).allowRecurrence === 'true';
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, Word (.docx), and text files are allowed.',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    console.log(`📤 File uploaded: ${file.originalname} (${file.mimetype})`);

    // Extract content from file
    const { text } = await this.fileExtractorService.extractContent(
      file.buffer,
      file.mimetype,
    );

    console.log(`✅ Content extracted: ${text.length} characters`);

    // Create goal with extracted content
    return this.goalsService.createWithFile(user.userId, createGoalDto, {
      fileName: file.originalname,
      fileType: file.mimetype,
      extractedContent: text,
    });
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.goalsService.findAll(user.userId, status);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.goalsService.findOne(user.userId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user.userId, id, updateGoalDto);
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.goalsService.delete(user.userId, id);
  }
}
