import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { ChatCard } from '../types/chatbot.types';

export interface HospitalSearchResult {
  cards: ChatCard[];
  message: string;
  suggestedReplies: string[];
}

const MAX_HOSPITALS = 10;
const DEFAULT_RADIUS_METERS = 5000;
const MAX_DISTANCE_KM = 50;

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

export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !Number.isNaN(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !Number.isNaN(lng) && lng >= -180 && lng <= 180;
}

@Injectable()
export class HospitalChatService {
  private readonly logger = new Logger(HospitalChatService.name);

  constructor(private readonly hospitalsService: HospitalsService) {}

  async searchNearbyHospitals(params: {
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
  }): Promise<HospitalSearchResult> {
    const { latitude, longitude, radiusMeters } = params;

    if (
      latitude === undefined ||
      longitude === undefined ||
      !isValidLatitude(latitude) ||
      !isValidLongitude(longitude)
    ) {
      return this.locationRequiredResponse();
    }

    const lat = latitude;
    const lng = longitude;
    const radius = radiusMeters ?? DEFAULT_RADIUS_METERS;

    try {
      const rawHospitals = await this.hospitalsService.findNearby(
        lat,
        lng,
        radius,
      );

      const validHospitals = (rawHospitals || []).filter((h: any) => {
        if (!h || !h.id || !h.name) return false;
        return true;
      });

      const hospitalsWithDistance = validHospitals
        .map((hospital: any) => {
          let distance: number | undefined;
          if (
            isValidLatitude(hospital.latitude) &&
            isValidLongitude(hospital.longitude)
          ) {
            distance = haversineKm(
              lat,
              lng,
              hospital.latitude,
              hospital.longitude,
            );
          }
          return { ...hospital, distance };
        })
        .filter((hospital: any) => {
          if (
            hospital.distance !== undefined &&
            hospital.distance > MAX_DISTANCE_KM
          ) {
            return false;
          }
          return true;
        })
        .sort((a: any, b: any) => {
          const da = a.distance ?? Infinity;
          const db = b.distance ?? Infinity;
          return da - db;
        })
        .slice(0, MAX_HOSPITALS);

      if (hospitalsWithDistance.length === 0) {
        return {
          cards: [],
          message:
            'No hospitals were found near your location. You may want to expand your search area.',
          suggestedReplies: [
            'Use my location',
            'Enter city name',
            'Call 108',
          ],
        };
      }

      const cards: ChatCard[] = hospitalsWithDistance.map((hospital: any) =>
        this.mapToCard(hospital),
      );

      const message =
        hospitalsWithDistance.length === 1
          ? 'Here is 1 hospital near you:'
          : `Found ${hospitalsWithDistance.length} hospitals near you:`;

      return {
        cards,
        message,
        suggestedReplies: [
          'Get directions',
          'Call hospital',
          'Nearby labs',
        ],
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        this.logger.warn(
          `Hospital provider unavailable: ${error.message}`,
        );
        return {
          cards: [],
          message:
            'Hospital search is temporarily unavailable. Please try again later.',
          suggestedReplies: ['Call 108', 'Nearby labs', 'Find a doctor'],
        };
      }

      this.logger.error(
        `Error searching nearby hospitals: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        cards: [],
        message:
          'Unable to retrieve hospital information at this time. Please try again later.',
        suggestedReplies: ['Call 108', 'Nearby labs'],
      };
    }
  }

  private locationRequiredResponse(): HospitalSearchResult {
    return {
      cards: [
        {
          type: 'location-required',
          title: 'Location needed',
          subtitle: 'Share your location to find nearby hospitals',
          message:
            'To find hospitals near you, please share your location from your device or enter a city name.',
          actions: [
            { type: 'USE_BROWSER_LOCATION', label: 'Use my location', value: 'use_browser_location' },
            { type: 'ENTER_CITY', label: 'Enter city name', value: 'enter_city' },
          ],
        },
      ],
      message:
        'To find hospitals near you, I need your location. You can share your location from your device or enter a city name.',
      suggestedReplies: ['Use my location', 'Enter city name'],
    };
  }

  private mapToCard(hospital: any): ChatCard {
    const openStatus =
      hospital.openNow === true
        ? 'OPEN'
        : hospital.openNow === false
          ? 'CLOSED'
          : 'UNKNOWN';

    const directionsUrl =
      isValidLatitude(hospital.latitude) &&
      isValidLongitude(hospital.longitude)
        ? `https://maps.google.com/maps?q=${hospital.latitude},${hospital.longitude}`
        : undefined;

    const actions: { type: string; label: string; value: string }[] = [];

    if (directionsUrl) {
      actions.push({
        type: 'action',
        label: 'Get directions',
        value: `directions:${hospital.id}`,
      });
    }

    if (hospital.phone) {
      actions.push({
        type: 'action',
        label: 'Call hospital',
        value: `tel:${hospital.phone}`,
      });
    }

    const card: ChatCard = {
      type: 'hospital',
      title: hospital.name,
      subtitle: hospital.address,
      hospitalId: hospital.id,
      message: `Hospital near you${hospital.distance !== undefined ? ` (${hospital.distance.toFixed(1)} km away)` : ''}`,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      distance: hospital.distance,
      phone: hospital.phone,
      status: openStatus,
      actions,
    };

    return card;
  }
}
