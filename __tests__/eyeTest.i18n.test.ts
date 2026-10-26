import en from '../src/localizations/locales/en.json';
import km from '../src/localizations/locales/km.json';

// The eye test (ScanScreen refraction flow) reads all of its copy from the
// EyeTest namespace. A key missing from km.json silently falls back to
// English, so check the two stay in step.
const enCopy: Record<string, string> = (en as any).EyeTest;
const kmCopy: Record<string, string> = (km as any).EyeTest;

const placeholders = (s: string) =>
  (s.match(/\{\{\w+\}\}|<\/?bold>/g) ?? []).sort();

it('has a Khmer string for every English eye-test string', () => {
  expect(Object.keys(kmCopy).sort()).toEqual(Object.keys(enCopy).sort());
  for (const key of Object.keys(enCopy)) {
    expect(kmCopy[key].trim()).not.toBe('');
  }
});

it('keeps the same {{placeholders}} and <bold> tags in both languages', () => {
  for (const key of Object.keys(enCopy)) {
    expect([key, placeholders(kmCopy[key])]).toEqual([
      key,
      placeholders(enCopy[key]),
    ]);
  }
});
