import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/**
 * Traffic measurement, production only.
 *
 * Both scripts are served from this origin under `/_vercel/`, so nothing here
 * calls a third party and neither sets a cookie. That matters twice over: a
 * licensed firm's site should not need a consent banner to count a pageview,
 * and a future Content-Security-Policy does not have to name an outside host.
 *
 * Gated on the deployment environment rather than shipped everywhere. Preview
 * deployments are the team reading its own drafts, and on a site with the
 * traffic this one will start with, that is not a rounding error — it is most
 * of the data.
 *
 * Outside production the chunk is still linked from the page, because Next
 * builds its client graph from the imports rather than from what rendered.
 * Nothing in it runs: verified in a browser, a non-production build injects no
 * script and sends no event. Not worth a dynamic import to save the preload.
 */
export function Analytics() {
  if (process.env.VERCEL_ENV !== 'production') return null;

  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
}
