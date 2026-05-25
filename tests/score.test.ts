import { describe, it, expect } from 'vitest';
import { calculateScore, getActionFromScore } from '../src/core/score';
import { DEFAULT_SCORING_CONFIG, Signal } from '../src/core/types';

describe('calculateScore', () => {
  it('should return 0 for empty signals', () => {
    const score = calculateScore([], DEFAULT_SCORING_CONFIG);
    expect(score).toBe(0);
  });

  it('should calculate score from single signal', () => {
    const signals: Signal[] = [
      { type: 'known_ai_user_agent', weight: 0 },
    ];

    const score = calculateScore(signals, DEFAULT_SCORING_CONFIG);
    expect(score).toBe(25); // Default weight for known_ai_user_agent
  });

  it('should accumulate multiple signals', () => {
    const signals: Signal[] = [
      { type: 'known_ai_user_agent', weight: 0 },
      { type: 'missing_cookies', weight: 0 },
      { type: 'honeypot_hit', weight: 0 },
    ];

    const score = calculateScore(signals, DEFAULT_SCORING_CONFIG);
    expect(score).toBe(25 + 8 + 50); // 83
  });

  it('should cap score at 100', () => {
    const signals: Signal[] = [
      { type: 'known_ai_user_agent', weight: 0 },
      { type: 'known_ai_user_agent', weight: 0 },
      { type: 'known_ai_user_agent', weight: 0 },
      { type: 'known_ai_user_agent', weight: 0 },
      { type: 'known_ai_user_agent', weight: 0 },
    ];

    const score = calculateScore(signals, DEFAULT_SCORING_CONFIG);
    expect(score).toBe(100);
  });

  it('should use custom weights', () => {
    const signals: Signal[] = [
      { type: 'known_ai_user_agent', weight: 0 },
    ];

    const customConfig = {
      ...DEFAULT_SCORING_CONFIG,
      weights: {
        ...DEFAULT_SCORING_CONFIG.weights,
        known_ai_user_agent: 50,
      },
    };

    const score = calculateScore(signals, customConfig);
    expect(score).toBe(50);
  });
});

describe('getActionFromScore', () => {
  const thresholds = DEFAULT_SCORING_CONFIG.thresholds;

  it('should return allow for low scores', () => {
    expect(getActionFromScore(0, thresholds)).toBe('allow');
    expect(getActionFromScore(29, thresholds)).toBe('allow');
  });

  it('should return limited for medium-low scores', () => {
    expect(getActionFromScore(30, thresholds)).toBe('limited');
    expect(getActionFromScore(54, thresholds)).toBe('limited');
  });

  it('should return challenge for medium scores', () => {
    expect(getActionFromScore(55, thresholds)).toBe('challenge');
    expect(getActionFromScore(69, thresholds)).toBe('challenge');
  });

  it('should return sandbox for medium-high scores', () => {
    expect(getActionFromScore(70, thresholds)).toBe('sandbox');
    expect(getActionFromScore(89, thresholds)).toBe('sandbox');
  });

  it('should return block for high scores', () => {
    expect(getActionFromScore(90, thresholds)).toBe('block');
    expect(getActionFromScore(100, thresholds)).toBe('block');
  });
});
