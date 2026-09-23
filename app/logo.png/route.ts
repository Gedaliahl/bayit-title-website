// The firm's mark as a 512px square, at a stable URL, for the `logo` in the
// Organization JSON-LD. Google asks for at least 112px on each side; the
// masthead PNG is 104 wide, and the icon routes carry a content hash in their
// URLs that changes whenever the icon does.

import { iconImage } from '@/lib/og';

export const dynamic = 'force-static';

export function GET() {
  return iconImage(512);
}
