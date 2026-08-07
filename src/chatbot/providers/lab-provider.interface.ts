export interface LabProvider {
  findNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<PagedLabs[]>;
}

export interface LabProviderInfo {
  configured: boolean;
  providerName?: string;
}

export interface PagedLabs {
  labId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  openingHours?: string;
  homeCollection?: boolean;
  availableTests?: string[];
}
