import { Injectable } from '@nestjs/common';
import { PaddleOcrService } from './paddle-ocr.service';
import { OcrProvider } from './types/ocr.types';
import { VisionService } from './vision.service';

@Injectable()
export class OcrProviderService {
  constructor(
    private readonly googleVision: VisionService,
    private readonly paddleOcr: PaddleOcrService,
  ) {}

  detectText(file: Express.Multer.File) {
    const provider = this.getProvider();

    if (provider === 'paddle') {
      return this.paddleOcr.detectText(file);
    }

    return this.googleVision.detectText(file.buffer);
  }

  private getProvider(): OcrProvider {
    const provider = (process.env.OCR_PROVIDER ?? 'paddle').toLowerCase();

    return provider === 'google' ? 'google' : 'paddle';
  }
}
