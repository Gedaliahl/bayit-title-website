# What is left

Current as of 22 September 2026, after the pre-launch answers were folded in
and four pages published. This is the short list: one line per item, grouped by
who can close it. The reasoning behind each is in
[`outstanding-questions.md`](./outstanding-questions.md) and
[`go-live-status.md`](./go-live-status.md).

Six of the nine articles are live. Three are not, and each is held by exactly
one item.

## Blocking a page

| # | Who | Item | Page |
| - | --- | ---- | ---- |
| 1 | A Florida real estate attorney | **Tenancy by the entireties.** Does a money judgment against one spouse attach to property held by both as tenants by the entireties — and may a public page say so, with what qualification? Case law, not statute, which is why it was never drafted. The research is written up for counsel to read and sign, not to repeat. | `judgment-against-seller-before-closing-florida` |
| 2 | Bayit Title | **The underlying file (LT-05).** What the search returned, what the claim was, what was required to close, how long it took. Standing instruction: if the file does not come back, drop the page rather than publish it. | `litigation-against-seller-flip-florida` |
| 3 | The Department of State record | **Online notary registration (SG-04).** Run Jennifer Eileen Simon (HH 795313) and Chaya Brooks (HH 817398) through `online-notary.sunbiz.org` by hand — the registry refuses an automated query. If neither holds a § 117.225 registration, name the RON platform and whose commission the act is performed under. Fill it from that record and nothing else. | `mobile-and-remote-signings` |

Each of the three pages is otherwise finished: every other pending item on them
is answered and in the prose.

## Worth counsel's eye, blocking nothing

Four read-and-sign questions. Two are on pages that are now live, which raises
the priority without changing the status.

4. **LT-09 — the fair nexus citations.** *Chiusolo v. Kennedy* and *Medical
   Facilities v. Little Arch Creek* were removed under the project's case-law
   rule. The removed cite was accurate. Counsel decides whether it goes back.
5. **FIRPTA (live).** The settlement agent's procedural role, and the sentence
   about remitting on the buyer's behalf, under 26 U.S.C. § 1445 and
   Treas. Reg. § 1.1445-4. The page matches the regulation as researched;
   counsel confirms the one sentence.
6. **The bankruptcy page as a whole (live).** Bankruptcy counsel: are FRBP
   6004(h), FRBP 8002(a)(1), § 363(m) and the § 363(f) description accurate,
   and should a title agency's page state any of it? Flag what should come out
   rather than be corrected.
7. **FAR/BAR copyright (live).** The open-permits page paraphrases the standard
   and "AS IS" permit provisions and quotes only short phrases. Is that within
   what the licence allows?

## Team decisions still open

8. **The non-standard contract page's worked example.** The placeholder section
   was deleted at review because the addendum detail was incomplete. If the
   terms from that file come back, the section is worth restoring on the live
   page.
9. **Order of publication.** The worklist's priority — open permits and no
   legal access first — is now spent; both are live. Nothing is queued behind
   the three blockers, so there is no order left to confirm unless new pages
   are commissioned.

The cost-publishing policy question is settled by the answers themselves and
needs no further decision: published municipal schedules are quoted
(open permits), a confirmed office figure is quoted (the $500–$1,500 survey
sketch on the access page), and anything without a figure that holds is
withheld with an invitation to ask on the file (apostille, legalisation and
courier on the foreign-seller page).

## Watch items — nothing to do now

10. **HA-05.** § 718.112(2)(k) still reads $150 per applicant in the 2026
    statute and the Department of Business and Professional Regulation
    publishes no adjusted figure. Re-check when it does; the live HOA page
    carries $150.
11. **22 CFR 22.1.** The temporary amendment at 91 FR 34772 runs to
    31 December 2026. It does not touch item 41, so the $50 consular seal on
    the foreign-seller page is unaffected. Worth a glance in January.
12. **Next review.** The four pages published on 22 September 2026 carry
    `next_review: 2027-09-22`; the two published on 20 September carry
    `2027-09-20`.

## Not content — the site itself

None of these is an article question, and the site can go live with what is
reviewed while the three drafts stay invisible. Full detail in
[`go-live-status.md`](./go-live-status.md).

13. **Export the Wix DNS zone before touching nameservers.** The zone carries
    the firm's Microsoft 365 mail (MX and SPF). Moving nameservers without
    recreating them stops office email.
14. **Attach `www.bayittitle.com` to the Vercel project as the primary domain**,
    apex redirecting to it. Robots, the noindex tag and the sitemap all key off
    the production URL — this one change turns on indexing.
15. **Set the production environment variables in Vercel.** Supabase URL and
    service-role key, the Resend key and notify-from address, the public site
    URL. Without the mail keys, forms persist but nobody is notified. This
    could not be checked from the session.
16. **Check the redirect map against Search Console's Pages report** on the Wix
    property. The Wix sitemap's nine URLs are covered; anything Google still
    indexes beyond them only shows up there.
17. **Submit the sitemap** in Search Console and Bing once the domain answers.
