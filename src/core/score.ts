/**
 * Risk Scoring Engine
 * Calculates risk score based on detected signals
 */

import { Signal, SignalType, ScoringConfig, DEFAULT_SCORING_CONFIG } from './types';

export function calculateScore(
  signals: Signal[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  let totalScore = 0;

  for (const signal of signals) {
    const weight = config.weights[signal.type] || 0;
    totalScore += weight;
  }

  return Math.min(totalScore, 100);
}

export function getActionFromScore(
  score: number,
  thresholds: ScoringConfig['thresholds']
): 'allow' | 'limited' | 'challenge' | 'sandbox' | 'block' {
  if (score >= thresholds.block) {
    return 'block';
  }
  if (score >= thresholds.sandbox) {
    return 'sandbox';
  }
  if (score >= thresholds.challenge) {
    return 'challenge';
  }
  if (score >= thresholds.limited) {
    return 'limited';
  }
  return 'allow';
}

export function getSignalTypes(signals: Signal[]): SignalType[] {
  return signals.map((s) => s.type);
}
