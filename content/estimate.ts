// Every word on /estimate that is not a figure, kept in one place.
//
// The page is the one place on the site where three tools share a screen, so
// its copy is long and lives in many small pieces — a hint under a box, a line
// in a card foot, a sentence that changes with the mode. Written here rather
// than in the components so that a copy change is a change to one file, and so
// the sentences can be read in order without the markup around them.
//
// The figures the copy sits beside come from lib/ — the promulgated schedule,
// the statutory rates and the two estimators — and are never restated here.

import { QUOTE_RETENTION_DAYS } from '@/lib/documents';
import { site } from '@/lib/site';

export type EstimateMode = 'address' | 'numbers' | 'upload';

export const ESTIMATE_MODES: EstimateMode[] = ['address', 'numbers', 'upload'];

export const DEFAULT_MODE: EstimateMode = 'address';

export function isEstimateMode(value: string | null | undefined): value is EstimateMode {
  return value === 'address' || value === 'numbers' || value === 'upload';
}

/** The masthead's own description of the page. */
export const META = {
  title: 'What a Florida closing costs, before anyone’s fee',
  description:
    'Price a Florida closing three ways: from an address alone, off the county’s own record; ' +
    'from the contract numbers; or send us the contract and we reply with the exact figure. ' +
    'The premium is promulgated and the taxes are statutory, so every line is cited to the ' +
    'rule or the statute.',
};

export const HERO = {
  crumb: 'Estimate',
  title: 'What a Florida closing costs, before anyone’s fee',
  lede:
    'The title insurance premium is promulgated and the taxes and recording charges are ' +
    'statutory, so most of a closing statement is arithmetic anybody can check. Price it three ' +
    'ways: from an address alone, off the county’s own record; from the contract numbers when ' +
    'you have them; or send us the contract and we reply with the exact figure, our fees ' +
    'included.',
  proof: [
    'Every figure cited to the rule or the statute',
    'The two estimators run in your browser — nothing stored, nothing sent to us',
  ],
};

export const ROUTER = {
  eyebrow: 'Three ways in',
  headline: 'Do you have a contract price?',
  rows: {
    address: {
      label: 'Not yet — start from the address',
      sub: 'County and assessed value off the appraiser’s roll. A floor, not a quote.',
    },
    numbers: {
      label: 'Yes — enter the numbers',
      sub: 'Price, loan, county, reissue. Every figure set by rule or statute.',
    },
    upload: {
      label: 'Yes — send us the contract',
      sub: 'We read it and reply with exact pricing, itemised, within one business day.',
    },
  },
  prompt: 'Rather talk it through?',
};

export const BAND = {
  heading: 'Run the figures',
  caption: 'The premium is the rule’s, not ours — there is nothing to trade for it',
  tablist: 'How to price it',
  selected: 'Selected',
};

export const TABS: Record<EstimateMode, { eyebrow: string; title: string; body: string }> = {
  address: {
    eyebrow: 'Option 1 · From an address',
    title: 'Approximate, off the county record',
    body:
      'Type the address and pick the property. The county and the assessed value come off the ' +
      'appraiser’s roll, and the premium, deed tax and recording are priced on them.',
  },
  numbers: {
    eyebrow: 'Option 2 · From the numbers',
    title: 'Exact, from the contract',
    body:
      'Price, loan, county, whether the reissue rate applies and how long the documents run. ' +
      'Every figure is set by the rule or the statute it cites.',
  },
  upload: {
    eyebrow: 'Option 3 · From the contract',
    title: 'Exact, from us',
    body:
      'Upload the signed contract. We read the price, the parties and the dates off it and reply ' +
      'with the full itemised figure — our fees included — within one business day.',
  },
};

export const FORM = {
  address: {
    label: 'Property address',
    hint: 'Start typing and pick the property. Where the roll can be read, the assessed value comes with it.',
    placeholder: '1409 NW 48th St, Boca Raton',
    listLabel: 'Matching properties',
    looking: 'Looking…',
    nothing: 'No property found for that. Type the value in below and the figures still work.',
    valueOnPick: 'Value on pick',
    noRoll: 'No roll to read',
  },
  transaction: {
    label: 'What is the transaction?',
    purchase: 'A purchase',
    refinance: 'A refinance',
  },
  party: {
    label: 'Whose side are you on?',
    buyer: 'Buyer',
    seller: 'Seller',
    hint:
      'Some of these lines have no other side — a seller has no new loan, so the lender’s ' +
      'policy, the mortgage taxes and the mortgage recording are never theirs. The rest is ' +
      'ordinary Florida practice, and the contract can move any of it.',
    refinanceHint: 'A refinance has one side of the table, so everything below is the borrower’s.',
  },
  county: {
    label: 'County',
    hint: (address: boolean) =>
      'Where the property is. It decides the documentary stamp rate on the deed' +
      (address ? ' and which property appraiser publishes the value.' : '.'),
    fromParcel: (countyName: string) => `From the parcel you picked, in ${countyName}.`,
    elsewhere: 'Another Florida county',
  },
  assessed: {
    label: 'Assessed value',
    reading: 'Reading the parcel off the roll…',
    /** "{Assessed value} on the {2025} roll, from the {source} · parcel {id}." */
    onRoll: {
      assessed: 'Assessed value',
      just: 'Just (market) value',
      onThe: (year: number | null) => (year ? ` on the ${year} roll` : ''),
      fromThe: ', from the ',
      parcel: (id: string | null) => (id ? ` · parcel ${id}` : ''),
      filedAs: (address: string) => ` The roll files that parcel as ${address}.`,
    },
    declined:
      'The roll would not confirm a parcel at that address, so this one is yours to fill in. Look the parcel up on the ',
    unavailable:
      'The state’s parcel service did not answer just then — pick the property again, or look it up on the ',
    pickOr: 'Pick the property above and this fills itself in, or look the parcel up on the ',
    lookUp: 'Look the parcel up on the ',
    appraiser: (countyName: string) => `${countyName} Property Appraiser`,
    copyAcross: ' and copy the assessed or just value across.',
    anyCounty:
      'From that county’s property appraiser record for the parcel. Every Florida county publishes one.',
    justAlso: (just: string) =>
      `The appraiser also puts the just (market) value at ${just}, which is nearer what a policy would be written for.`,
    assessedIs: (assessed: string) => `Assessed value is ${assessed}.`,
    useInstead: 'Use that instead',
  },
  price: {
    label: 'Purchase price',
    hint: 'The owner’s policy is written for the full insurable value.',
  },
  loan: {
    label: 'Loan amount',
    purchaseHint: 'Leave empty for a cash closing.',
    refinanceHint: 'The new loan.',
  },
  reissue: {
    label: 'The reissue rate applies',
    sub: '— the owner or seller was insured within three years.',
    link: 'The conditions',
  },
  prior: {
    label: 'What the previous policy insured',
    hint:
      'The face amount of the old owner’s policy. The reissue rate reaches that far; anything ' +
      'above it is at the original rate. Leave it empty and the figure reads low.',
  },
  singleFamily: {
    label: 'It is a single-family residence',
    sub: '— Miami-Dade charges a 45¢ surtax on everything else',
  },
  pages: {
    label: 'Page counts',
    hint:
      'Recording is charged by the page — $10.00 for the first and $8.50 for each after it, ' +
      'plus $5.50 a document to e-record it. These are ordinary lengths; change them if you know ' +
      'the documents.',
    deed: 'Pages in the deed',
    mortgage: 'Pages in the mortgage',
  },
};

export const RESULT = {
  eyebrow: {
    address: 'Approximate — a floor, not a quote',
    numbers: 'Every line cited to whatever sets it',
  },
  /** Whose statement the total is. A refinance has one side and it is the borrower's. */
  totalLabel: (purchase: boolean, party: 'buyer' | 'seller') =>
    purchase ? `The ${party}’s side` : 'The borrower’s side',
  nothingYet: 'Nothing priced yet.',
  /** "A purchase in Palm Beach County, priced on the 2025 roll figure." */
  sub: (purchase: boolean, county: string, rollYear: number | null) =>
    `${purchase ? 'A purchase' : 'A refinance'} in ${county}` +
    (rollYear ? `, priced on the ${rollYear} roll figure` : '') +
    '.',
  outsideDade: 'a Florida county outside Miami-Dade',
  subtotal: 'Subtotal',
  totalNote:
    'Set by the rule, the statute or the clerk, except the lender’s policy and the e-recording ' +
    'fee, which are ours and say so on the line. Which side pays each of them is the contract’s.',
  /** "The seller carries about $3,500 of the same closing." */
  otherParty: (other: 'buyer' | 'seller', amount: string) =>
    `The ${other} carries about ${amount} of the same closing, on the lines above that are theirs.`,
  alternate: (otherRate: string, alternate: string, premium: string) =>
    `At the ${otherRate} the same coverage is ${alternate} in premium against ${premium}. ` +
    'The difference is what it is worth finding the old policy for.',
  notInIt: 'Not in it:',
  unknowns: {
    address:
      'The policy is written at the purchase price, not the assessed value — on most Florida ' +
      'homes the assessed figure is the lower of the two. Our settlement fee, the search and ' +
      'examination, endorsements, survey, municipal lien search, estoppels and association fees. ' +
      'Which side pays each line above is the contract’s to settle.',
    numbers:
      'Our settlement or closing fee; title search and examination; endorsements the lender asks ' +
      'for; survey, municipal lien search, estoppel letters and association fees; the lender’s own ' +
      'charges, prepaid interest, escrows and prorations. Which side pays each line above is the ' +
      'contract’s to settle — the split shown is ordinary Florida practice and no more than a ' +
      'starting point.',
  },
  empty: {
    addressPurchase: 'Pick the property above, or enter the assessed value, and the figures appear here.',
    addressRefinance: 'Enter the loan amount and the figures appear here.',
    numbers: 'Enter a price or a loan amount and the figures appear here.',
    // A seller's side has no loan on it, so a loan amount alone will not fill it.
    sellerNeedsPrice: 'Enter a price — a loan amount alone puts nothing on the seller’s side.',
  },
};

export const UPLOAD = {
  contract: {
    label: 'The contract',
    hint:
      'The signed purchase agreement, or the loan estimate on a refinance. PDF or a photo of each ' +
      'page; up to 25 MB in all.',
    dropTitle: 'Drop the contract here',
    dropActive: 'Let go to add it',
    ready: (count: number) => `${count} file${count === 1 ? '' : 's'} ready`,
    dropSub: 'or click to choose a file',
    dropSubMore: 'Add another page or choose a different file',
    remove: (name: string) => `Remove ${name}`,
    /** Ends the reason a file was not added: "… — PDF, JPG, PNG or HEIC only". */
    typeLabel: 'PDF, JPG, PNG or HEIC',
  },
  name: { label: 'Your name' },
  role: {
    label: 'You are the',
    options: [
      { value: 'buyer', label: 'Buyer' },
      { value: 'seller', label: 'Seller' },
      { value: 'borrower', label: 'Borrower, refinancing' },
      { value: 'agent', label: 'Realtor' },
      { value: 'lender', label: 'Lender or mortgage broker' },
      { value: 'attorney', label: 'Attorney' },
    ],
  },
  email: { label: 'Email', hint: 'Where the itemised figure goes.' },
  phone: { label: 'Phone', optional: '(optional)', hint: 'Only if a page is unreadable.' },
  note: {
    label: 'Anything we should know',
    optional: '(optional)',
    hint:
      'A prior policy on the property, a lender who asks for particular endorsements, a closing ' +
      'date that is near.',
  },
  status: 'One business day for a readable contract. No obligation.',
  sending: 'Sending…',
  uploading: (done: number, total: number) => `Sending page ${done} of ${total}…`,
  /** While pages are in flight: leaving now loses them. */
  uploadingNote: 'Keep this page open until the pages have gone.',
  submit: `Send it to ${site.name}`,
  errors: {
    noFiles: 'Add the contract first — a PDF or a photo of each page.',
    tooLarge: 'That is over 25 MB together. Drop a page or send the rest by email.',
    noName: 'Tell us your name so we know who to write back to.',
    badEmail: 'That email does not look complete.',
    failed: `We could not send that. Email ${site.email} or call ${site.phoneDisplay}.`,
    // No answer is not the same as a refusal: the request may be in the office.
    noAnswer:
      `We did not hear back, so we cannot tell whether that reached us. Call ${site.phoneDisplay} ` +
      'before sending it again.',
    botCheck: 'Wait a moment for the check above the button to finish, then send again.',
  },
  sent: {
    eyebrow: 'Received',
    title: (firstName: string) =>
      `Thank you${firstName ? `, ${firstName}` : ''}. It is in the office.`,
    body: (count: number, email: string, willCall: boolean) =>
      count === 0
        ? 'Your details reached us, but none of the contract did, so there is nothing for us to ' +
          'price yet.'
        : `${count} file${count === 1 ? '' : 's'} received. We will read the contract and email the ` +
          `itemised figure to ${email} within one business day. If a page is unreadable we will ` +
          `${willCall ? 'call' : 'write'} first.`,
    // There is no confirmation email to reply to; the office's own address is
    // the one the pages would have gone to anyway.
    missing: (count: number) =>
      `${count === 1 ? 'This file' : 'These files'} did not reach us — email ` +
      `${count === 1 ? 'it' : 'them'} to ${site.ordersEmail}:`,
    wrongFile: 'Sent the wrong file?',
    again: 'Send another',
    orCall: `or call ${site.phoneDisplay}.`,
  },
  aside: {
    eyebrow: 'Exact pricing, from the documents',
    title: 'What comes back',
    sub:
      'A closing-cost itemisation on our letterhead, by email, within one business day of a ' +
      'readable contract.',
    sections: [
      {
        title: 'What the estimator already prices',
        body:
          'The owner’s and lender’s premiums at the rate that actually applies, documentary stamp ' +
          'and intangible tax on the real consideration, recording at the true page counts.',
      },
      {
        title: 'What only we can add',
        body:
          'Our settlement fee, title search and examination, the endorsements your lender will ' +
          'ask for, the municipal lien search and estoppel letters, and who pays what under the ' +
          'contract’s own terms.',
      },
    ],
    file: {
      title: 'What we do with the file',
      body:
        'It goes to the office over an encrypted connection and is read by a person, not sold, ' +
        `and kept on this site for no longer than ${QUOTE_RETENTION_DAYS} days. No obligation ` +
        'either way.',
      more: 'More',
    },
  },
};

export const RAIL = {
  label: 'The detail',
  items: [
    { id: 'assessed-value', label: 'Where the assessed value comes from' },
    { id: 'county', label: 'What the county changes' },
    { id: 'sides', label: 'Which side pays what' },
    { id: 'floor', label: 'Why assessed value reads low' },
    { id: 'schedule', label: 'The schedule it works from' },
    { id: 'reissue', label: 'When the reissue rate applies' },
    { id: 'unknowns', label: 'What this does not know' },
    { id: 'privacy', label: 'What happens to the address' },
  ],
};

export const DETAIL = {
  assessedValue: {
    title: 'Where the assessed value comes from',
    p1:
      'Picking a property fills the figure in, and the line under the box says which office it ' +
      'came from, which parcel it belongs to and which year’s roll it is on. Nothing is estimated ' +
      'on the way: what you see is what the roll says. ',
    /** "In Broward, Palm Beach … the figure is the appraiser’s own …" */
    p1Counties: (counties: string) =>
      `In ${counties} the figure is the appraiser’s own, read straight off the roll they publish. ` +
      'Everywhere else it is the Department of Revenue’s copy of that county’s roll, found by where ' +
      'the address stands.',
    p2a:
      'It arrives two ways. A handful of appraisers publish their certified roll as an open data ' +
      'service, address and value in the same row, so the figure comes back with the suggestion. ' +
      'The rest publish where every address is but not what it is worth, so picking a property ' +
      'there reads the parcel off the ',
    p2Link: 'Department of Revenue’s statewide parcel roll',
    p2b:
      ' at the point it stands on. That second step checks itself: unless the parcel it finds ' +
      'carries the address you picked, you get an empty box and the appraiser’s link rather than ' +
      'the figure for the house next door.',
    p3: 'We would rather leave the box empty than fill it from a data broker’s copy of a roll we cannot cite.',
  },
  county: {
    title: 'What the county changes, and what it does not',
    p1a: 'It does not change the premium. The Office of Insurance Regulation sets title insurance rates by rule under ',
    p1b:
      ', and the schedule runs the same in Pensacola as it does in Key West. What the county does ' +
      'change is the tax on the deed: documentary stamp tax is 70¢ per $100 of consideration across ' +
      'Florida and 60¢ in Miami-Dade, which never applied the ten-cent increase in ch. 92-317, and ' +
      'Miami-Dade adds a 45¢ surtax on anything that is not a single-family residence.',
    p2a: 'That tax is charged on the ',
    p2em: 'consideration',
    p2b:
      ' — the price — and an estimate that starts from an address has no price in it. So the ' +
      'address option computes it on the appraiser’s value instead, says so on every line that ' +
      'does it, and keeps it in its own group away from the premium. On a sale above the assessed ' +
      'value, which is most sales, the real tax is higher.',
  },
  sides: {
    title: 'Which side pays what, and which lines have no other side',
    p1a:
      'The toggle above is not a filter on one list. Some of these lines genuinely have no other ' +
      'side: a seller is not borrowing, so the lender’s policy, the documentary stamp tax and ' +
      'intangible tax on the mortgage, and the recording and e-recording of it are never a ' +
      'seller’s to pay. Showing a seller one total with a buyer’s loan costs inside it was the ' +
      'thing worth fixing.',
    p2a: 'The rest is ',
    p2em: 'custom',
    p2b:
      ', which is not law. Documentary stamp tax on the deed is the seller’s in ordinary Florida ' +
      'practice — s. 201.02 taxes the deed and names nobody to pay it — and the buyer records the ' +
      'deed they are taking. Who pays for the owner’s policy is the one that really moves: in some ' +
      'counties it is customarily the buyer, who then chooses the closing agent, and in others the ' +
      'seller. Each of those lines says on its face which way custom put it.',
    p3:
      'That custom is read off the same county record the county and city pages print, not typed ' +
      'into the calculator. Where we have not verified it for a county — and “another Florida ' +
      'county” is sixty-odd counties at once — the owner’s policy is shown to both sides and says ' +
      'so. In every case the purchase contract is what settles it, and the contract can put any of ' +
      'these lines on either party. Read the paragraph that does it rather than assuming.',
  },
  floor: {
    title: 'Why assessed value, and where it goes wrong',
    p1a: 'A policy is written for the full insurable value of the property — on a sale, the purchase price. Florida’s ',
    p1em: 'assessed',
    p1b:
      ' value is a tax figure. On homestead property the annual increase in assessed value is ' +
      'capped by the Save Our Homes provision, so a house held for years can be assessed far below ' +
      'what it would sell for today. Other exemptions and classifications pull it down further.',
    p2:
      'That makes an assessed-value estimate useful and one-sided: the premium on the real coverage ' +
      'amount is usually higher than the figure it gives, rarely lower. If you have a contract ' +
      'price, use it — the second option works from a price and a loan amount and adds documentary ' +
      'stamp tax, intangible tax and recording on top. If you have the contract itself, the third ' +
      'option sends it to us and we price everything, our own fees included.',
  },
  schedule: {
    title: 'The schedule it works from',
    intro1: 'Per $1,000 of liability, from ',
    intro2:
      '. Any fraction of $100 counts as a full $100, and no policy is written for less than $100 ' +
      'in premium.',
    original: 'Original rates · (1)(a)',
    reissue: 'Reissue rates · (2)(a)',
    simultaneous:
      'Under (5)(a) the risk premium on a lender’s policy issued alongside the owner’s on the same ' +
      'land is $25 up to the owner’s amount, and the excess is rated at the original schedule. ' +
      'The estimator prints $125 on that line, because that is what this office charges to issue ' +
      'the policy — the $25 is the promulgated premium inside it, not the whole of it. The line ' +
      'cites us rather than the rule for exactly that reason.',
  },
  reissue: {
    title: 'When does the reissue rate apply?',
    notSure:
      'Not sure? Tick it and untick it. The difference is what it is worth digging the old policy ' +
      'out for, and we will check the rule against your file if you ask.',
    p2a:
      'Tick it and a second box appears, asking what the previous policy insured for. It is worth ' +
      'filling in. The reissue rate reaches only as far as the old policy did; under ',
    p2Link: 'R. 69O-186.003(2)(c)',
    p2b:
      ' anything above that amount is charged at the original schedule. Leave it empty and the ' +
      'whole figure is rated as reissue, which reads low on a property worth more now than when it ' +
      'was last insured — which is most of them.',
  },
  unknowns: {
    eyebrow: 'Not a quote',
    title: 'What this does not know',
    p1:
      'It does not know your file. It assumes one deed and one mortgage, an owner’s policy written ' +
      'at the price, and a lender’s policy issued at the same time on the same land. It does not ' +
      'price endorsements, and it cannot apply the new home purchase discount because that depends ' +
      'on the premium paid for the builder’s loan policy — a figure only the prior policy shows.',
    p2:
      'Not counted: our settlement or closing fee; title search and examination; endorsements the ' +
      'lender asks for; survey, municipal lien search, estoppel letters and association fees; the ' +
      'lender’s own charges, prepaid interest, escrows and prorations. Send us the price, the ' +
      'county and the contract date and we will itemise the rest against the actual documents.',
  },
  privacy: {
    title: 'What happens to the address you typed',
    p1:
      'It is sent to this site while you type, and this site asks the county property appraiser ' +
      'and the geocoder about it. That is the whole of it: nothing is written down, nothing is ' +
      'emailed to the office, no cookie is set, and the request is a POST so the address does not ' +
      'end up in a server log the way a search in a URL would. Turn the page and there is no ' +
      'record you were here.',
    p2:
      'The two estimators ask for nothing else because the premium is the rule’s, not ours, so ' +
      'there is nothing to trade for it. If you would rather send nothing at all, use the second ' +
      'option — the figures are computed in your browser either way, and the address box is only ' +
      'there to save you a trip to the property appraiser.',
    p3:
      'The third option is different, and says so: a contract you upload goes to the office over ' +
      'an encrypted connection with your name and email, so we can read it and write back. It is ' +
      'opened by a person, kept only as long as the quote is open unless you go on to open an ' +
      'order, and never sold or shared.',
    /** "Premium read from {rule} on {date}; the rule was last amended {date}. Taxes … on {date}." */
    note: (rule: string, premiumRead: string, amended: string, statutesRead: string) =>
      `Premium read from ${rule} on ${premiumRead}; the rule was last amended ${amended}. Taxes ` +
      `and recording charges read from the statutes on ${statutesRead}. If a figure here does not ` +
      'match what you are quoted, tell us — either the rule moved or we have something to correct.',
  },
};

export const CTA = {
  text: `Send the contract and ${site.name} will itemise the rest against the actual documents.`,
  action: 'Upload the contract',
};
