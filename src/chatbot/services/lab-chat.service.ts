import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ChatCard } from '../types/chatbot.types';
import { LabProvider, PagedLabs, LabProviderInfo } from '../providers/lab-provider.interface';

const MAX_LABS = 10;
const MAX_DISTANCE_KM = 50;

export interface LabChatResult {
  cards: ChatCard[];
  message: string;
  suggestedReplies: string[];
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !Number.isNaN(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !Number.isNaN(lng) && lng >= -180 && lng <= 180;
}

@Injectable()
export class LabChatService {
  private readonly logger = new Logger(LabChatService.name);

  constructor(
    @Optional()
    @Inject('LAB_PROVIDER')
    private readonly labProvider?: LabProvider,
  ) {}

  getProviderInfo(): LabProviderInfo {
    if (!this.labProvider) {
      return { configured: false };
    }
    return { configured: true, providerName: 'configured-lab-provider' };
  }

  async searchNearbyLabs(
    params: {
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
    },
  ): Promise<LabChatResult> {
    const { latitude, longitude, radiusMeters } = params;

    const lat = latitude;
    const lng = longitude;
    const radius = radiusMeters ?? 5000;

    if (
      !isValidLatitude(lat as number) ||
      !isValidLongitude(lng as number)
    ) {
      return {
        cards: [],
        message:
          'I need your location to find nearby labs. Please share your location or enter a city name.',
        suggestedReplies: ['Use my location', 'Enter city name'],
      };
    }

    if (lat !== undefined && lng !== undefined) {
      return this.performSearch(lat, lng, radius);
    }

    return {
      cards: [],
      message:
        'I need your location to find nearby labs. Please share your location or enter a city name.',
      suggestedReplies: ['Use my location', 'Enter city name'],
    };
  }

  private async performSearch(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<LabChatResult> {
    const providerInfo = this.getProviderInfo();
    if (!providerInfo.configured) {
      return {
        cards: [],
        message:
          'Lab search is not currently configured. Please check back later or contact support.',
        suggestedReplies: [
          'Nearby hospitals',
          'Find a doctor',
          'Lab test guidance',
        ],
      };
    }

    try {
      const rawLabs = await this.labProvider!.findNearby(
        lat,
        lng,
        radiusMeters,
      );

      const validLabs: PagedLabs[] = (rawLabs || []).filter((lab) => {
        if (!lab || !lab.labId || !lab.name) return false;
        return true;
      });

      const labsWithDistance = validLabs
        .map((lab) => {
          let distance: number | undefined;
          if (
            isValidLatitude(lab.latitude as number) &&
            isValidLongitude(lab.longitude as number)
          ) {
            distance = haversineKm(lat, lng, lab.latitude!, lab.longitude!);
          }
          return { ...lab, distance };
        })
        .filter((lab) => {
          if (lab.distance !== undefined && lab.distance > MAX_DISTANCE_KM) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const da = a.distance ?? Infinity;
          const db = b.distance ?? Infinity;
          return da - db;
        })
        .slice(0, MAX_LABS);

      if (labsWithDistance.length === 0) {
        return {
          cards: [],
          message:
            'No diagnostic labs were found near your location. You may want to expand your search area.',
          suggestedReplies: [
            'Nearby hospitals',
            'Find a doctor',
            'Lab test guidance',
          ],
        };
      }

      const cards: ChatCard[] = labsWithDistance.map((lab) =>
        this.mapToCard(lab),
      );

      return {
        cards,
        message:
          labsWithDistance.length === 1
            ? 'Here is 1 diagnostic lab near you:'
            : `Found ${labsWithDistance.length} diagnostic labs near you:`,
        suggestedReplies: ['Directions', 'Call lab', 'Nearby hospitals'],
      };
    } catch (error) {
      this.logger.error(
        `Lab provider error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        cards: [],
        message:
          'Unable to retrieve lab information at this time. Please try again later.',
        suggestedReplies: ['Nearby hospitals', 'Find a doctor'],
      };
    }
  }

  private mapToCard(lab: PagedLabs & { distance?: number }): ChatCard {
    const directionsUrl =
      isValidLatitude(lab.latitude as number) &&
      isValidLongitude(lab.longitude as number)
        ? `https://maps.google.com/maps?q=${lab.latitude},${lab.longitude}`
        : undefined;

    const actions: { type: string; label: string; value: string }[] = [];

    if (directionsUrl) {
      actions.push({
        type: 'action',
        label: 'Get directions',
        value: `directions:${lab.labId}`,
      });
    }

    if (lab.phone) {
      actions.push({
        type: 'action',
        label: 'Call lab',
        value: `tel:${lab.phone}`,
      });
    }

    const card: ChatCard = {
      type: 'lab',
      title: lab.name,
      subtitle: lab.address,
      labId: lab.labId,
      message: `Diagnostic lab near you${lab.distance !== undefined ? ` (${lab.distance.toFixed(1)} km away)` : ''}`,
      latitude: lab.latitude,
      longitude: lab.longitude,
      distance: lab.distance,
      phone: lab.phone,
      actions,
    };

    return card;
  }
}
