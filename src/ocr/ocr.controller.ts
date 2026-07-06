import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';

const DEFAULT_MAX_FILE_SIZE_MB = 5;
const SUPPORTED_MIME_TYPES = /^(image\/jpeg|image\/png|image\/webp)$/;

function getMaxFileSizeBytes() {
  const configured = Number(process.env.OCR_MAX_FILE_SIZE_MB);
  const maxMb =
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_MAX_FILE_SIZE_MB;

  return maxMb * 1024 * 1024;
}

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('passport')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: getMaxFileSizeBytes() },
    }),
  )
  extractPassport(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: SUPPORTED_MIME_TYPES })
        .addMaxSizeValidator({ maxSize: getMaxFileSizeBytes() })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.ocrService.extractPassport(file);
  }

  @Post('qid')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: getMaxFileSizeBytes() },
    }),
  )
  extractQid(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: SUPPORTED_MIME_TYPES })
        .addMaxSizeValidator({ maxSize: getMaxFileSizeBytes() })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.ocrService.extractQid(file);
  }
}
