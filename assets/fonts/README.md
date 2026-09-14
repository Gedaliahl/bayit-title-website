# Fonts for generated images

`Newsreader-Medium.ttf` and `Archivo-Medium.ttf` are the same two families the
site loads through `next/font/google` in `app/layout.tsx`. They are committed
here because `next/og` renders the social card and the app icon with Satori,
which needs the font bytes on disk — it cannot use a `next/font` handle.

Committing them keeps image generation off the network at build time. They are
never served to a browser; the browser still gets the self-hosted `next/font`
copies.

Both are licensed under the SIL Open Font License 1.1.

- Newsreader — https://fonts.google.com/specimen/Newsreader
- Archivo — https://fonts.google.com/specimen/Archivo
