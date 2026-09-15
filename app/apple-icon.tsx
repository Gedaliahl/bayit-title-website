import { iconImage } from '@/lib/og';

// iOS renders this on a home screen at 180px. The browser tab icon is the
// static app/icon.svg; only Apple's touch icon has to be a raster.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return iconImage(180);
}
