import { describe, expect, it, vi } from 'vitest';
import {
  buildFloodLevelChartData,
  floodLevelLabel,
  floodLevelsMatch,
  normalizeFloodLevelValue,
} from './floodLevel';

describe('floodLevel', () => {
  const t = (key) => key;

  it('maps legacy Nhẹ to level 1 label', () => {
    expect(floodLevelLabel('Nhẹ', t)).toBe('reports.floodLevel1');
  });

  it('matches Mức 3 and numeric 3', () => {
    expect(floodLevelsMatch('Mức 3', 3)).toBe(true);
  });

  it('builds 5 chart buckets from reports', () => {
    const rows = buildFloodLevelChartData(
      [{ flood_level: 'Mức 1' }, { flood_level: 'Mức 5' }, { flood_level: 'Mức 5' }],
      null,
      t
    );
    expect(rows).toHaveLength(5);
    expect(rows.find((r) => r.level === 'Mức 1')?.count).toBe(1);
    expect(rows.find((r) => r.level === 'Mức 5')?.count).toBe(2);
    expect(rows.find((r) => r.level === 'Mức 2')?.count).toBe(0);
  });

  it('normalizes numeric flood level', () => {
    expect(normalizeFloodLevelValue(4)).toBe(4);
    expect(normalizeFloodLevelValue('Mức 4')).toBe(4);
  });
});
