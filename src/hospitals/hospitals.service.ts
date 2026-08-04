import { Injectable, BadGatewayException } from '@nestjs/common';

@Injectable()
export class HospitalsService {
  async findNearby(lat: number, lng: number, radiusMeters: number) {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY as string,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.internationalPhoneNumber',
      },
      body: JSON.stringify({
        includedTypes: ['hospital'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadGatewayException(`Google Places API error: ${errorBody}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map((place: any) => ({
      id: place.id,
      name: place.displayName?.text,
      address: place.formattedAddress,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      rating: place.rating,
      ratingCount: place.userRatingCount,
      openNow: place.currentOpeningHours?.openNow,
      phone: place.internationalPhoneNumber,
    }));
  }
}