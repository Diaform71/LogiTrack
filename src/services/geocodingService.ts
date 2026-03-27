import axios from 'axios';

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

/**
 * Geocodes an address string using OpenStreetMap Nominatim API.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        countrycodes: 'it', // Restrict to Italy as per app context
      },
      headers: {
        'Accept-Language': 'it',
        'User-Agent': 'AisApp/1.0' // Good practice for Nominatim
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
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Formats an address object into a string for geocoding.
 */
export function formatAddressForGeocoding(address: { street: string; city: string; zip: string; country: string }): string {
  return `${address.street}, ${address.zip} ${address.city}, ${address.country}`;
}
