export type OcrDocumentType = 'passport' | 'qid';
export type OcrProvider = 'google' | 'paddle';

export interface OcrTextResult {
  rawText: string;
  provider: OcrProvider;
  confidence?: number;
}

export interface PassportFields {
  documentType?: string;
  passportNumber?: string;
  countryCode?: string;
  issuingCountry?: string;
  nationality?: string;
  name?: string;
  surname?: string;
  givenNames?: string;
  occupation?: string;
  personalNumber?: string;
  dateOfBirth?: string;
  sex?: string;
  placeOfBirth?: string;
  expiryDate?: string;
  issueDate?: string;
  dateOfIssue?: string;
}

export interface QidFields {
  issuingState?: string;
  documentType?: string;
  qidNumber?: string;
  name?: string;
  dateOfBirth?: string;
  nationality?: string;
  issueDate?: string;
  expiryDate?: string;
}

export type OcrFields = PassportFields | QidFields;

export interface OcrResponse<TFields extends OcrFields = OcrFields> {
  documentType: OcrDocumentType;
  provider: OcrProvider;
  fields: TFields;
  rawText: string;
  confidence?: number;
  warnings: string[];
}
