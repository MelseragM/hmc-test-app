import { BadRequestException, Injectable } from '@nestjs/common';
import {
  OcrResponse,
  PassportFields,
  QidFields,
} from './types/ocr.types';
import { parsePassportText } from './parsers/passport.parser';
import { parseQidText } from './parsers/qid.parser';
import { OcrProviderService } from './ocr-provider.service';

@Injectable()
export class OcrService {
  constructor(private readonly ocrProvider: OcrProviderService) {}

  async extractPassport(
    file: Express.Multer.File,
  ): Promise<OcrResponse<PassportFields>> {
    const textResult = await this.extractText(file);
    const fields = parsePassportText(textResult.rawText);

    return {
      documentType: 'passport',
      provider: textResult.provider,
      fields,
      rawText: textResult.rawText,
      ...(textResult.confidence === undefined
        ? {}
        : { confidence: textResult.confidence }),
      warnings: this.getMissingFieldWarnings('passport', fields, [
        'passportNumber',
        'dateOfBirth',
        'expiryDate',
      ]),
    };
  }

  async extractQid(file: Express.Multer.File): Promise<OcrResponse<QidFields>> {
    const textResult = await this.extractText(file);
    const fields = parseQidText(textResult.rawText);

    return {
      documentType: 'qid',
      provider: textResult.provider,
      fields,
      rawText: textResult.rawText,
      ...(textResult.confidence === undefined
        ? {}
        : { confidence: textResult.confidence }),
      warnings: this.getMissingFieldWarnings('qid', fields, ['qidNumber']),
    };
  }

  private async extractText(file: Express.Multer.File) {
    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const textResult = await this.ocrProvider.detectText(file);
    if (!textResult.rawText.trim()) {
      throw new BadRequestException('No readable text was detected');
    }

    return textResult;
  }

  private getMissingFieldWarnings<TFields extends object>(
    documentType: string,
    fields: TFields,
    requiredFields: Array<keyof TFields>,
  ) {
    return requiredFields
      .filter((field) => !fields[field])
      .map(
        (field) =>
          `Could not confidently extract ${String(field)} from ${documentType}`,
      );
  }
}
