/**
 * Shared rendering for the generated social cards.
 *
 * Every card is type on the site's own palette. That is a constraint, not a
 * placeholder: there is no usable photography, and the stock imagery this
 * industry reaches for — handshakes, keys, families on lawns — is exactly what
 * the design direction rules out. Specificity does the work instead, which is
 * why the license number is on the card.
 */
import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

import { site } from './site';

/** Facebook, LinkedIn, Slack and X all read a 1.91:1 card. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Tokens from app/globals.css. Duplicated as literals because Satori resolves
// no custom properties — if these drift, the card stops matching the site.
const INK = '#111';
const PAPER = '#fff';
const ACCENT = '#97701a';
const ACCENT_DEEP = '#6b4f0c';
const ACCENT_DARK = '#2f2408';
const ACCENT_WASH = '#f7efdc';
const INK_MUTED = '#555';

/**
 * Read once per build. These are static routes, so this runs at build time and
 * the bytes are shared by every card in the run.
 */
function readFont(file: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), 'assets', 'fonts', file));
}

let fonts: { name: string; data: Buffer; weight: 500; style: 'normal' }[] | null = null;

function brandFonts() {
  if (!fonts) {
    fonts = [
      {
        name: 'Libre Caslon Text',
        data: readFont('LibreCaslonText-Regular.ttf'),
        weight: 500,
        style: 'normal',
      },
      { name: 'DM Sans', data: readFont('DMSans-Medium.ttf'), weight: 500, style: 'normal' },
    ];
  }
  return fonts;
}

/**
 * Satori has no line clamp, so an over-long title would render past the canvas
 * rather than wrapping into an ellipsis. Cut on a word boundary instead.
 */
function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** Titles are questions in the reader's words, so they run long. */
const TITLE_BUDGET = 110;

interface CardOptions {
  /** The small label above the title — the section, not a slogan. */
  eyebrow: string;
  title: string;
}

export function ogImage({ eyebrow, title }: CardOptions): ImageResponse {
  const headline = truncate(title, TITLE_BUDGET);

  // Long titles need to step down a size or they crowd the credential line.
  const titleSize = headline.length > 78 ? 58 : headline.length > 52 ? 68 : 78;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: PAPER,
          fontFamily: 'Libre Caslon Text',
        }}
      >
        {/* The threshold rule, the same gold edge the answer panel carries. */}
        <div style={{ width: 16, height: '100%', background: ACCENT }} />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '72px 80px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: 'DM Sans',
                fontSize: 25,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: ACCENT_DEEP,
                marginBottom: 34,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                fontSize: titleSize,
                lineHeight: 1.14,
                letterSpacing: '-0.012em',
                color: INK,
              }}
            >
              {headline}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 38, color: INK }}>{site.legalName}</div>
              <div
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 23,
                  color: INK_MUTED,
                  marginTop: 8,
                }}
              >
                {`${site.address.city}, Florida · ${site.phoneDisplay}`}
              </div>
            </div>
            {/* Authority by public record, never by assertion. */}
            <div
              style={{
                display: 'flex',
                fontFamily: 'DM Sans',
                fontSize: 21,
                color: ACCENT_DEEP,
                background: ACCENT_WASH,
                padding: '12px 20px',
                borderRadius: 999,
              }}
            >
              {`Florida Title Insurance Agency ${site.agencyLicense}`}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: brandFonts() },
  );
}

/**
 * The raster app icon — iOS home screens. The browser tab uses app/icon.svg,
 * which draws the same mark.
 *
 * A gabled silhouette rather than a monogram: "bayit" is Hebrew for home, and a
 * shape survives 16px in a browser tab where a letterform turns to mush. The
 * gold band across the base is the same threshold rule as the card.
 *
 * Square and full-bleed on purpose. iOS masks this into a squircle itself, so a
 * corner radius here would be rounded twice, and the glyph is held at 70% to
 * keep it clear of where that mask cuts.
 */
export function iconImage(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ACCENT_DARK,
        }}
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 32 32">
          <path d="M16 6 L27 15 V25 H5 V15 Z" fill={ACCENT_WASH} />
          <rect x="5" y="22.4" width="22" height="2.6" fill={ACCENT} />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
