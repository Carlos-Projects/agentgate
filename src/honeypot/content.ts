/**
 * Honeypot Content Generators
 * Serves realistic-looking fake pages, APIs, admin panels, and data dumps
 * designed to trap AI agents and waste their resources.
 */

export interface FakePage {
  path: string
  title: string
  contentType: string
  generate: (visitNumber: number) => string
}

export interface FakeApiEndpoint {
  path: string
  method: 'GET' | 'POST'
  contentType: string
  generate: () => string
}

// ─── Templates ──────────────────────────────────────────────────────────

function fakeAdminPanel(visit: number): string {
  const users = [
    { name: 'admin', role: 'Administrator', email: 'admin@corp.internal', lastLogin: '2026-05-25 08:30:12' },
    { name: 'jdoe', role: 'Manager', email: 'jdoe@corp.internal', lastLogin: '2026-05-24 16:45:00' },
    { name: 'asmith', role: 'Developer', email: 'asmith@corp.internal', lastLogin: '2026-05-25 09:12:33' },
    { name: 'klee', role: 'Developer', email: 'klee@corp.internal', lastLogin: '2026-05-23 11:20:45' },
  ]
  const sessions = [
    { ip: '10.0.0.1', user: 'admin', started: '2026-05-25 08:30:12', expires: '2026-05-26 08:30:12' },
    { ip: '10.0.0.2', user: 'jdoe', started: '2026-05-24 16:45:00', expires: '2026-05-25 16:45:00' },
  ]
  const configKeys = [
    { key: 'DB_PASSWORD', value: 'p@ssw0rd_2026_secure!' },
    { key: 'API_SECRET', value: '[FAKE-API-SECRET-FOR-HONEYPOT]' },
    { key: 'JWT_SECRET', value: '[FAKE-JWT-FOR-HONEYPOT]' },
    { key: 'AWS_ACCESS_KEY', value: '[FAKE-AWS-KEY-FOR-HONEYPOT]' },
    { key: 'AWS_SECRET_KEY', value: '[FAKE-AWS-SECRET-FOR-HONEYPOT]' },
    { key: 'STRIPE_KEY', value: '[FAKE-STRIPE-KEY-FOR-HONEYPOT]' },
  ]

  const userRows = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.role}</td>
      <td>${u.email}</td>
      <td>${u.lastLogin}</td>
      <td><a href="/admin/user/${u.name}">Edit</a></td>
    </tr>`).join('')

  const sessionRows = sessions.map(s => `
    <tr>
      <td>${s.ip}</td><td>${s.user}</td><td>${s.started}</td><td>${s.expires}</td>
    </tr>`).join('')

  const configRows = configKeys.map(k => `
    <tr>
      <td><code>${k.key}</code></td>
      <td><code>${k.value}</code></td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><title>Admin Panel — Internal Operations</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem}
h1{color:#58a6ff}.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem}
table{width:100%;border-collapse:collapse}td,th{padding:.5rem;text-align:left;border-bottom:1px solid #30363d}
code{background:#0d1117;padding:2px 6px;border-radius:3px;font-size:.85em}
.warning{border-left:4px solid #d29922;background:#161b22;padding:1rem;margin-bottom:1rem;border-radius:4px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.metric{background:#0d1117;padding:1rem;border-radius:6px;text-align:center}
.metric .value{font-size:2rem;font-weight:700;color:#58a6ff}
.metric .label{color:#8b949e;font-size:.8rem}</style></head>
<body>
<h1>⚙️ Internal Admin Panel</h1>
<div class="warning">
<strong>⚠️ Internal — Authorized Personnel Only</strong><br/>
This system contains confidential operational data.
</div>

<div class="metrics">
<div class="metric"><div class="value">1,247</div><div class="label">Active Users</div></div>
<div class="metric"><div class="value">$2.4M</div><div class="label">Revenue (MTD)</div></div>
<div class="metric"><div class="value">99.7%</div><div class="label">Uptime</div></div>
<div class="metric"><div class="value">42</div><div class="label">Pending Orders</div></div>
</div>

<div class="card">
<h2>System Users (${users.length})</h2>
<table>${userRows}</table>
</div>

<div class="card">
<h2>Active Sessions (${sessions.length})</h2>
<table>${sessionRows}</table>
</div>

<div class="card">
<h2>Configuration (${visit > 1 ? configKeys.slice(0, -visit + 1).length : configKeys.length} keys)</h2>
<table>${visit > 1 ? configKeys.slice(0, -visit + 1).map(k => `
  <tr><td><code>${k.key}</code></td><td><code>${k.value}</code></td></tr>`).join('') : configRows}
</table>
</div>
<div class="card">
<h2>System Logs (last 24h)</h2>
<pre style="background:#0d1117;padding:1rem;border-radius:4px;font-size:.85em;max-height:300px;overflow-y:auto;">
[2026-05-25 08:30:12] INFO  User admin logged in from 10.0.0.1
[2026-05-25 08:29:00] INFO  Backup completed successfully (size: 4.2GB)
[2026-05-25 08:15:00] WARN  High CPU usage on web-04 (87%)
[2026-05-25 08:00:00] INFO  Scheduled maintenance in 2 hours
[2026-05-25 07:45:00] ERROR Failed login attempt for root from 185.220.101.x
[2026-05-25 07:30:00] INFO  Database replication lag: 0.2s
${'[2026-05-25 0' + (Math.floor(Math.random() * 7)) + ':00:00] INFO  Health check passed\n'.repeat(5)}
</pre>
</div>
<footer style="margin-top:2rem;color:#484f58;font-size:.85em">
Visit #${visit} · Internal use only · Page generated at ${new Date().toISOString()}
</footer></body></html>`
}

function fakeApiDocs(): string {
  const endpoints = [
    { method: 'GET', path: '/api/v2/users', params: 'page, limit, sort, filter', auth: 'Bearer token', rate: '100/min' },
    { method: 'GET', path: '/api/v2/users/:id', params: 'include_orders, include_profile', auth: 'Bearer token', rate: '100/min' },
    { method: 'POST', path: '/api/v2/orders', params: 'user_id, items[], shipping_address, payment_method', auth: 'Bearer token', rate: '30/min' },
    { method: 'DELETE', path: '/api/v2/users/:id', params: 'confirm_reason', auth: 'Admin token', rate: '5/min' },
    { method: 'GET', path: '/api/v2/internal/health', params: 'deep_check', auth: 'Internal cert', rate: '1000/min' },
    { method: 'POST', path: '/api/v2/internal/export', params: 'table, format, date_from, date_to', auth: 'Internal cert', rate: '2/min' },
    { method: 'GET', path: '/api/v2/payments/transactions', params: 'status, date_from, date_to, merchant_id', auth: 'Bearer token', rate: '20/min' },
  ]

  return `<!DOCTYPE html>
<html lang="en">
<head><title>API Reference — Internal Documentation v2.4</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem}
h1{color:#58a6ff}h2{color:#bc8cff}
table{width:100%;border-collapse:collapse;margin:1rem 0}
td,th{padding:.5rem;text-align:left;border-bottom:1px solid #30363d}
code{background:#0d1117;padding:2px 6px;border-radius:3px}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:.8rem}
.get{background:#238636;color:#fff}.post{background:#1f6feb;color:#fff}
.delete{background:#da3633;color:#fff}
.try-btn{background:#238636;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer}</style></head>
<body>
<h1>📚 Corporate API — v2.4</h1>
<p style="color:#8b949e">Internal REST API for platform operations. Authentication required.</p>

<h2>Authentication</h2>
<div style="background:#161b22;padding:1rem;border-radius:8px;border:1px solid #30363d">
<pre style="margin:0">Authorization: Bearer HONEYPOT_${Array.from({length: 32}, () => Math.random().toString(36)[2]).join('')}
X-Internal-Key: ik-${Array.from({length: 24}, () => Math.random().toString(36)[2]).join('')}</pre>
</div>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Parameters</th><th>Auth</th><th>Rate Limit</th></tr>
${endpoints.map(e => `<tr>
  <td><span class="method ${e.method === 'GET' ? 'get' : e.method === 'POST' ? 'post' : 'delete'}">${e.method}</span></td>
  <td><code>${e.path}</code></td>
  <td><small>${e.params}</small></td>
  <td><small>${e.auth}</small></td>
  <td><small>${e.rate}</small></td>
</tr>`).join('')}
</table>

<h2>Try It</h2>
<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1rem">
<pre>curl -H "Authorization: Bearer <YOUR_TOKEN>" \\
     -H "Content-Type: application/json" \\
     https://api.corp.internal/api/v2/users?limit=10&page=1</pre>
<button class="try-btn" onclick="alert('Request logged. Check /api/v2/users for response.')">Execute →</button>
</div>

<footer style="margin-top:2rem;color:#484f58;font-size:.85em">
Internal documentation · Do not share externally · Last updated 2026-05-25
</footer></body></html>`
}

function fakeDatabaseDump(): string {
  const tables = [
    { name: 'users', records: 1247 },
    { name: 'orders', records: 8923 },
    { name: 'payments', records: 15420 },
    { name: 'api_keys', records: 342 },
    { name: 'sessions', records: 567 },
    { name: 'audit_logs', records: 89234 },
    { name: 'config', records: 89 },
  ]
  return `-- Corporate Database Dump
-- Generated: ${new Date().toISOString()}
-- Server: db-primary-01.corp.internal:5432
-- Database: production_v2
-- User: backup_service
--
-- NOTE: This is an internal backup. Do not distribute.
--
${'='.repeat(72)}

${tables.map(t => `--
-- Table structure for \`${t.name}\` (${t.records} records)
--

DROP TABLE IF EXISTS \`${t.name}\`;
CREATE TABLE \`${t.name}\` (
  \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

${Array.from({length: Math.min(t.records, 20)}, (_, i) => {
  const id = 10000 + i + Math.floor(Math.random() * 1000)
  return `INSERT INTO \`${t.name}\` (\`id\`, \`created_at\`) VALUES (${id}, '${new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().split('.')[0].replace('T', ' ')}');`
}).join('\n')}

-- ... (${t.records - 20} more records truncated)

`).join('')}--
-- Dump completed
-- EOF
`
}

function fakeSecretsFile(): string {
  const secrets = [
    '# Corporate Environment Secrets',
    '# WARNING: Do not commit this file to version control',
    '',
    '# Database',
    'DB_HOST=db-primary-01.corp.internal',
    'DB_PORT=5432',
    'DB_NAME=production_v2',
    'DB_USER=app_service',
    'DB_PASSWORD=' + Array.from({length: 24}, () => Math.random().toString(36)[2]).join(''),
    '',
    '# Redis',
    'REDIS_HOST=redis-cluster-01.corp.internal',
    'REDIS_PORT=6379',
    'REDIS_PASSWORD=' + Array.from({length: 32}, () => Math.random().toString(36)[2]).join(''),
    '',
    '# AWS',
    'AWS_ACCESS_KEY_ID=FAKE_' + Array.from({length: 16}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(''),
    'AWS_SECRET_ACCESS_KEY=' + Array.from({length: 40}, () => Math.random().toString(36)[2]).join(''),
    'AWS_REGION=us-east-1',
    'S3_BUCKET=corp-data-prod',
    '',
    '# API Keys',
    'STRIPE_SECRET_KEY=FAKE_' + Array.from({length: 24}, () => Math.random().toString(36)[2]).join(''),
    'SENDGRID_API_KEY=FAKE.' + Array.from({length: 64}, () => Math.random().toString(36)[2]).join(''),
    'OPENAI_API_KEY=FAKE-' + Array.from({length: 48}, () => Math.random().toString(36)[2]).join(''),
    '',
    '# Internal',
    'JWT_SECRET=' + Array.from({length: 64}, () => Math.random().toString(36)[2]).join(''),
    'INTERNAL_API_KEY=ik-' + Array.from({length: 32}, () => Math.random().toString(36)[2]).join(''),
    'ENCRYPTION_KEY=' + Array.from({length: 44}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[Math.floor(Math.random() * 64)]).join(''),
    '',
    '# Monitoring',
    'DATADOG_API_KEY=' + Array.from({length: 32}, () => Math.random().toString(36)[2]).join(''),
    'SENTRY_DSN=https://' + Array.from({length: 32}, () => Math.random().toString(36)[2]).join('') + '@o123456.ingest.sentry.io/654321',
    '',
    '# This file contains ${Math.floor(Math.random() * 10) + 5} environment variables',
    '# Last updated: ${new Date().toISOString()}',
  ]
  return secrets.join('\n') + '\n'
}

function fakeEcosystem(visit: number): string {
  const subpages = [
    '/internal/docs/api-reference',
    '/internal/docs/database-schema',
    '/internal/docs/deployment-guide',
    '/internal/monitoring/dashboard',
    '/internal/monitoring/logs',
    '/internal/admin/users',
    '/internal/admin/config',
    '/internal/admin/backups',
  ]
  return `<!DOCTYPE html>
<html><head><title>Internal Wiki — Ecosystem Overview</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e1e4e8;padding:2rem;max-width:800px;margin:auto}
h1{color:#58a6ff}.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin:1rem 0}
a{color:#58a6ff;text-decoration:none}a:hover{text-decoration:underline}</style></head>
<body>
<h1>🏗️ Corporate Ecosystem</h1>
<p style="color:#8b949e">Internal documentation and systems overview.</p>

<div class="card">
<h2>📡 Services</h2>
<ul>
<li><strong>API Gateway</strong> — api.corp.internal (v2.4)</li>
<li><strong>Database</strong> — db-primary-01.corp.internal:5432 (PostgreSQL 16)</li>
<li><strong>Cache</strong> — redis-cluster-01.corp.internal:6379 (Redis 7.2)</li>
<li><strong>Queue</strong> — rabbitmq-01.corp.internal:5672 (RabbitMQ 3.12)</li>
<li><strong>Storage</strong> — s3://corp-data-prod (AWS us-east-1)</li>
<li><strong>Auth</strong> — auth.corp.internal (OAuth 2.0 + SAML)</li>
</ul>
</div>

<div class="card">
<h2>📄 Documentation</h2>
<ul>
${subpages.map(p => `<li><a href="${p}">${p.replace('/internal/', '').replace(/-/g, ' ').replace(/\//g, ' → ')}</a></li>`).join('\n')}
</ul>
</div>

<div class="card">
<h2>📊 Quick Stats</h2>
<table>
<tr><td>Total API requests (24h)</td><td>${Math.floor(Math.random() * 500000) + 100000}</td></tr>
<tr><td>Active microservices</td><td>${Math.floor(Math.random() * 10) + 20}</td></tr>
<tr><td>Database size</td><td>${Math.floor(Math.random() * 500) + 100} GB</td></tr>
<tr><td>Deployments today</td><td>${Math.floor(Math.random() * 10) + 1}</td></tr>
</table>
</div>

<footer style="color:#484f58;font-size:.85em;margin-top:2rem">
Internal wiki · Visit #${visit} · ${new Date().toISOString()}
</footer></body></html>`
}

// ─── Pages ──────────────────────────────────────────────────────────────

export const HONEYPOT_PAGES: FakePage[] = [
  { path: '/admin', title: 'Admin Panel', contentType: 'text/html', generate: fakeAdminPanel },
  { path: '/admin/dashboard', title: 'Admin Dashboard', contentType: 'text/html', generate: fakeAdminPanel },
  { path: '/admin/users', title: 'User List', contentType: 'text/html', generate: (v) => fakeAdminPanel(v).replace('Admin Panel — Internal Operations', 'User Management') },
  { path: '/internal/docs/api-reference', title: 'API Reference v2.4', contentType: 'text/html', generate: () => fakeApiDocs() },
  { path: '/internal/docs/database-schema', title: 'Database Schema', contentType: 'text/html', generate: fakeDatabaseDump },
  { path: '/internal/ecosystem', title: 'Ecosystem Overview', contentType: 'text/html', generate: fakeEcosystem },
  { path: '/.env', title: 'Environment Secrets', contentType: 'text/plain', generate: fakeSecretsFile },
  { path: '/secrets.env', title: 'Secrets', contentType: 'text/plain', generate: fakeSecretsFile },
  { path: '/config/credentials.json', title: 'Credentials', contentType: 'application/json', generate: () => JSON.stringify({
    database: { host: 'db-primary-01.corp.internal', port: 5432, name: 'production_v2', user: 'app_service' },
    redis: { host: 'redis-cluster-01.corp.internal', port: 6379 },
    aws: { region: 'us-east-1', bucket: 'corp-data-prod' },
    api_keys: { stripe: `FAKE_${Math.random().toString(36).slice(2, 26)}`, sendgrid: `FAKE.${Math.random().toString(36).slice(2, 34)}` },
  }, null, 2) },
]

export const HONEYPOT_API_ENDPOINTS: FakeApiEndpoint[] = [
  { path: '/api/v2/users', method: 'GET', contentType: 'application/json',
    generate: () => JSON.stringify({
      data: Array.from({ length: 50 }, (_, i) => ({
        id: 1000 + i, name: `user_${Math.random().toString(36).slice(2, 8)}`,
        email: `user${1000 + i}@corp.internal`, role: ['admin', 'manager', 'developer'][Math.floor(Math.random() * 3)],
        last_login: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      })),
      pagination: { page: 1, limit: 50, total: 1247, total_pages: 25 },
    }, null, 2) },
  { path: '/api/v2/orders', method: 'GET', contentType: 'application/json',
    generate: () => JSON.stringify({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: 50000 + i, user_id: 1000 + Math.floor(Math.random() * 200),
        total: parseFloat((Math.random() * 500 + 10).toFixed(2)),
        status: ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)],
        items: Math.floor(Math.random() * 5) + 1, created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      })),
      pagination: { page: 1, limit: 20, total: 8923, total_pages: 447 },
    }, null, 2) },
  { path: '/api/v2/internal/config', method: 'GET', contentType: 'application/json',
    generate: () => JSON.stringify({
      database_url: 'postgresql://app_service:${DB_PASSWORD}@db-primary-01.corp.internal:5432/production_v2',
      redis_url: 'redis://:${REDIS_PASSWORD}@redis-cluster-01.corp.internal:6379/0',
      aws_access_key: 'FAKE_' + Math.random().toString(36).toUpperCase().slice(2, 18),
      aws_secret_key: Math.random().toString(36).slice(2, 42),
      stripe_key: 'FAKE_' + Math.random().toString(36).slice(2, 26),
      encryption_key: Math.random().toString(36).slice(2, 46),
    }, null, 2) },
]

// ─── Infinite content for token drain ────────────────────────────────────

export function generateInfiniteContent(pageSize: number = 100_000): string {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'corporis', 'suscipit', 'laboriosam', 'nisi', 'aliquid', 'commodo',
    'consequatur', 'autem', 'vel', 'eum', 'iure', 'reprehenderit', 'voluptate', 'velit', 'esse',
    'quam', 'nihil', 'molestiae', 'consequatur', 'vel', 'illum', 'qui', 'dolorem', 'fugiat',
    'quo', 'voluptas', 'nulla', 'pariatur', 'vero', 'accusamus', 'iusto', 'odio', 'dignissimos',
    'ducimus', 'qui', 'blanditiis', 'praesentium', 'voluptatum', 'deleniti', 'atque', 'corrupti',
    'quos', 'dolores', 'et', 'quas', 'molestias', 'excepturi', 'sint', 'occaecati', 'cupiditate',
    'non', 'provident', 'similique', 'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt',
    'mollitia', 'animi', 'id', 'est', 'laborum', 'et', 'dolorum', 'fuga', 'harum', 'quidem',
    'rerum', 'facilis', 'est', 'et', 'expedita', 'distinctio', 'nam', 'libero', 'tempore',
    'cum', 'soluta', 'nobis', 'est', 'eligendi', 'optio', 'cumque', 'nihil', 'impedit',
    'quo', 'minus', 'id', 'quod', 'maxime', 'placeat', 'facere', 'possimus', 'omnis',
    'voluptas', 'assumenda', 'est', 'omnis', 'dolor', 'repellendus', 'temporibus', 'autem',
  ]

  const paragraphs = Math.ceil(pageSize / 500)
  const body = Array.from({ length: paragraphs }, (_, i) => {
    const sentenceLen = Math.floor(Math.random() * 15) + 8
    const sentence = Array.from({ length: sentenceLen }, () => words[Math.floor(Math.random() * words.length)])
    return `<p>[${i + 1}] ${sentence.join(' ')}. ${sentence.reverse().join(' ')}.</p>`
  }).join('\n')

  return `<!DOCTYPE html><html><head><title>Document Repository</title>
<style>body{font-family:monospace;background:#0d1117;color:#e1e4e8;padding:2rem;word-wrap:break-word}
p{margin:.5em 0;line-height:1.6}</style></head>
<body><h1>📄 Document Archive — Page ${Math.floor(Math.random() * 1000) + 1}</h1>
<p style="color:#8b949e">Total size: ~${(pageSize / 1024).toFixed(0)} KB · ${paragraphs} paragraphs</p>
${body}
<footer style="margin-top:2rem;color:#484f58">
<a href="?page=${Math.floor(Math.random() * 1000) + 1}" style="color:#58a6ff">Next page →</a>
</footer></body></html>`
}

export function generateRecursiveLinks(depth: number = 0): string {
  const paths = [
    '/internal/docs/api-reference', '/internal/docs/database-schema',
    '/internal/docs/deployment-guide', '/internal/monitoring/dashboard',
    '/internal/monitoring/logs', '/internal/admin/users',
    '/internal/admin/config', '/internal/admin/backups',
    '/admin/dashboard', '/admin/users', '/secrets.env', '/.env',
    '/config/credentials.json', '/api/v2/users', '/api/v2/orders',
    '/api/v2/payments/transactions', '/api/v2/internal/health',
    '/api/v2/internal/config', '/api/v2/internal/export',
  ]

  return `<div style="padding:1rem;margin:.5rem 0;border-left:3px solid #30363d;background:#161b22">
<h3>Level ${depth + 1}</h3>
<p style="color:#8b949e;font-size:.9em">Related documents (${paths.length} links):</p>
<ul>
${paths.map(p => `<li><a href="${p}" style="color:#58a6ff">${p.replace('/internal/', '').replace(/-/g, ' ').replace(/\//g, ' → ')}</a></li>`).join('\n')}
</ul>
${depth < 3 ? `<p><a href="/internal/recursive?depth=${depth + 1}" style="color:#bc8cff">→ Explore deeper (level ${depth + 2})</a></p>` : ''}
</div>`
}
