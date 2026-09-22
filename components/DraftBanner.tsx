export function DraftBanner() {
  return (
    <div className="verify-banner verify-banner--draft" role="note">
      <strong>Unreviewed draft — not published</strong>
      No licensed title agent has reviewed this page yet, so it carries no byline and makes no
      claim to be accurate. It is visible here because this is a preview build; it does not appear
      on the public site and is excluded from the sitemap and from search engines.
    </div>
  );
}
