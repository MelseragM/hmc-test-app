import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OcrTextResult } from './types/ocr.types';

@Injectable()
export class VisionService {
  private readonly client = new ImageAnnotatorClient();

  async detectText(buffer: Buffer): Promise<OcrTextResult> {
    try {
      const [result] = await this.client.documentTextDetection({
        image: { content: buffer },
      });
      const rawText =
        result.fullTextAnnotation?.text ??
        result.textAnnotations?.[0]?.description ??
        '';
      const confidence = this.getAverageConfidence(
        result.fullTextAnnotation?.pages,
      );

      return {
        rawText,
        provider: 'google',
        ...(confidence === undefined ? {} : { confidence }),
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        `Google Vision OCR failed: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getAverageConfidence(
    pages: Array<{ confidence?: number | null }> | null | undefined,
  ) {
    const confidences = (pages ?? [])
      .map((page) => page.confidence)
      .filter(
        (confidence): confidence is number =>
          typeof confidence === 'number' && Number.isFinite(confidence),
      );

    if (confidences.length === 0) {
      return undefined;
    }

    const total = confidences.reduce((sum, confidence) => sum + confidence, 0);
    return Number((total / confidences.length).toFixed(4));
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
