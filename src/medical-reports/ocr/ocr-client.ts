import { OcrResult } from '../medical-reports.types';

export const OCR_CLIENT = Symbol('OCR_CLIENT');

export interface OcrClient {
  analyze(
    bytes: Uint8Array,
    fileName: string,
    mimeType: string,
  ): Promise<OcrResult>;
}
