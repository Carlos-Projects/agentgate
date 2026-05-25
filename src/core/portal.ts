/**
 * Agent Access Portal
 * A page where AI agents can declare themselves and their mission.
 * For legitimate agents (Googlebot, etc.) this is a fast-pass.
 * For unknown agents, this serves as a declaration and logging point.
 */

import { AgentPolicy } from '../core/types'

export interface AgentDeclaration {
  agentName: string
  agentVersion?: string
  provider: string
  purpose: string
  owner: string
  contactEmail?: string
  rate_limit?: number
  respectsRobotsTxt: boolean
  declaredAt: string
  mission: string
  tools?: string[]
}

export function generateAccessPolicyDeclaration(agentName: string): string {
  return `<!--
  AgentGate Access Policy for ${agentName}
  
  This site uses AgentGate to manage AI agent access.
  To access this site, please:
  1. Declare your agent at /agent-access
  2. Include your declaration in the X-Agent-Declaration header
  3. Respect the rate limits and paths specified in the response

  For questions, contact: security@site-owner.example.com
-->`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export function generateAgentAccessPage(policy: AgentPolicy): string {
  const approvedList = policy.approved_agents?.map(a => escapeHtml(a.name)).join(', ') || 'None configured'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<title>Agent Access Portal — AgentGate</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem;display:flex;align-items:center;justify-content:center;min-height:100vh}
.container{max-width:700px;width:100%}
h1{font-size:1.8rem;background:linear-gradient(135deg,#58a6ff,#bc8cff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.5rem}
.subtitle{color:#8b949e;margin-bottom:2rem}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin-bottom:1rem}
h2{color:#58a6ff;font-size:1.1rem;margin-bottom:1rem}
label{display:block;color:#8b949e;font-size:.85rem;margin-bottom:.3rem;margin-top:1rem}
label:first-child{margin-top:0}
input,textarea,select{width:100%;padding:.6rem;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:.9rem}
textarea{min-height:80px;resize:vertical}
.btn{padding:.75rem 1.5rem;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.95rem;font-weight:600;margin-top:1rem;width:100%}
.btn:hover{background:#2ea043}
code{background:#0d1117;padding:2px 6px;border-radius:3px;font-size:.85em;color:#bc8cff}
.success{border-left:4px solid #238636;padding:1rem;background:#161b22;margin-top:1rem;display:none}
.success h3{color:#238636;margin-bottom:.5rem}
table{width:100%;border-collapse:collapse;margin-top:1rem}
td,th{padding:.5rem;text-align:left;border-bottom:1px solid #30363d;font-size:.9rem}
th{color:#8b949e}
.footer{color:#484f58;font-size:.85rem;text-align:center;margin-top:2rem}
</style></head>
<body>
<div class="container">
<h1>🤖 Agent Access Portal</h1>
<p class="subtitle">Declare your AI agent to access this site. Approved agents receive prioritized access.</p>

<div class="card">
<h2>📋 Approved Agents</h2>
<p style="color:#8b949e;margin-bottom:.5rem">These agents are pre-approved for access:</p>
<p><code>${approvedList}</code></p>
</div>

<div class="card">
<h2>📝 Declare Your Agent</h2>
<form id="declarationForm">
<label>Agent Name *</label>
<input type="text" id="agentName" placeholder="e.g., MyResearchBot" required>

<label>Provider *</label>
<select id="provider">
<option value="">Select provider...</option>
<option value="openai">OpenAI</option>
<option value="anthropic">Anthropic</option>
<option value="google">Google DeepMind</option>
<option value="meta">Meta AI</option>
<option value="mistral">Mistral AI</option>
<option value="cohere">Cohere</option>
<option value="other">Other / Custom</option>
</select>

<label>Purpose *</label>
<select id="purpose">
<option value="">Select purpose...</option>
<option value="search_indexing">Search Indexing</option>
<option value="research">Academic Research</option>
<option value="monitoring">Site Monitoring</option>
<option value="training_data">Training Data Collection</option>
<option value="competitive_analysis">Competitive Analysis</option>
<option value="accessibility">Accessibility Testing</option>
<option value="other">Other</option>
</select>

<label>Owner / Organization *</label>
<input type="text" id="owner" placeholder="e.g., ACME Corp Research Lab">

<label>Contact Email</label>
<input type="email" id="contactEmail" placeholder="agent-owner@example.com">

<label>Mission Description *</label>
<textarea id="mission" placeholder="Describe what your agent will do on this site..."></textarea>

<label>Expected Rate (requests/minute)</label>
<input type="number" id="rateLimit" placeholder="e.g., 60" value="10">

<label style="margin-top:.5rem">
<input type="checkbox" id="respectsRobots" checked>
 I/we respect robots.txt and will follow all crawling directives
</label>

<button type="submit" class="btn">Submit Declaration →</button>
</form>

<div class="success" id="success">
<h3>✓ Declaration Received</h3>
<p style="color:#8b949e">Your agent has been registered. Include this header in all requests:</p>
<pre style="background:#0d1117;padding:.75rem;border-radius:4px;margin-top:.5rem;font-size:.85em" id="headerOutput"></pre>
<p style="color:#8b949e;margin-top:.5rem">You will receive prioritized access. Your declaration has been logged.</p>
</div>
</div>

<div class="card">
<h2>📖 Policy</h2>
<table>
<tr><th>Action</th><th>Score Range</th><th>Description</th></tr>
<tr><td><span style="color:#238636">allow</span></td><td>0-29</td><td>Normal access with standard rate limits</td></tr>
<tr><td><span style="color:#d29922">limited</span></td><td>30-54</td><td>Access with reduced rate limits</td></tr>
<tr><td><span style="color:#d29922">challenge</span></td><td>55-69</td><td>Redirect to browser verification</td></tr>
<tr><td><span style="color:#1f6feb">sandbox</span></td><td>70-89</td><td>Redirect to controlled honeypot environment</td></tr>
<tr><td><span style="color:#da3633">block</span></td><td>90-100</td><td>Access denied</td></tr>
</table>
</div>

<div class="footer">
AgentGate v0.1.0 · <a href="/agentgate-dashboard" style="color:#58a6ff">Dashboard</a>
</div>
</div>

<script>
document.getElementById('declarationForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const decl = {
    agentName: document.getElementById('agentName').value,
    provider: document.getElementById('provider').value,
    purpose: document.getElementById('purpose').value,
    owner: document.getElementById('owner').value,
    contactEmail: document.getElementById('contactEmail').value,
    mission: document.getElementById('mission').value,
    rate_limit: parseInt(document.getElementById('rateLimit').value),
    respectsRobotsTxt: document.getElementById('respectsRobots').checked,
    declaredAt: new Date().toISOString(),
  };

  // Generate header value
  const headerVal = 'AgentGate ' + btoa(JSON.stringify(decl));
  document.getElementById('headerOutput').textContent = 'X-Agent-Declaration: ' + headerVal;
  document.getElementById('success').style.display = 'block';

  // Actually send the declaration
  fetch('/agentgate-declare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decl),
  });
});
</script>
</body></html>`
}

export function generateDeclarationApiResponse(declaration: AgentDeclaration): {
  status: string
  agentId: string
  instructions: string
  rateLimit: number
  allowedPaths: string[]
} {
  const agentId = `ag-${Math.random().toString(36).slice(2, 10)}`
  return {
    status: 'registered',
    agentId,
    instructions: `Include header X-Agent-ID: ${agentId} in all requests`,
    rateLimit: declaration.rate_limit || 60,
    allowedPaths: ['/public/*', '/docs/*', '/blog/*'],
  }
}
