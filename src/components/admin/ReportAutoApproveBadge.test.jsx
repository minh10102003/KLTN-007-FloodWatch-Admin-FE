import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModerationStatusBadge, ValidationStatusBadge } from './ReportStatusBadges';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe('Report status badges', () => {
  it('shows moderation label via i18n key', () => {
    render(
      <ModerationStatusBadge
        report={{
          display_moderation: { key: 'auto_approved', label: 'Tự động duyệt' },
        }}
      />
    );
    expect(screen.getByText('reports.moderationAutoApproved')).toBeInTheDocument();
  });

  it('shows validation label via i18n key', () => {
    render(
      <ValidationStatusBadge
        report={{
          display_validation: { key: 'cross_verified', label: 'Xác minh chéo' },
        }}
      />
    );
    expect(screen.getByText('reports.validationCrossVerified')).toBeInTheDocument();
  });

  it('shows pending moderation via i18n key', () => {
    render(
      <ModerationStatusBadge
        report={{
          moderation_status: 'pending',
          auto_approved: false,
          display_moderation: { key: 'pending', label: 'Chờ duyệt' },
        }}
      />
    );
    expect(screen.getByText('reports.statusPending')).toBeInTheDocument();
  });

  it('translates raw English moderation key approved', () => {
    render(
      <ModerationStatusBadge
        report={{
          display_moderation: { key: 'approved', label: 'approved' },
        }}
      />
    );
    expect(screen.getByText('reports.statusApproved')).toBeInTheDocument();
  });

  it('translates raw English validation key cross_verified', () => {
    render(
      <ValidationStatusBadge
        report={{
          display_validation: { key: 'cross_verified', label: 'cross_verified' },
        }}
      />
    );
    expect(screen.getByText('reports.validationCrossVerified')).toBeInTheDocument();
  });
});
