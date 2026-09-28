import React from 'react';
import { GoogleButton } from '../../../components/GoogleButton.js';

export default function GoogleRegisterButton({ setting, homeUrl }: { setting?: { googleLoginEnabled?: boolean }; homeUrl: string }) {
  return <GoogleButton enabled={setting?.googleLoginEnabled} homeUrl={homeUrl} />;
}

export const layout = {
  areaId: 'customerRegisterFormTitleAfter',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      googleLoginEnabled
    }
    homeUrl: url(routeId: "homepage")
  }
`;
