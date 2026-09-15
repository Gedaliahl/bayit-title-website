import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { site } from '@/lib/site';

export const alt = `${site.legalName} — Florida title insurance agency in ${site.address.city}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** The fallback card: every page without one of its own shares this. */
export default function OpenGraphImage() {
  return ogImage({
    eyebrow: `${site.address.city}, Florida`,
    title: 'Title insurance and closings throughout Florida',
  });
}
