import axios from 'axios';

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Geocodes an address string using Google Geocoding API or Nominatim as fallback.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  // Try Google Geocoding API if key is available
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: GOOGLE_MAPS_API_KEY,
          language: 'it',
          region: 'it'
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          display_name: result.formatted_address,
        };
      } else {
        console.warn('Google Geocoding API returned status:', response.data.status);
      }
    } catch (error) {
      console.error('Google Geocoding error:', error);
    }
  }

  // Fallback to Nominatim
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        countrycodes: 'it',
      },
      headers: {
        'Accept-Language': 'it',
        'User-Agent': 'AisApp/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name,
      };
    }
    return null;
  } catch (error) {
    console.error('Nominatim Geocoding error:', error);
    return null;
  }
}

/**
 * Formats an address object into a string for geocoding.
 */
export function formatAddressForGeocoding(address: { street: string; city: string; zip: string; country: string }): string {
  return `${address.street}, ${address.zip} ${address.city}, ${address.country}`;
}
