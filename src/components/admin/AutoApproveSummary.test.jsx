import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AutoApproveSummary from './AutoApproveSummary';
import * as api from '../../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'vi' },
  }),
}));

describe('AutoApproveSummary', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getReportsSummary').mockResolvedValue({
      success: true,
      summary: {
        totalActive: 107,
        autoApproved: 2,
        pendingManualReview: 6,
        sensorVerified: 6,
        pendingAutoApprove: 3,
      },
    });
  });

  it('renders five summary metrics from API', async () => {
    render(<AutoApproveSummary />);
    await waitFor(() => {
      expect(screen.getByText('107')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('6')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('autoApprove.cardTotalActive')).toBeInTheDocument();
    expect(screen.getByText('autoApprove.cardAutoApproved')).toBeInTheDocument();
    expect(screen.getByText('autoApprove.cardPendingManual')).toBeInTheDocument();
    expect(screen.getByText('autoApprove.cardSensorVerified')).toBeInTheDocument();
    expect(screen.getByText('autoApprove.cardPendingAutoApprove')).toBeInTheDocument();
  });
});
