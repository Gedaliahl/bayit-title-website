# VERIFY worklist

> ## Update, 20 September 2026 — the first answers are back
>
> The team answered the four open-permit questions. What they said is now on
> `content/title-problems/open-permits-before-closing-florida.md`, and what the
> draft had invented has come off it:
>
> - **Municipal lien search** — ordered on every file, not on request. This is
>   what the page already said. **Closed**, and out of that page's
>   `pending_confirmation`.
> - **Timeline** — two weeks in the ordinary case. The six-to-twelve week and
>   three-month figures were invented and are gone; what makes a file longer is
>   now named (permit type, jurisdiction, work status, inspections outstanding,
>   whether a licensed contractor or design professional is needed) instead of
>   guessed at. **Still open:** how long a complicated close-out actually runs,
>   and whether municipality matters enough to name.
> - **Cost** — there is no reliable flat fee; the file is scoped before an
>   estimate is given. The invented $75–$200 re-inspection fee and the "often
>   double" after-the-fact multiple are gone. **Still open:** whether the page
>   may publish any figure at all, even a re-inspection range. A page that gives
>   no order of magnitude sends the reader to ask an agent instead.
> - **Close-out routes** — five routes confirmed, plus a referral to an attorney
>   or another qualified professional where a file is not a clearance step at
>   all. **Still open:** whether the contractor affidavit / municipal amnesty
>   route the draft claimed is one we use; the team did not name it.
>
> Counted from the front-matter rather than from this document, the nine drafts
> now carry **41** `pending_confirmation` entries: **31** only the team can
> answer, **10** need First American or the licensed form. Of the 31, eight are
> verdict labels awaiting sign-off and **23 are substantive** — three on open
> permits (all three now answered with a follow-up attached), three each on the
> non-standard contract and litigation pages, two each on bankruptcy, foreign
> seller, HOA approval and access, one on judgments, and five on the signings
> page.
>
> Open permits still cannot publish: `OP-04` and `OP-06` are the First American
> email, and the verdict label needs sign-off.
>
> One contradiction surfaced while editing and was left alone because `OP-04`
> settles it: the page's `direct_answer` says an open permit is "normally the
> seller's to resolve," while the body says the close-out is the buyer's under
> FAR/BAR "AS IS" paragraph 12(c) and the seller only cooperates. One of the two
> is wrong.

---

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
answer it**. 62 flags at the start; **49 now**, of which one — the municipal
lien search question — was answered by the team on 20 September 2026 and three
more were answered with a follow-up left open (see the update at the top).

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

## Category C — Only Bayit Title knows (23 substantive questions, plus 8 verdict labels)

**This is the bulk of the work, and none of it is research.** No external source
exists. One person who works the files can clear most of these in an afternoon.

### Our timelines — what we actually see
- ~~Open permit close-out, by municipality~~ — **answered 2026-09-20**: two
  weeks in the ordinary case. What a complicated one runs is still open
- HOA application to approval; and the fastest turnaround we have documented
- Judgment payoff and release, once the creditor is identified
- Resolving an access exception by recorded easement
- Scheduling lead time for each signing route
- How a bankruptcy sale order's dates shape a closing schedule

### Our costs
- ~~Permit close-out: re-inspection, after-the-fact permit, contractor~~ —
  **answered 2026-09-20**: no reliable flat fee; the file is scoped first.
  Whether any figure may be published at all is still open
- Recorded easement: survey sketch and legal description
- Consular fees, apostille, courier where wet ink is required
- Whether mobile signing or RON carries a separate fee, and how it appears on
  the closing statement
- Whether bankruptcy files carry additional search or examination cost

### Our practice
- ~~Is a municipal lien search ordered on every purchase, or only on request?~~
  — **answered 2026-09-20**: every file. Closed
- ~~The close-out routes we actually work~~ — **answered 2026-09-20**: five
  routes, plus a referral where the file is not a clearance step. Whether we use
  a contractor affidavit or a municipal amnesty programme is still open
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
   these pages worth reading. **Started 2026-09-20 with open permits**, which
   took one round of four short answers; the other eight pages are the same
   shape of work.
2. **One email to the First American rep** — clears Category B.
3. ~~**Category A**~~ — done. What remains of it is the entireties question
   (an attorney's, not a citation's) and the FAR/BAR form.
4. **Recover the two incomplete files** or drop those pages.

Pages closest to publishable once C is done: `open-permits`,
`hoa-approval-delay`, `no-legal-access`.
