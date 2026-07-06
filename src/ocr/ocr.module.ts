import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrProviderService } from './ocr-provider.service';
import { OcrService } from './ocr.service';
import { PaddleOcrService } from './paddle-ocr.service';
import { VisionService } from './vision.service';

@Module({
  controllers: [OcrController],
  providers: [OcrService, OcrProviderService, PaddleOcrService, VisionService],
})
export class OcrModule {}
