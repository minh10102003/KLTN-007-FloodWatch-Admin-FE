import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportAutoApproveBadge from './ReportAutoApproveBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe('ReportAutoApproveBadge', () => {
  it('shows manual pending label', () => {
    render(<ReportAutoApproveBadge report={{ auto_approved: false }} />);
    expect(screen.getByText('autoApprove.badgeManual')).toBeInTheDocument();
  });

  it('shows auto with sensor label', () => {
    render(<ReportAutoApproveBadge report={{ auto_approved: true, sensor_verified: true }} />);
    expect(screen.getByText('autoApprove.badgeAutoWithSensor')).toBeInTheDocument();
  });

  it('shows auto without sensor label', () => {
    render(<ReportAutoApproveBadge report={{ auto_approved: true, sensor_verified: false }} />);
    expect(screen.getByText('autoApprove.badgeAutoNoSensor')).toBeInTheDocument();
  });
});
