import { describe, expect, it } from 'vitest';
import {
  canManualModerate,
  isManualPendingReport,
  isPendingQueueItem,
  isQueuePendingReport,
  mergeManualPendingQueues,
  normalizeReportsSummary,
} from './reportAutoApprove';

describe('normalizeReportsSummary', () => {
  it('maps BE summary payload fields', () => {
    const summary = normalizeReportsSummary({
      success: true,
      data: {
        total_active: 107,
        auto_approved: 2,
        pending_manual_review: 6,
        sensor_verified: 6,
        pending_auto_approve: 3,
      },
    });
    expect(summary).toEqual({
      totalActive: 107,
      autoApproved: 2,
      pendingManualReview: 6,
      sensorVerified: 6,
      pendingAutoApprove: 3,
    });
  });
});

describe('queue and manual pending', () => {
  it('excludes auto-approved from pending queue', () => {
    expect(
      isQueuePendingReport({
        moderation_status: 'pending',
        auto_approved: true,
        display_moderation: { key: 'auto_approved', label: 'Tự động duyệt' },
      })
    ).toBe(false);
  });

  it('includes manual pending when display key is not exactly pending', () => {
    expect(
      isQueuePendingReport({
        moderation_status: 'pending',
        auto_approved: false,
        display_moderation: { key: 'pending_manual_review', label: 'Chờ duyệt thủ công' },
      })
    ).toBe(true);
  });

  it('trusts pending API list when BE already filtered', () => {
    expect(
      isPendingQueueItem(
        {
          moderation_status: 'awaiting_review',
          auto_approved: false,
          display_moderation: { key: 'pending_manual_review', label: 'Chờ duyệt' },
        },
        { trustPendingApi: true }
      )
    ).toBe(true);
  });

  it('mergeManualPendingQueues dedupes by id', () => {
    const merged = mergeManualPendingQueues([
      { data: [{ id: 1, moderation_status: 'pending', auto_approved: false }], trustPendingApi: true },
      { data: [{ id: 1, moderation_status: 'pending', auto_approved: false }] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(1);
  });

  it('includes manual pending in queue', () => {
    expect(
      isQueuePendingReport({
        moderation_status: 'pending',
        auto_approved: false,
        display_moderation: { key: 'pending', label: 'Chờ duyệt', hint: 'Gần tự duyệt (3/5)' },
      })
    ).toBe(true);
    expect(canManualModerate({
      moderation_status: 'pending',
      auto_approved: false,
      display_moderation: { key: 'pending', label: 'Chờ duyệt' },
    })).toBe(true);
    expect(isManualPendingReport({
      moderation_status: 'pending',
      auto_approved: false,
      display_moderation: { key: 'pending', label: 'Chờ duyệt' },
    })).toBe(true);
  });
});
