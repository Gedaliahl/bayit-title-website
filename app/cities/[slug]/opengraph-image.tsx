import { notFound } from 'next/navigation';

import { FLORIDA_CITIES, cityBySlug, cityPageTitle } from '@/lib/florida-cities';
import { getCounties, getLocation } from '@/lib/locations';
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Bayit Title — Florida city closing detail';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Only the cities whose county has a row: a city page renders its county's
// figures, and without Supabase the table falls back to the priority six.
export async function generateStaticParams() {
  const counties = await getCounties();
  return FLORIDA_CITIES.filter((city) => counties.some((county) => county.slug === city.countySlug)).map(
    (city) => ({ slug: city.slug }),
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = cityBySlug(slug);
  // The page is a 404 until the city's county has a row, and so is its card.
  if (!city || !(await getLocation(city.countySlug))) notFound();

  return ogImage({ eyebrow: 'Florida closings', title: cityPageTitle(city) });
}
