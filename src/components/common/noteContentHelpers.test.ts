import { describe, expect, it } from 'vitest';
import {
  buildImageOnlyNoteContent,
  resolveNoteContentFromSubmit,
} from './noteContentHelpers';

describe('noteContentHelpers', () => {
  it('buildImageOnlyNoteContent uses count style by default', () => {
    expect(buildImageOnlyNoteContent('Tech', [new File([''], 'a.png')])).toBe(
      'Tech uploaded 1 image.',
    );
    expect(
      buildImageOnlyNoteContent('Tech', [new File([''], 'a.png'), new File([''], 'b.png')]),
    ).toBe('Tech uploaded 2 images.');
  });

  it('buildImageOnlyNoteContent uses filenames style when requested', () => {
    const file = new File([''], 'photo.jpg');
    expect(buildImageOnlyNoteContent('Tech', [file], 'filenames')).toBe(
      'Tech uploaded: photo.jpg',
    );
  });

  it('resolveNoteContentFromSubmit preserves trimmed content', () => {
    expect(
      resolveNoteContentFromSubmit(
        { content: '  hello  ', images: [] },
        'Tech',
      ),
    ).toBe('hello');
  });
});
