'use client';

import { useId, useState } from 'react';

import { docStampGroups, docStampTotal } from '@/lib/doc-stamps';
import { EXAMPLE_LOAN, EXAMPLE_PRICE, discretionarySurtax, formatCents } from '@/lib/statutory-rates';
import { MoneyField } from '@/components/estimate/MoneyField';
import { FigureCard } from '@/components/estimate/FigureCard';

/**
 * Florida's documentary stamp tax and intangible tax, from a price, a loan and
 * a county. The county only matters for the deed: Miami-Dade's rate is lower
 * and it levies a surtax; the mortgage taxes are the same in all 67.
 *
 * The same boxes and the same card as the estimate page, and the same
 * functions under them (lib/doc-stamps.ts), so the two cannot disagree.
 */
export function DocStampCalculator({ counties }: { counties: { slug: string; name: string }[] }) {
  const id = useId();
  const [price, setPrice] = useState(EXAMPLE_PRICE);
  const [loan, setLoan] = useState(EXAMPLE_LOAN);
  const [countySlug, setCountySlug] = useState('broward-county');
  const [singleFamily, setSingleFamily] = useState(true);

  const surtaxApplies = discretionarySurtax(countySlug) !== null;
  const groups = docStampGroups({
    price,
    loanAmount: loan,
    countySlug,
    singleFamilyResidence: singleFamily,
  });
  const total = formatCents(docStampTotal(groups));
  const countyName = counties.find((county) => county.slug === countySlug)?.name ?? 'Florida';

  return (
    <div className="calc-grid">
      <form className="form-card" onSubmit={(event) => event.preventDefault()}>
        <MoneyField id={`${id}-price`} label="Sale price" value={price} onChange={setPrice} />
        <MoneyField
          id={`${id}-loan`}
          label="Loan amount"
          hint="Leave it at 0 for a cash sale, which carries no mortgage taxes."
          value={loan}
          onChange={setLoan}
        />

        <div className="field">
          <label htmlFor={`${id}-county`}>County</label>
          <span className="field__hint" id={`${id}-county-hint`}>
            The deed rate is the same in 66 counties. Miami-Dade is the exception.
          </span>
          <select
            id={`${id}-county`}
            aria-describedby={`${id}-county-hint`}
            value={countySlug}
            onChange={(event) => setCountySlug(event.target.value)}
          >
            {counties.map((county) => (
              <option key={county.slug} value={county.slug}>
                {county.name}
              </option>
            ))}
          </select>
        </div>

        {surtaxApplies ? (
          <label className="check">
            <input
              type="checkbox"
              checked={singleFamily}
              onChange={(event) => setSingleFamily(event.target.checked)}
            />
            <span>
              <strong>It is a single-family residence</strong>{' '}
              <span className="check__sub">— the surtax is not charged on one.</span>
            </span>
          </label>
        ) : null}
      </form>

      <FigureCard
        eyebrow="Documentary stamp tax"
        total={total}
        sub={`${loan > 0 ? 'A financed sale' : 'A cash sale'} in ${countyName}.`}
        groups={groups}
        totalLabel="Transfer taxes"
        totalNote="Every line is set by statute. Which side pays each is the contract’s."
        alternateText={null}
        otherPartyText={null}
        unknownsText="the title premium, recording, and every fee. The Florida closing cost calculator adds them."
        emptyText="Enter a sale price to see the tax on the deed."
      />
    </div>
  );
}
