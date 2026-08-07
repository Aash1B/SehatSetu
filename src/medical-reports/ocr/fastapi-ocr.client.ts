import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OcrResult } from '../medical-reports.types';
import { OcrClient } from './ocr-client';

@Injectable()
export class FastApiOcrClient implements OcrClient {
  private readonly baseUrl = (
    process.env.FASTAPI_BASE_URL ||
    process.env.AI_SERVICE_URL ||
    'http://localhost:8001'
  ).replace(/\/+$/, '');
  private readonly internalKey =
    process.env.FASTAPI_INTERNAL_API_KEY ||
    process.env.AI_SERVICE_API_KEY ||
    '';
  private readonly timeoutMs = this.positiveInteger(
    process.env.FASTAPI_OCR_TIMEOUT_MS,
    120_000,
  );
  private readonly maximumRetries = this.nonNegativeInteger(
    process.env.FASTAPI_OCR_MAX_RETRIES,
    1,
  );

  async analyze(
    bytes: Uint8Array,
    fileName: string,
    mimeType: string,
  ): Promise<OcrResult> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.send(bytes, fileName, mimeType);
      } catch (error) {
        if (
          attempt >= this.maximumRetries ||
          error instanceof BadGatewayException
        ) {
          throw error;
        }
      }
    }
  }

  private async send(
    bytes: Uint8Array,
    fileName: string,
    mimeType: string,
  ): Promise<OcrResult> {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(bytes)], { type: mimeType }), fileName);
    form.append('include_summary', 'true');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/ocr/analyze`, {
        method: 'POST',
        headers: this.internalKey
          ? { 'X-Internal-API-Key': this.internalKey }
          : undefined,
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException('Medical report OCR timed out');
      }
      throw new ServiceUnavailableException(
        'Medical report OCR is temporarily unavailable',
      );
    }

    const payload = (await response.json().catch(() => null)) as {
      data?: Record<string, unknown> & { extracted_text?: unknown };
    } | null;
    if (!response.ok || !payload?.data) {
      throw new BadGatewayException('Medical report OCR failed');
    }

    return {
      extractedText:
        typeof payload.data.extracted_text === 'string'
          ? payload.data.extracted_text
          : '',
      extractedData: payload.data,
    };
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private nonNegativeInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  }
}
