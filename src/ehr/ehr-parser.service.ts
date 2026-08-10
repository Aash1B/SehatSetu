import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

/**
 * Service that parses OCR extracted medical report text and data into structured
 * medical information using the AI microservice.
 */
@Injectable()
export class EhrParserService {
  private readonly logger = new Logger(EhrParserService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Parses extracted OCR text and optional extractedData into a structured object.
   * Returns an object containing diagnosis, notes, and structuredData.
   */
  async parse(
    extractedText: string,
    extractedData: Record<string, unknown>,
  ): Promise<{ diagnosis: string | null; notes: string | null; structuredData: Record<string, unknown> | null }> {
    // Defensive: if no text, return empty result.
    if (!extractedText?.trim()) {
      return { diagnosis: null, notes: null, structuredData: null };
    }

    try {
      // Call the AI microservice endpoint for EHR text parsing
      const response = await this.aiService.post<{ diagnosis: string | null; medications: string[]; vitals: Record<string, unknown>; notes: string | null }>('ocr/parse-text', {
        extracted_text: extractedText,
        extracted_data: extractedData,
      });

      const { diagnosis, medications, vitals, notes } = response;
      const structuredData = { medications, vitals };
      return { diagnosis: diagnosis ?? null, notes: notes ?? null, structuredData };
    } catch (e) {
      // Log warning and return empty result to avoid crashing the pipeline
      this.logger.warn('EHR parsing failed', { error: e instanceof Error ? e.message : String(e) });
      // If parsing fails, fallback to minimal info.
      return { diagnosis: null, notes: null, structuredData: null };
    }
  }
}
