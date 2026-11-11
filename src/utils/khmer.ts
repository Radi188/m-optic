import type React from 'react';

/** Khmer letters and Khmer symbols. */
export const KHMER_RE = /[ក-៿᧠-᧿]/;

/** The plain text inside React children (strings and numbers, nested arrays). */
export const childrenText = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenText).join('');
  return '';
};

/** Whether the text (or React children) contains any Khmer. */
export const hasKhmer = (value: React.ReactNode): boolean =>
  KHMER_RE.test(childrenText(value));

/**
 * Line height for Khmer at `fontSize`. Khmer stacks vowels and subscripts
 * above and below the letters; Hanuman's own line is ~1.47× the size, so a
 * tighter box (with font padding off) pushes those marks out and the Khmer
 * and Latin words in a mixed line no longer sit level.
 */
export const khmerLineHeight = (fontSize: number): number => Math.ceil(fontSize * 1.55);
