# Fonts for generated images

`LibreCaslonText-Regular.ttf` and `DMSans-Medium.ttf` are the same two families
the site loads through `next/font/google` in `app/layout.tsx`. They are
committed here because `next/og` renders the social card and the app icon with
Satori, which needs the font bytes on disk — it cannot use a `next/font` handle.

Committing them keeps image generation off the network at build time. They are
never served to a browser; the browser still gets the self-hosted `next/font`
copies.

Both are licensed under the SIL Open Font License 1.1.

- Libre Caslon Text — https://fonts.google.com/specimen/Libre+Caslon+Text
- DM Sans — https://fonts.google.com/specimen/DM+Sans
