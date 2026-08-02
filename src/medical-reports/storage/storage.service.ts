import {
  DownloadedObject,
  SignedDownload,
  SignedUpload,
  StoredObjectMetadata,
} from '../medical-reports.types';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StorageService {
  createSignedUpload(bucket: string, path: string): Promise<SignedUpload>;
  createSignedDownload(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<SignedDownload>;
  objectExists(bucket: string, path: string): Promise<StoredObjectMetadata>;
  deleteObject(bucket: string, path: string): Promise<void>;
  downloadObject(
    bucket: string,
    path: string,
    maximumBytes: number,
  ): Promise<DownloadedObject>;
}
