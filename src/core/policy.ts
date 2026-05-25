/**
 * Policy Engine
 * Loads and validates agent policies
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  AgentPolicy,
  DEFAULT_POLICY,
  AgentGateAction,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
} from './types';

export function loadPolicy(configPath: string): AgentPolicy {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Partial<AgentPolicy>;
    return mergePolicy(parsed);
  } catch (error) {
    console.warn(`Failed to load policy from ${configPath}, using defaults`);
    return DEFAULT_POLICY;
  }
}

export function loadPolicyFromString(yamlContent: string): AgentPolicy {
  try {
    const parsed = yaml.load(yamlContent) as Partial<AgentPolicy>;
    return mergePolicy(parsed);
  } catch (error) {
    console.warn('Failed to parse policy YAML, using defaults');
    return DEFAULT_POLICY;
  }
}

function mergePolicy(partial: Partial<AgentPolicy>): AgentPolicy {
  return {
    mode: partial.mode || DEFAULT_POLICY.mode,
    defaults: {
      action: partial.defaults?.action || DEFAULT_POLICY.defaults.action,
      expose_debug_headers:
        partial.defaults?.expose_debug_headers ??
        DEFAULT_POLICY.defaults.expose_debug_headers,
    },
    approved_agents: partial.approved_agents || DEFAULT_POLICY.approved_agents,
    known_ai_agents: partial.known_ai_agents || DEFAULT_POLICY.known_ai_agents,
    paths: partial.paths || DEFAULT_POLICY.paths,
    scoring: partial.scoring,
    honeypots: partial.honeypots || DEFAULT_POLICY.honeypots,
  };
}

export function getActionForPath(
  path: string,
  policy: AgentPolicy
): AgentGateAction | null {
  for (const [pattern, config] of Object.entries(policy.paths)) {
    if (matchPath(path, pattern)) {
      return config.action;
    }
  }
  return null;
}

export function getActionForAgent(
  userAgent: string,
  policy: AgentPolicy
): AgentGateAction | null {
  for (const agent of policy.approved_agents) {
    if (userAgent.includes(agent.name)) {
      return agent.action;
    }
  }
  return null;
}

function matchPath(path: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix);
  }
  return path === pattern;
}

export function getScoringConfig(policy: AgentPolicy): ScoringConfig {
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...policy.scoring,
    weights: {
      ...DEFAULT_SCORING_CONFIG.weights,
      ...(policy.scoring?.weights || {}),
    },
    thresholds: {
      ...DEFAULT_SCORING_CONFIG.thresholds,
      ...(policy.scoring?.thresholds || {}),
    },
  };
}
