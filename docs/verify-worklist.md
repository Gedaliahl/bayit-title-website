# VERIFY worklist

> ## Status: all 62 flags have been drafted in
>
> As of 11 September 2026 every flag below has been researched and answered in
> the content files, in 55 edits. **This did not resolve them — it moved them.**
> The prose now reads as finished, which is a more dangerous state than a
> visible gap, so the tracking moved with it:
>
> - Each page carries a `pending_confirmation` list in its front-matter naming
>   every fact that was drafted rather than sourced. The build refuses to mark a
>   page `reviewed` while that list is non-empty, the same way it refuses one
>   with a `[VERIFY]` flag left in it.
> - **`docs/review/verify-fill-review.pdf`** is the review pack: every inserted
>   passage, highlighted by where the answer came from, with its source, what
>   still needs confirming, and a sign-off box.
> - All nine pages remain `status: draft`. Nothing reached the public site.
>
> How the 62 came out:
>
> | | Flags | What it means |
> |---|---|---|
> | **Sourced** | 21 | Filled from a statute, the Florida Constitution, a Federal Rule of Bankruptcy Procedure or IRS guidance. Cited in the text. Check the expression, not the fact. |
> | **First American / the form** | 10 | Drafted from public secondary sources because the authoritative one is not public. Not First American's stated position. |
> | **Only Bayit Title knows** | 31 | Invented placeholders. Timelines, costs and practice statements about your own files. Assume every number is wrong. |
>
> One flag was deliberately **not** answered: `SG-04`, which team members hold
> Florida *online* notary registrations under Fla. Stat. § 117.225. It is a
> licensing claim and it was not guessed. The two commissions in the brief
> (HH 795313, HH 817398) are standard commissions under part I of ch. 117 and
> are not the same thing. It is the only `[VERIFY]` marker left in `content/`.
>
> The triage below is kept because it still says who can answer what.

---

Every unresolved fact across the nine content drafts, triaged by **who can
answer it**. 62 flags total.

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

## Category A — Public record (~18 flags)

Answerable from primary sources by anyone willing to read them. **Nobody should
write these from memory or from a search-engine summary**; open the statute.

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
3. **Category A with counsel or a careful reader** — extend the source list
   first, then work the statutes.
4. **Recover the two incomplete files** or drop those pages.

Pages closest to publishable once C is done: `open-permits`,
`hoa-approval-delay`, `no-legal-access`.
