/**
 * The rules for what may be attached to an order.
 *
 * The list here has to stay in step with the `order-documents` bucket, which is
 * where Supabase actually enforces it. A type added in code alone buys a picker
 * that accepts the file and an upload that fails.
 */
import { describe, expect, it } from 'vitest';

import {
  ACCEPT_ATTRIBUTE,
  CONTRACT_ACCEPT_ATTRIBUTE,
  MAX_CONTRACT_TOTAL_BYTES,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  contentMatches,
  contentTypeFor,
  extensionOf,
  formatBytes,
  isContractFile,
  isPathForOrder,
  isPathForQuote,
  sanitizeName,
  screenFiles,
} from '@/lib/documents';

describe('what the bucket will take', () => {
  /**
   * Checked against `allowed_mime_types` on the live bucket. If this test fails,
   * confirm the bucket before changing the expectation — the bucket is the gate,
   * this list is the mirror.
   */
  it('mirrors the bucket exactly', () => {
    expect(ACCEPT_ATTRIBUTE.split(',').sort()).toEqual(
      ['.docx', '.heic', '.jpeg', '.jpg', '.pdf', '.png'].sort(),
    );
  });

  it('maps an extension to the type the object is stored as', () => {
    expect(contentTypeFor('contract.pdf')).toBe('application/pdf');
    expect(contentTypeFor('survey.PDF')).toBe('application/pdf');
    expect(contentTypeFor('scan.jpeg')).toBe('image/jpeg');
  });

  it('refuses types the bucket would reject anyway', () => {
    // Both were on the list until the bucket was checked.
    expect(contentTypeFor('survey.tiff')).toBeNull();
    expect(contentTypeFor('old-contract.doc')).toBeNull();
  });

  it('refuses anything executable or unlabelled', () => {
    expect(contentTypeFor('payload.exe')).toBeNull();
    expect(contentTypeFor('script.pdf.sh')).toBeNull();
    expect(contentTypeFor('noextension')).toBeNull();
    // A double extension is judged by its last one, which is what the storage
    // layer and the operating system will both do.
    expect(contentTypeFor('invoice.exe.pdf')).toBe('application/pdf');
  });

  it('reads the extension off the end, not the first dot', () => {
    expect(extensionOf('a.b.c.pdf')).toBe('.pdf');
    expect(extensionOf('plain')).toBe('');
  });
});

describe('the name shown to the office', () => {
  it('keeps a readable label', () => {
    expect(sanitizeName('Purchase Contract - 123 Main St.pdf')).toBe(
      'Purchase Contract - 123 Main St.pdf',
    );
  });

  it('drops any path a client tried to smuggle in', () => {
    expect(sanitizeName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeName('C:\\Users\\jane\\contract.pdf')).toBe('contract.pdf');
  });

  it('strips characters that have no business in a label', () => {
    expect(sanitizeName('con"tract<>.pdf')).toBe('con_tract_.pdf');
  });

  it('never returns an empty string', () => {
    expect(sanitizeName('')).toBe('document');
    expect(sanitizeName('///')).toBe('document');
  });

  it('caps a name long enough to be a problem', () => {
    expect(sanitizeName(`${'a'.repeat(400)}.pdf`).length).toBeLessThanOrEqual(120);
  });
});

describe('a path belonging to an order', () => {
  const orderId = '11111111-1111-4111-8111-111111111111';

  it('accepts a path under that order', () => {
    expect(isPathForOrder(`orders/${orderId}/abc.pdf`, orderId)).toBe(true);
  });

  it('refuses another order\u2019s path', () => {
    expect(isPathForOrder('orders/22222222-2222-4222-8222-222222222222/abc.pdf', orderId))
      .toBe(false);
  });

  it('refuses a prefix that merely starts the same way', () => {
    // Without the trailing slash this would pass, and one order could register
    // a document sitting in another order's neighbouring folder.
    expect(isPathForOrder(`orders/${orderId}-evil/abc.pdf`, orderId)).toBe(false);
  });

  it('refuses an attempt to climb out of the order folder', () => {
    expect(isPathForOrder(`../${orderId}/abc.pdf`, orderId)).toBe(false);
    expect(isPathForOrder(`orders/${orderId}`, orderId)).toBe(false);
  });
});

describe('sizes as a person reads them', () => {
  it('does not print a pointless decimal', () => {
    expect(formatBytes(MAX_FILE_BYTES)).toBe('25 MB');
  });

  it('scales to the unit that reads best', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(120_000)).toBe('117 KB');
    expect(formatBytes(3_500_000)).toBe('3.3 MB');
  });
});

/**
 * A contract sent from /estimate lives under its own folder in the same
 * bucket, and the page takes only what a person can read a contract off.
 */
describe('a contract sent for pricing', () => {
  it('keeps quote pages and order documents apart by path', () => {
    expect(isPathForQuote('quotes/abc/1.pdf', 'abc')).toBe(true);
    expect(isPathForQuote('orders/abc/1.pdf', 'abc')).toBe(false);
    expect(isPathForQuote('quotes/abcd/1.pdf', 'abc')).toBe(false);
  });

  it('takes a PDF or a photograph, and not a Word file', () => {
    expect(isContractFile('contract.pdf')).toBe(true);
    expect(isContractFile('page-1.HEIC')).toBe(true);
    expect(isContractFile('page-2.jpeg')).toBe(true);
    expect(isContractFile('contract.docx')).toBe(false);
    expect(isContractFile('contract')).toBe(false);
  });

  it('offers the picker only what it will take, all of which the bucket stores', () => {
    for (const extension of CONTRACT_ACCEPT_ATTRIBUTE.split(',')) {
      expect(ACCEPT_ATTRIBUTE.split(',')).toContain(extension);
      expect(isContractFile(`x${extension}`)).toBe(true);
    }
  });

  it('holds the whole contract to what the page promises', () => {
    expect(MAX_CONTRACT_TOTAL_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_CONTRACT_TOTAL_BYTES).toBeLessThanOrEqual(MAX_FILE_BYTES);
  });
});

/**
 * The bytes, not the name. Each of these is what the first bytes of a real
 * file of that kind look like; the check deletes anything that does not match
 * the type its extension claims.
 */
describe('a file’s contents against its name', () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const text = (value: string) => new TextEncoder().encode(value);

  it('knows a PDF, even with a few stray bytes before the header', () => {
    expect(contentMatches('application/pdf', text('%PDF-1.7\n'))).toBe(true);
    expect(contentMatches('application/pdf', text('\r\n%PDF-1.4'))).toBe(true);
    expect(contentMatches('application/pdf', text('MZ\x90\x00'))).toBe(false);
  });

  it('knows a JPEG and a PNG', () => {
    expect(contentMatches('image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(contentMatches('image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(true);
    // A PNG renamed .jpg is not a JPEG, whatever it is called.
    expect(contentMatches('image/jpeg', bytes(0x89, 0x50, 0x4e, 0x47))).toBe(false);
  });

  it('knows an iPhone photo by its HEIF brand', () => {
    const heic = (brand: string) => new Uint8Array([0, 0, 0, 0x18, ...text('ftyp'), ...text(brand)]);
    expect(contentMatches('image/heic', heic('heic'))).toBe(true);
    expect(contentMatches('image/heic', heic('mif1'))).toBe(true);
    // An MP4 is an ISO box too, with a different brand.
    expect(contentMatches('image/heic', heic('isom'))).toBe(false);
  });

  it('knows a Word file from any other zip, at either end of it', () => {
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const zip = (name: string) => new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(26).fill(0), ...text(name)]);

    expect(contentMatches(docx, zip('[Content_Types].xml'))).toBe(true);
    expect(contentMatches(docx, zip('word/document.xml'), text('...[Content_Types].xml...'))).toBe(true);
    expect(contentMatches(docx, zip('payload.exe'), text('payload.exe'))).toBe(false);
    expect(contentMatches(docx, text('[Content_Types].xml'))).toBe(false);
  });
});

describe('screening files as they are picked', () => {
  const rules = {
    accepts: (name: string) => contentTypeFor(name) !== null,
    typeLabel: 'PDF',
    maxFiles: MAX_FILES,
    maxFileBytes: MAX_FILE_BYTES,
    maxTotalBytes: MAX_TOTAL_BYTES,
  };
  const file = (name: string, size = 1000) => ({ name, size });

  it('names every file it turns away, with the reason', () => {
    const { files, rejected } = screenFiles(
      [file('contract.pdf')],
      [file('notes.txt'), file('contract.pdf'), file('huge.pdf', MAX_FILE_BYTES + 1), file('survey.pdf')],
      rules,
    );

    expect(files.map((f) => f.name)).toEqual(['contract.pdf', 'survey.pdf']);
    expect(rejected).toEqual([
      { name: 'notes.txt', reason: 'PDF only' },
      { name: 'contract.pdf', reason: 'already added' },
      { name: 'huge.pdf', reason: 'over 25 MB' },
    ]);
  });

  it('stops at the file limit and the total, and says which', () => {
    const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => file(`${i}.pdf`));
    expect(screenFiles([], many, rules).rejected).toEqual([
      { name: `${MAX_FILES}.pdf`, reason: `no more than ${MAX_FILES} files` },
    ]);

    const big = [file('a.pdf', 24 * 1024 * 1024), file('b.pdf', 24 * 1024 * 1024), file('c.pdf', 24 * 1024 * 1024)];
    expect(screenFiles([], big, rules).rejected).toEqual([{ name: 'c.pdf', reason: 'over 60 MB in all' }]);
  });
});
