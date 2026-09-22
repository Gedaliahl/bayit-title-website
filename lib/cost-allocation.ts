// Which side of the closing table each line lands on.
//
// Nothing in this file is promulgated or statutory, which is why it is not in
// lib/statutory-rates.ts or lib/promulgated-premium.ts. The statute taxes the
// deed; it does not say who pays it. The rule sets the premium; it does not say
// whose side of the statement it sits on. The purchase contract decides that,
// with local custom as the starting point.
//
// Two kinds of line are told apart here, because they are not equally
// negotiable and a reader should not be left to guess which is which:
//
//   by nature  — the line has no other side. A seller has no new loan, so the
//                lender's policy, the documentary stamp tax and intangible tax
//                on the mortgage, and the recording of it, are never a seller's
//                to pay. This is the reason the estimate is split by party at
//                all rather than simply totalled.
//   by custom  — the line falls one way in ordinary Florida practice and the
//                other way the moment the contract says so. Every one of these
//                says so on the line it is printed on.
//
// Where the custom itself is a county's, it is read off the locations table —
// the same `customaryOwnerPolicyPayer` the county and city pages print — and
// never typed in here. A county nobody has verified yet gets 'either', which
// shows the line to both sides and says that the contract decides.

export type Party = 'buyer' | 'seller';

/** 'either' — the line is shown to both sides, because nobody has told us. */
export type Payer = Party | 'either';

export interface Allocation {
  payer: Payer;
  /** Why it sits there, printed on the line. Never left out. */
  note: string;
}

export const PARTIES: Party[] = ['buyer', 'seller'];

export function isParty(value: string | null | undefined): value is Party {
  return value === 'buyer' || value === 'seller';
}

/** Does a line allocated this way belong on the statement the reader asked for? */
export function payableBy(payer: Payer, party: Party): boolean {
  return payer === 'either' || payer === party;
}

/**
 * The borrower's, and only ever the borrower's.
 *
 * A seller is not borrowing, so there is no version of these lines that lands
 * on the seller's side of a purchase. They are the reason a single total was
 * misleading: a seller reading one was reading a buyer's loan costs.
 *
 * The note is three words where the others are a sentence, because this one
 * repeats on up to five lines of the same statement and the hint above the
 * party toggle has already said why none of them has a seller's side.
 */
export const BORROWER_ONLY: Allocation = {
  payer: 'buyer',
  note: 'The borrower’s alone.',
};

/**
 * Documentary stamp tax on the deed, and Miami-Dade's surtax with it.
 *
 * s. 201.02 taxes the deed and names nobody to pay it. In ordinary Florida
 * practice it is the seller's, and the standard contract forms allocate it in
 * a paragraph a reader can point at — so it is put on the seller here and the
 * line says that the contract, not the statute, is what put it there.
 */
export const DEED_TAX: Allocation = {
  payer: 'seller',
  note: 'Customarily the seller’s in a Florida sale. The statute taxes the deed without saying who pays; the contract allocates it.',
};

/** The buyer records the deed they are taking, by the same ordinary practice. */
export const DEED_RECORDING: Allocation = {
  payer: 'buyer',
  note: 'Customarily the buyer’s — it is the buyer’s deed being put on record. The contract can say otherwise.',
};

/**
 * The owner's policy, which is the one line the county actually moves.
 *
 * `custom` is the locations table's `customaryOwnerPolicyPayer` for the county
 * in the selector: 'buyer' in the counties where the buyer customarily pays and
 * chooses the closing agent, 'seller' where the seller does, and null in a
 * county nobody has verified — including 'another Florida county', which is
 * sixty-odd counties at once and cannot have one answer.
 */
export function ownerPolicyAllocation(
  custom: string | null | undefined,
  countyName: string,
): Allocation {
  if (isParty(custom)) {
    return {
      payer: custom,
      note: `Customarily the ${custom}’s in ${countyName}. Custom is not law — the contract decides, and it is worth reading which paragraph does it.`,
    };
  }

  return {
    payer: 'either',
    note: 'Shown on both sides: who pays for the owner’s policy is local custom and the contract’s to settle, and we have not verified the custom for this county.',
  };
}

/** Joins an allocation's reason to whatever the line already had to say. */
export function withAllocation(note: string | undefined, allocation: Allocation): string {
  return note ? `${note} ${allocation.note}` : allocation.note;
}
