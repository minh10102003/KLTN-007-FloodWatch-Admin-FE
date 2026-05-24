import { describe, expect, it } from 'vitest';
import { AUTO_APPROVE_MIN_NEIGHBORS, checkAutoApprove } from './checkAutoApprove';

describe('checkAutoApprove', () => {
  it('returns not eligible when neighbor count is below threshold', () => {
    const result = checkAutoApprove({ neighborCount: AUTO_APPROVE_MIN_NEIGHBORS - 1, sensorVerified: true });
    expect(result.eligible).toBe(false);
    expect(result.autoApproved).toBe(false);
    expect(result.reason).toBe('insufficient_neighbors');
  });

  it('returns auto-approved without sensor when neighbors >= threshold and no sensor', () => {
    const result = checkAutoApprove({ neighborCount: 5, sensorVerified: false });
    expect(result.eligible).toBe(true);
    expect(result.autoApproved).toBe(true);
    expect(result.sensorVerified).toBe(false);
    expect(result.reason).toBe('auto_no_sensor');
  });

  it('returns auto-approved with sensor when neighbors >= threshold and sensor verified', () => {
    const result = checkAutoApprove({ neighborCount: 8, sensorVerified: true });
    expect(result.eligible).toBe(true);
    expect(result.autoApproved).toBe(true);
    expect(result.sensorVerified).toBe(true);
    expect(result.reason).toBe('auto_with_sensor');
  });
});
