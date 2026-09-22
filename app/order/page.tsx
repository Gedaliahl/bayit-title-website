import type { Metadata } from 'next';

import { getCounties } from '@/lib/locations';
import { officeHoursLine, site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { OrderForm } from '@/components/OrderForm';
import { baseOpenGraph, metaDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Open a title order',
  description: metaDescription(`Open a Florida title order with ${site.legalName}. Send the property address and the contract terms and we will open the file and order the search.`),
  alternates: { canonical: '/order' },
  openGraph: { ...baseOpenGraph, url: '/order' },
};

export default async function OrderPage() {
  const counties = await getCounties();

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Open an order', path: '/order' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Open a title order</h1>
        <p className="lede">
          Give us the address and what you know about the transaction. We open the file, order the
          search, and come back to you with the commitment and anything on it that needs clearing.
        </p>
        <p className="form-note">
          Fields marked optional can be filled in later. The address is the one thing we cannot
          start without. Office hours are {officeHoursLine}; orders sent outside those hours are
          picked up the next business morning.
        </p>

        <OrderForm counties={counties.map((c) => ({ value: c.slug, label: c.name }))} />
      </div>
    </div>
  );
}
