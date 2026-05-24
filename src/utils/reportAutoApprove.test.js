import { describe, expect, it } from 'vitest';
import { getAutoApproveBadgeVariant, normalizeReportsSummary } from './reportAutoApprove';

describe('normalizeReportsSummary', () => {
  it('maps snake_case API payload to summary numbers', () => {
    const summary = normalizeReportsSummary({
      success: true,
      data: {
        total_active: 12,
        auto_approved: 5,
        pending_manual: 3,
        sensor_verified: 4,
        near_threshold: 2,
      },
    });
    expect(summary).toEqual({
      totalActive: 12,
      autoApproved: 5,
      pendingManual: 3,
      sensorVerified: 4,
      nearThreshold: 2,
    });
  });

  it('returns zeros for invalid payload', () => {
    expect(normalizeReportsSummary(null)).toEqual({
      totalActive: 0,
      autoApproved: 0,
      pendingManual: 0,
      sensorVerified: 0,
      nearThreshold: 0,
    });
  });
});

describe('getAutoApproveBadgeVariant', () => {
  it('shows manual badge when not auto-approved', () => {
    expect(getAutoApproveBadgeVariant({ auto_approved: false })).toBe('manual');
  });

  it('shows auto with sensor when both flags true', () => {
    expect(getAutoApproveBadgeVariant({ auto_approved: true, sensor_verified: true })).toBe('auto_sensor');
  });

  it('shows auto without sensor when only auto_approved', () => {
    expect(getAutoApproveBadgeVariant({ auto_approved: true, sensor_verified: false })).toBe('auto_no_sensor');
  });
});
