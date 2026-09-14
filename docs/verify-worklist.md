# VERIFY worklist

Every unresolved fact across the nine content drafts, triaged by **who can
answer it**. 62 flags at the start; **49 now**.

**Category A is done** (2026-09-14). The public-record questions were answered
from the statute, the rule or the federal source itself, and every figure or
deadline on those pages is now linked to the section it came from. Two were
deliberately left open and are marked as such in the content: tenancy by the
entireties, which turns on case law rather than a statute and needs an
attorney's statement; and the FAR/BAR contract's treatment of open permits,
which needs the licensed form rather than a summary of it. Three narrower flags
were added where a resolved flag had an underwriting or practice question inside
it — an apostille requirement, a FIRPTA role, a discharge timeline.

What is left is what was always going to need a person: Category B (First
American) and Category C (only Bayit Title knows). **No page reaches zero
without Category C**, because every one of the nine carries a "Typical timeline"
and a "Cost impact" quick fact that only someone who works the files can
answer.

The point of this document is to stop treating the flags as one undifferentiated
blocker. Most of them are not research problems at all — they are questions only
Bayit Title can answer, and they can be cleared in an afternoon by one person
who works the files.

**Chapter pointers below come from the source list in `claude-project-brief.md`,
which the team supplied. No section numbers are asserted anywhere in this
document — locating the section is part of the verification.**

---

## How to clear a flag

1. Find the answer in the primary source, or from the team's own knowledge.
2. Replace the whole `[VERIFY: ...]` marker with the verified statement.
3. Cite statutes as `Fla. Stat. § X.XX` on first use, linked to Online Sunshine.
4. When a page has **zero** flags left, change its front-matter `status: draft`
   to `status: reviewed` and add `author`, `reviewed_on`, `next_review`.

The build refuses to publish a page marked `reviewed` that still contains a
flag, so step 4 cannot be taken early by accident.

---

## Category A — Public record (~18 flags) — **cleared 2026-09-14**

Answerable from primary sources by anyone willing to read them. **Nobody should
write these from memory or from a search-engine summary**; open the statute.

Each was answered from the primary source and cited in the page. What they
turned out to say, in short:

| Question | Answer now on the page |
|---|---|
| Judgment lien mechanism and duration | Certified copy recorded, with the lienholder's address; 10 years, extendable once by 10; never past 20 from entry (§§ 55.10, 55.081) |
| Homestead vs. judgment liens | Fla. Const. art. X, § 4(a) — no judgment is a lien, except taxes, purchase/improvement/repair, and labor on the realty; limit is 160 acres / half an acre, not value |
| Lis pendens | § 48.23 — contents and effect; 1 year where the action is not on a recorded instrument or construction lien; court may control, discharge or bond it |
| Landlocked access | § 704.01(1) implied grant; § 704.01(2) statutory way of necessity, limited to dwelling, agricultural, timber or stockraising use; § 704.04 sends a contested one to circuit court with compensation |
| Association approval deadline | **There isn't one.** Neither ch. 718 nor ch. 720 caps it; the declaration does. Condo approval fee capped at $150 per applicant (§ 718.112(2)(k)); ch. 720 sets no equivalent cap |
| Estoppel certificate | 10 business days; binding 30 days (hand/electronic) or 35 (mail); $250, plus $150 delinquent and $100 expedited, with aggregate caps; no fee at all if late (§ 718.116(8), § 720.30851) |
| Remedy when an association is late | Loses the fee, and § 720.30851 allows a summary proceeding with attorney fees |
| Deed execution | Two subscribing witnesses (§ 689.01(1)) **and** acknowledgment for recording (§ 695.03) — cumulative, not alternative |
| RON for a signer abroad | Allowed. The notary must be in Florida, the signer need not be (§ 117.209(3), (4)); a foreign passport is acceptable ID for a principal outside the US (§ 117.201(6)); only matrimony is excluded |
| Foreign acknowledgment | § 695.03(3) accepts a foreign notary with an official seal, a civil-law notary, a commissioner of deeds, or a US consular officer. **The apostille is not in the statute** — it is an underwriter/clerk practice |
| Power of attorney | Executed in the same manner as a deed; does not dispense with spousal joinder on homestead (§ 689.111) |
| FIRPTA | 15% of the amount realised; no withholding at $300,000 or less and 10% to $1,000,000 where the buyer takes it as a residence; Forms 8288, 8288-A, 8288-B (26 U.S.C. § 1445) |
| Bankruptcy sale order | 14-day stay (FRBP 6004(h)), 14 days to appeal (FRBP 8002(a)(1)), and a good faith purchaser is protected on reversal unless the sale was stayed (11 U.S.C. § 363(m)) |

| Page | Question | Where the brief says to look |
|---|---|---|
| foreign-seller | Deed execution: witnesses and acknowledgment | ch. 689, ch. 695 |
| foreign-seller | Does the RON statute restrict a signer located outside the US? Excluded document types? | ch. 117 |
| foreign-seller | Form of foreign acknowledgment Florida accepts for recording; role of the Hague apostille | ch. 695 |
| foreign-seller | Requirements for a power of attorney used to convey real property | ch. 689 |
| foreign-seller | FIRPTA: current withholding rate, thresholds, exemptions, forms, settlement agent's role | IRS (+ tax counsel) |
| hoa-approval | Does Florida cap the time an association may take to approve a transfer? Consequence if it lapses? | ch. 718 (condo), ch. 720 (HOA) |
| hoa-approval | Estoppel certificate: statutory delivery deadline, fee caps, how long it binds | ch. 718, ch. 720 |
| hoa-approval | Remedy when an association misses a statutory window | ch. 718, ch. 720 |
| hoa-approval | Application and transfer fee caps | ch. 718, ch. 720 |
| judgment | How a recorded judgment becomes a lien on real property | (not in the source list — see gaps below) |
| judgment | Duration of a judgment lien and the re-recording rules | (not in the source list) |
| judgment | Homestead's effect on judgment liens: constitutional and statutory basis, exceptions | ch. 732 + Fla. Const. |
| judgment | Judgment against one spouse vs. tenancy by the entireties | (not in the source list) |
| litigation | Lis pendens: statutory basis, effect, duration, discharge | (not in the source list) |
| litigation | Procedure and timeline for discharging a lis pendens | (not in the source list) |
| access | Landlocked remedies: statutory way of necessity, easement by necessity, prescriptive easement | (not in the source list) |
| signings | RON statutory basis and limits | ch. 117 |
| bankruptcy | Appeal period for a sale order, effect of a stay, good-faith purchaser finding | (federal — see gaps below) |

### Gaps in the project's own source list

Six of the questions above have **no corresponding source** in
`claude-project-brief.md`. That list should be extended before this work starts:

- **Judgment liens** — the chapter governing liens on real property from
  recorded judgments
- **Lis pendens** — the chapter governing notices of pending litigation
- **Easements and ways of necessity** — the chapter governing access
- **Tenancy by the entireties** — likely case law rather than statute, which
  means counsel, not a citation
- **Federal bankruptcy** — the Bankruptcy Code and Rules are not in the source
  list at all. Sale orders, free-and-clear provisions and appeal periods are
  federal. This probably needs bankruptcy counsel rather than a web citation.

One more: the FAR/BAR contract's treatment of open permits needs **the actual
contract form**, not a summary of it. That form is licensed, not a public
statute.

---

## Category B — First American only (~8 flags)

These are underwriting positions. They cannot be sourced from the public web,
and a wrong one is a coverage problem rather than a content error. The brief
permits First American material **only where the team supplies the bulletin**.

Ask your First American agency rep for a written position on:

1. Coverage position on **open permits and code enforcement**, and whether any
   endorsement addresses it
2. Position on **RON**, including out-of-country signers and excluded document
   types
3. Whether an **access endorsement** is available where the record does not
   establish legal access, and the standard exception language in our commitments
4. The **identity affidavit** form accepted for a name-match judgment, and what
   further documentation is required
5. Position on **pending litigation / recorded lis pendens**, and whether it
   differs by what the suit seeks
6. Requirements for a **bankruptcy sale order** before closing
7. Requirements for **foreign acknowledgments**
8. How a **closed prior bankruptcy** in the chain is cleared

One request to your rep covers most of this. It is probably the single highest
-leverage hour available on this project.

---

## Category C — Only Bayit Title knows (~36 flags)

**This is the bulk of the work, and none of it is research.** No external source
exists. One person who works the files can clear most of these in an afternoon.

### Our timelines — what we actually see
- Open permit close-out, by municipality
- HOA application to approval; and the fastest turnaround we have documented
- Judgment payoff and release, once the creditor is identified
- Resolving an access exception by recorded easement
- Scheduling lead time for each signing route
- How a bankruptcy sale order's dates shape a closing schedule

### Our costs
- Permit close-out: re-inspection, after-the-fact permit, contractor
- Recorded easement: survey sketch and legal description
- Consular fees, apostille, courier where wet ink is required
- Whether mobile signing or RON carries a separate fee, and how it appears on
  the closing statement
- Whether bankruptcy files carry additional search or examination cost

### Our practice
- Is a municipal lien search ordered on every purchase, or only on request?
- What we check first on a non-standard contract, in order
- What we examine differently where a seller acquired recently
- What we do where a seller is in active litigation, including where we decline
- Items we require from a bankruptcy sale order
- How far we travel for a mobile signing; whether a signing service is used
  outside the three counties
- How much notice we ask for each signing type

### Two pages that need their underlying file back
`litigation-against-seller-flip-florida` and
`non-standard-purchase-contract-florida-closing` are marked incomplete in the
drafts themselves. They were written from a description that omitted the title
mechanics. They need: what the search returned, what was recorded, what was
required to close, how long it took. Without that they should stay unpublished —
they are the two weakest pages and no amount of research fixes them.

### One licensing statement — do not guess
**Which team members hold Florida online notary commissions**, or which RON
platform is used and under whose commission the notarial act is performed. This
is a licensing claim on a licensed agency's website. It must come from the
commission records, and nowhere else.

---

## Suggested order

1. **Category C timelines and practice** — an afternoon with someone who works
   the files. Clears over half the flags and adds the specificity that makes
   these pages worth reading.
2. **One email to the First American rep** — clears Category B.
3. ~~**Category A**~~ — done. What remains of it is the entireties question
   (an attorney's, not a citation's) and the FAR/BAR form.
4. **Recover the two incomplete files** or drop those pages.

Pages closest to publishable once C is done: `open-permits`,
`hoa-approval-delay`, `no-legal-access`.
