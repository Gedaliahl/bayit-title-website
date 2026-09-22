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
  contentTypeFor,
  extensionOf,
  formatBytes,
  isContractFile,
  isPathForOrder,
  isPathForQuote,
  sanitizeName,
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
