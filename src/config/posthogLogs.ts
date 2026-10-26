import { posthog } from './posthog';

type PostHogLogAttributes = Record<string, string | number | boolean>;

export const posthogLog = {
  info: (body: string, attributes: PostHogLogAttributes) => {
    posthog?.logger.info(body, {
      log_source: 'posthog_wizard',
      ...attributes,
    });
  },
};
