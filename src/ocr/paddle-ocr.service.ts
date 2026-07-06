import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OcrTextResult } from './types/ocr.types';

type PaddleJsonResponse = {
  rawText?: unknown;
  text?: unknown;
  result?: unknown;
  results?: unknown;
  data?: unknown;
};

@Injectable()
export class PaddleOcrService {
  async detectText(file: Express.Multer.File): Promise<OcrTextResult> {
    const url = process.env.PADDLE_OCR_URL;
    if (!url) {
      throw new ServiceUnavailableException(
        'PADDLE_OCR_URL is required when OCR_PROVIDER=paddle',
      );
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: this.createRequestBody(file),
      });

      if (!response.ok) {
        throw new Error(`PaddleOCR returned HTTP ${response.status}`);
      }

      return {
        rawText: await this.readTextResponse(response),
        provider: 'paddle',
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        `PaddleOCR failed: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private createRequestBody(file: Express.Multer.File) {
    const formData = new FormData();
    const arrayBuffer = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], {
      type: file.mimetype || 'application/octet-stream',
    });

    formData.append(
      process.env.PADDLE_OCR_FILE_FIELD ?? 'file',
      blob,
      file.originalname || 'document',
    );

    return formData;
  }

  private async readTextResponse(response: Response) {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return (await response.text()).trim();
    }

    const body = (await response.json()) as PaddleJsonResponse;
    return this.extractRawText(body);
  }

  private extractRawText(body: PaddleJsonResponse): string {
    const directText = this.asString(body.rawText) ?? this.asString(body.text);
    if (directText) {
      return directText;
    }

    const nestedText =
      this.extractTextFromUnknown(body.result) ??
      this.extractTextFromUnknown(body.results) ??
      this.extractTextFromUnknown(body.data);

    return nestedText ?? '';
  }

  private extractTextFromUnknown(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      const lines = value
        .map((item) => this.extractTextFromUnknown(item))
        .filter((item): item is string => Boolean(item));

      return lines.length ? lines.join('\n') : undefined;
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return (
        this.asString(record.text) ??
        this.asString(record.rawText) ??
        this.asString(record.transcription) ??
        this.extractTextFromUnknown(record.result) ??
        this.extractTextFromUnknown(record.results)
      );
    }

    return undefined;
  }

  private asString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
