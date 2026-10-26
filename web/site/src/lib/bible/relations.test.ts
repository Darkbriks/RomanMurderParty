import type { BibleYamlFile } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { characterIndex } from './catalog.ts';
import { relationsMatrix } from './relations.ts';
import { asRelations } from './shapes.ts';
import { fixtureBible } from './test-fixture.ts';

const bible = fixtureBible();
const rels = asRelations((bible.files.find((f) => f.slug === 'relations') as BibleYamlFile).data)!;
const m = relationsMatrix(rels, characterIndex(bible));

describe('relationsMatrix', () => {
  it('orders rows and columns like the characters, unknown ids last', () => {
    expect(m.rows).toEqual(['SER', 'WHI']);
    expect(m.cols).toEqual(['SER', 'WHI', 'EVA', 'XYZ']);
  });

  it('finds the relation of a pair, and nothing for a silent pair', () => {
    expect(m.at('SER', 'XYZ')?.valence).toBe(0);
    expect(m.at('SER', 'WHI')?.label).toBe('Menace maternelle');
    expect(m.at('WHI', 'WHI')).toBeNull();
    expect(m.at('WHI', 'EVA')).toBeNull();
  });
});
