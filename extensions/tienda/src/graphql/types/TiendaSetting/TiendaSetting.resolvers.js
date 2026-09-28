import { googleLoginEnabled } from '../../../services/googleAuth.js';

export default {
  Setting: {
    googleMapsApiKey: () => process.env.GOOGLE_MAPS_API_KEY?.trim() || null,
    googleLoginEnabled: () => googleLoginEnabled()
  }
};
