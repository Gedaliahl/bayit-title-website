// What Florida law says about a municipal code enforcement lien, taken from
// the text of the statute and cited to it. Read from Online Sunshine on the
// CHECKED_ON date below.
//
// This is the part of a city page that is the same in every city. Chapter 162
// is the Local Government Code Enforcement Boards Act, and every municipality
// with a page here runs its code enforcement under it — a special magistrate
// has "the same status as an enforcement board" (s. 162.03(2)). The fine caps,
// what makes the fine a lien, how long the lien lasts and what the city may
// do with it are all the Legislature's, not the city's. What the city owns is
// which hearing body it uses, where its cases are searched and how it handles
// a request to release or reduce a lien; that is in lib/municipal-records.ts.
//
// Nothing here is legal advice, and nothing here is a Bayit Title practice.
// It is the statute, quoted.

import type { CitedFigure } from './cited-figures';

/** The date each figure and quote below was last read from the statute itself. */
export const CHECKED_ON = '2026-09-20';

const SUNSHINE = 'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=';

const statute = (path: string) => `${SUNSHINE}${path}`;

export const URLS = {
  s16203: statute('0100-0199/0162/Sections/0162.03.html'),
  s16206: statute('0100-0199/0162/Sections/0162.06.html'),
  s16207: statute('0100-0199/0162/Sections/0162.07.html'),
  s16209: statute('0100-0199/0162/Sections/0162.09.html'),
  s16210: statute('0100-0199/0162/Sections/0162.10.html'),
  s16211: statute('0100-0199/0162/Sections/0162.11.html'),
  s170009: statute('0100-0199/0170/Sections/0170.09.html'),
  s180135: statute('0100-0199/0180/Sections/0180.135.html'),
} as const;

/**
 * The fines a code enforcement board or special magistrate may impose.
 *
 * Two sets of limits, both the statute's. Paragraph (2)(a) sets the defaults;
 * paragraph (2)(d) lets a county or a city of 50,000 people or more adopt the
 * higher set by a majority-plus-one vote of its governing body. Every city with
 * a page here is over 50,000, so which set applies is the city's ordinance,
 * not the statute — which is why both are printed and neither is asserted as
 * the city's. Where a city publishes its own limits they are quoted on its page.
 */
export const CODE_FINE_LIMITS: CitedFigure[] = [
  {
    label: 'Daily fine, first violation',
    amount: 'up to $250 per day; up to $1,000 per day where the city has adopted the higher limit',
    cite: 'Fla. Stat. § 162.09(2)(a), (d)',
    sourceUrl: URLS.s16209,
    note: 'For each day the violation continues past the compliance date the order set. The costs of repairs the city made may be added.',
  },
  {
    label: 'Daily fine, repeat violation',
    amount: 'up to $500 per day; up to $5,000 per day under the higher limit',
    cite: 'Fla. Stat. § 162.09(2)(a), (d)',
    sourceUrl: URLS.s16209,
  },
  {
    label: 'Irreparable or irreversible violation',
    amount: 'up to $5,000 per violation; up to $15,000 under the higher limit',
    cite: 'Fla. Stat. § 162.09(2)(a), (d)',
    sourceUrl: URLS.s16209,
    note: 'A one-time fine in place of a daily one, where the board finds the violation cannot be undone.',
  },
  {
    label: 'How long the lien lasts',
    amount: '20 years from recording of the order',
    cite: 'Fla. Stat. § 162.10',
    sourceUrl: URLS.s16210,
    note: 'Unless the city sues on it within that time.',
  },
  {
    label: 'When the city may foreclose',
    amount: '3 months after the lien is filed and remains unpaid',
    cite: 'Fla. Stat. § 162.09(3)',
    sourceUrl: URLS.s16209,
    note: 'Never against a homestead: the statute forbids foreclosing a code lien on homestead property.',
  },
];

export interface StatuteQuote {
  cite: string;
  sourceUrl: string;
  /** The statute's words, verbatim. */
  text: string;
}

/** What turns a fine into a lien, and what the lien reaches. */
export const LIEN_ATTACHES: StatuteQuote = {
  cite: 'Fla. Stat. § 162.09(3)',
  sourceUrl: URLS.s16209,
  text:
    'A certified copy of an order imposing a fine, or a fine plus repair costs, may be recorded in the public records and thereafter shall constitute a lien against the land on which the violation exists and upon any other real or personal property owned by the violator.',
};

/** The fine keeps running until compliance — the reason a stale case is never a fixed number. */
export const FINE_ACCRUES: StatuteQuote = {
  cite: 'Fla. Stat. § 162.09(3)',
  sourceUrl: URLS.s16209,
  text:
    'A fine imposed pursuant to this part shall continue to accrue until the violator comes into compliance or until judgment is rendered in a suit filed pursuant to this section, whichever occurs first.',
};

/** The city, and only the city, can release it. */
export const CITY_MAY_RELEASE: StatuteQuote = {
  cite: 'Fla. Stat. § 162.09(3)',
  sourceUrl: URLS.s16209,
  text:
    'A lien arising from a fine imposed pursuant to this section runs in favor of the local governing body, and the local governing body may execute a satisfaction or release of lien entered pursuant to this section.',
};

/** A recorded order binds the buyer; compliance gets an order that says so, also recorded. */
export const ORDER_BINDS_PURCHASERS: StatuteQuote = {
  cite: 'Fla. Stat. § 162.07(4)',
  sourceUrl: URLS.s16207,
  text:
    'A certified copy of such order may be recorded in the public records of the county and shall constitute notice to any subsequent purchasers, successors in interest, or assigns if the violation concerns real property, and the findings therein shall be binding upon the violator and, if the violation concerns real property, any subsequent purchasers, successors in interest, or assigns. If an order is recorded in the public records pursuant to this subsection and the order is complied with by the date specified in the order, the enforcement board shall issue an order acknowledging compliance that shall be recorded in the public records.',
};

/** The city is entitled to its recording and satisfaction costs on top of the fine. */
export const RELEASE_COSTS: StatuteQuote = {
  cite: 'Fla. Stat. § 162.10',
  sourceUrl: URLS.s16210,
  text: 'The local governing body shall be entitled to collect all costs incurred in recording and satisfying a valid lien.',
};

/** What lets a large city fine more than the defaults. */
export const HIGHER_LIMITS: StatuteQuote = {
  cite: 'Fla. Stat. § 162.09(2)(d)',
  sourceUrl: URLS.s16209,
  text:
    'A county or a municipality having a population equal to or greater than 50,000 may adopt, by a vote of at least a majority plus one of the entire governing body of the county or municipality, an ordinance that gives code enforcement boards or special magistrates, or both, authority to impose fines in excess of the limits set forth in paragraph (a). Such fines shall not exceed $1,000 per day per violation for a first violation, $5,000 per day per violation for a repeat violation, and up to $15,000 per violation if the code enforcement board or special magistrate finds the violation to be irreparable or irreversible in nature.',
};

/** The one sentence a reduction request rests on. */
export const BOARD_MAY_REDUCE: StatuteQuote = {
  cite: 'Fla. Stat. § 162.09(2)(c)',
  sourceUrl: URLS.s16209,
  text: 'An enforcement board may reduce a fine imposed pursuant to this section.',
};

/** The factors the board weighs in setting a fine — the same ones a reduction request speaks to. */
export const FINE_FACTORS: StatuteQuote = {
  cite: 'Fla. Stat. § 162.09(2)(b)',
  sourceUrl: URLS.s16209,
  text:
    'In determining the amount of the fine, if any, the enforcement board shall consider the following factors: 1. The gravity of the violation; 2. Any actions taken by the violator to correct the violation; and 3. Any previous violations committed by the violator.',
};

/** A special magistrate is an enforcement board for every purpose here. */
export const SPECIAL_MAGISTRATE: StatuteQuote = {
  cite: 'Fla. Stat. § 162.03(2)',
  sourceUrl: URLS.s16203,
  text: 'A special magistrate shall have the same status as an enforcement board under this chapter.',
};

/** A former tenant's unpaid water bill is not the new owner's lien, with one exception. */
export const UTILITY_LIEN_LIMIT: StatuteQuote = {
  cite: 'Fla. Stat. § 180.135(1)(a)',
  sourceUrl: URLS.s180135,
  text:
    'no municipality may refuse services or discontinue utility, water, or sewer services to the owner of any rental unit or to a tenant or prospective tenant of such rental unit for nonpayment of service charges incurred by a former occupant of the rental unit; any such unpaid service charges incurred by a former occupant will not be the basis for any lien against the rental property or legal action against the present tenant or owner to recover such charges except to the extent that the present tenant or owner has benefited directly from the service provided to the former occupant.',
};

/** A special assessment lien ranks with the tax lien, ahead of everything else. */
export const ASSESSMENT_PRIORITY: StatuteQuote = {
  cite: 'Fla. Stat. § 170.09',
  sourceUrl: URLS.s170009,
  text:
    'The special assessments shall be payable at the time and in the manner stipulated in the resolution providing for the improvement; shall remain liens, coequal with the lien of all state, county, district, and municipal taxes, superior in dignity to all other liens, titles, and claims, until paid',
};
