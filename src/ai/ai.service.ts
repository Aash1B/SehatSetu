import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly baseUrl = (
    process.env.AI_SERVICE_URL || 'http://localhost:8001'
  ).replace(/\/+$/, '');
  private readonly timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 120000);

  async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.AI_SERVICE_API_KEY
            ? { 'X-Internal-API-Key': process.env.AI_SERVICE_API_KEY }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new BadGatewayException({
          message: 'AI service rejected the request',
          statusCode: response.status,
          error: payload,
        });
      }
      return payload as T;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('AI service request timed out');
      }
      throw new ServiceUnavailableException('AI service is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
