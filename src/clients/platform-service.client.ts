import axios from 'axios';
import { config } from '../config';

const client = axios.create({
  baseURL: config.services.platform,
  timeout: 10000,
});

function internalHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const platformServiceClient = {
  /**
   * Get billing configuration for a restaurant.
   * Used at settlement time to determine platform commission.
   */
  async getBillingConfig(restaurantId: string, token?: string) {
    const { data } = await client.get(`/restaurants/${restaurantId}/billing-config`, {
      headers: internalHeaders(token),
    });
    return data;
  },

  /**
   * Get restaurant operational settings (used to cross-check walletStatus etc.).
   * Per §0.3 item 2, this service is authoritative for wallet/loyalty settings,
   * but Platform Service's site-config may call back into this service's GET /settings.
   */
  async getRestaurantSettings(restaurantId: string, token?: string) {
    const { data } = await client.get(`/restaurants/${restaurantId}/settings`, {
      headers: internalHeaders(token),
    });
    return data;
  },
};
