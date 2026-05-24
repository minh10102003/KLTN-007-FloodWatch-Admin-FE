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
  it('shows moderation label from display_moderation', () => {
    render(
      <ModerationStatusBadge
        report={{
          display_moderation: { key: 'auto_approved', label: 'Tự động duyệt' },
        }}
      />
    );
    expect(screen.getByText('Tự động duyệt')).toBeInTheDocument();
  });

  it('shows validation label from display_validation', () => {
    render(
      <ValidationStatusBadge
        report={{
          display_validation: { key: 'cross_verified', label: 'Xác minh chéo' },
        }}
      />
    );
    expect(screen.getByText('Xác minh chéo')).toBeInTheDocument();
  });

  it('shows pending manual moderation label', () => {
    render(
      <ModerationStatusBadge
        report={{
          moderation_status: 'pending',
          auto_approved: false,
          display_moderation: { key: 'pending', label: 'Chờ duyệt' },
        }}
      />
    );
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });
});
