/**
 * Decision Engine
 * Determines action based on score, policy, and path
 */

import {
  DecisionResult,
  AgentPolicy,
  Signal,
  SignalType,
  ScoringConfig,
  AgentGateAction,
} from './types';
import { calculateScore, getActionFromScore, getSignalTypes } from './score';
import { getActionForPath, getActionForAgent, getScoringConfig } from './policy';

export function decide(
  score: number,
  signals: Signal[],
  path: string,
  userAgent: string,
  policy: AgentPolicy
): DecisionResult {
  const scoringConfig = getScoringConfig(policy);
  const baseAction = getActionFromScore(score, scoringConfig.thresholds);
  const pathAction = getActionForPath(path, policy);
  const agentAction = getActionForAgent(userAgent, policy);

  // Priority: agent > path > score-based
  // Agent-specific rules are most specific, then path rules, then score
  let finalAction: AgentGateAction = baseAction;
  let reason = `Score-based: ${score}`;

  if (pathAction) {
    finalAction = pathAction;
    reason = `Path policy: ${path}`;
  }
  
  if (agentAction) {
    finalAction = agentAction;
    reason = `Agent policy: ${userAgent}`;
  }

  // Enforce mode check
  if (policy.mode === 'log_only' && finalAction !== 'allow') {
    finalAction = 'log_only';
    reason = `Log-only mode: ${reason}`;
  }

  const result: DecisionResult = {
    action: finalAction,
    score,
    signals: getSignalTypes(signals),
    reason,
  };

  // Add redirect for challenge/sandbox
  if (finalAction === 'challenge') {
    result.redirectPath = '/agent-access';
  } else if (finalAction === 'sandbox') {
    result.redirectPath = '/agent-sandbox';
  }

  // Add debug headers if enabled
  if (policy.defaults.expose_debug_headers) {
    result.headers = {
      'X-AgentGate-Score': score.toString(),
      'X-AgentGate-Action': finalAction,
      'X-AgentGate-Signals': getSignalTypes(signals).join(','),
    };
  }

  return result;
}
