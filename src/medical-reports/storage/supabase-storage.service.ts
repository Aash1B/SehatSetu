import {
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DownloadedObject,
  MEDICAL_REPORT_BUCKET,
  SignedDownload,
  SignedUpload,
  StoredObjectMetadata,
} from '../medical-reports.types';
import { StorageService } from './storage.service';

@Injectable()
export class SupabaseStorageService implements StorageService {
  private configuration(): { baseUrl: string; secretKey: string } {
    const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    const secretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket =
      process.env.SUPABASE_STORAGE_BUCKET || MEDICAL_REPORT_BUCKET;

    if (!projectUrl || !secretKey) {
      throw new ServiceUnavailableException(
        'Medical report storage is not configured',
      );
    }
    if (bucket !== MEDICAL_REPORT_BUCKET) {
      throw new ServiceUnavailableException(
        'Medical report storage is not configured',
      );
    }
    return { baseUrl: `${projectUrl}/storage/v1`, secretKey };
  }

  async createSignedUpload(
    bucket: string,
    path: string,
  ): Promise<SignedUpload> {
    const response = await this.request(
      `/object/upload/sign/${this.objectPath(bucket, path)}`,
      { method: 'POST', body: JSON.stringify({ upsert: false }) },
    );
    const payload = (await response.json()) as {
      url?: string;
      token?: string;
    };
    const absoluteUrl = payload.url
      ? this.absoluteStorageUrl(payload.url)
      : undefined;
    const token = payload.token || (
      absoluteUrl ? new URL(absoluteUrl).searchParams.get('token') : null
    );
    if (!absoluteUrl || !token) {
      throw new ServiceUnavailableException(
        'Storage could not create an upload URL',
      );
    }
    return {
      signedUrl: absoluteUrl,
      token,
      // Supabase signed upload URLs are provider-defined and currently last 2 hours.
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    };
  }

  async createSignedDownload(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<SignedDownload> {
    const response = await this.request(
      `/object/sign/${this.objectPath(bucket, path)}`,
      {
        method: 'POST',
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      },
    );
    const payload = (await response.json()) as {
      signedURL?: string;
      signedUrl?: string;
    };
    const url = payload.signedURL || payload.signedUrl;
    if (!url) {
      throw new ServiceUnavailableException(
        'Storage could not create a download URL',
      );
    }
    return {
      signedUrl: this.absoluteStorageUrl(url),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async objectExists(
    bucket: string,
    path: string,
  ): Promise<StoredObjectMetadata> {
    const response = await this.request(
      `/object/${this.objectPath(bucket, path)}`,
      { method: 'HEAD' },
      true,
    );
    if (response.status === 404) return { exists: false };
    if (!response.ok) this.throwStorageUnavailable();

    const length = Number(response.headers.get('content-length'));
    return {
      exists: true,
      sizeBytes: Number.isSafeInteger(length) ? length : undefined,
      mimeType: this.normalizeMimeType(response.headers.get('content-type')),
    };
  }

  async deleteObject(bucket: string, path: string): Promise<void> {
    await this.request(`/object/${encodeURIComponent(bucket)}`, {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: [path] }),
    });
  }

  async downloadObject(
    bucket: string,
    path: string,
    maximumBytes: number,
  ): Promise<DownloadedObject> {
    const response = await this.request(
      `/object/${this.objectPath(bucket, path)}`,
      { method: 'GET' },
    );
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
      throw new PayloadTooLargeException('Stored report exceeds the size limit');
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximumBytes) {
      throw new PayloadTooLargeException('Stored report exceeds the size limit');
    }
    return {
      bytes,
      sizeBytes: bytes.byteLength,
      mimeType:
        this.normalizeMimeType(response.headers.get('content-type')) ||
        'application/octet-stream',
    };
  }

  private async request(
    path: string,
    init: RequestInit,
    allowNotFound = false,
  ): Promise<Response> {
    const { baseUrl, secretKey } = this.configuration();
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      this.throwStorageUnavailable();
    }
    if (!response!.ok && !(allowNotFound && response!.status === 404)) {
      this.throwStorageUnavailable();
    }
    return response!;
  }

  private objectPath(bucket: string, path: string): string {
    return [bucket, ...path.split('/')]
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private absoluteStorageUrl(path: string): string {
    if (/^https:\/\//i.test(path)) return path;
    const { baseUrl } = this.configuration();
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private normalizeMimeType(value: string | null): string | undefined {
    return value?.split(';')[0].trim().toLowerCase() || undefined;
  }

  private throwStorageUnavailable(): never {
    throw new ServiceUnavailableException(
      'Medical report storage is temporarily unavailable',
    );
  }
}
