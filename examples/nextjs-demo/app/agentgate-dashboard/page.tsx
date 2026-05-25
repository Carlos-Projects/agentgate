import { generateSummary } from '../../../../src/dashboard/summarize';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const logPath = path.join(process.cwd(), 'agentgate-logs.jsonl');
  
  let summary;
  try {
    summary = await generateSummary(logPath, 1000);
  } catch {
    summary = null;
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>AgentGate Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Real-time analytics for AI agent traffic
      </p>

      {!summary || summary.totalRequests === 0 ? (
        <div style={{ padding: '2rem', background: '#f5f5f5', borderRadius: '8px' }}>
          <p>No logs yet. Visit some pages to generate data.</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Logs are stored in: <code>agentgate-logs.jsonl</code>
          </p>
        </div>
      ) : (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard title="Total Requests" value={summary.totalRequests} />
            <StatCard title="Suspected Agents" value={summary.suspectedAgents} color="orange" />
            <StatCard title="Honeypot Hits" value={summary.honeypotHits} color="red" />
            <StatCard title="Avg Score" value={Math.round(summary.recentEvents.reduce((s, e) => s + e.score, 0) / summary.recentEvents.length) || 0} />
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Score Distribution</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <DistributionBar label="Low (0-30)" value={summary.scoreDistribution.low} color="green" />
              <DistributionBar label="Medium (31-60)" value={summary.scoreDistribution.medium} color="yellow" />
              <DistributionBar label="High (61-90)" value={summary.scoreDistribution.high} color="orange" />
              <DistributionBar label="Critical (91-100)" value={summary.scoreDistribution.critical} color="red" />
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Actions Taken</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(summary.actionsTaken).map(([action, count]) => (
                <StatCard key={action} title={action.toUpperCase()} value={count} />
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Top User Agents</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {summary.topUserAgents.map(({ ua, count }) => (
                <li key={ua} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                  <strong>{ua.slice(0, 80)}</strong> - {count} requests
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Top Paths</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {summary.topPaths.map(({ path: p, count }) => (
                <li key={p} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                  <code>{p}</code> - {count} requests
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Recent Events</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '0.5rem' }}>Time</th>
                  <th style={{ padding: '0.5rem' }}>Action</th>
                  <th style={{ padding: '0.5rem' }}>Score</th>
                  <th style={{ padding: '0.5rem' }}>Path</th>
                  <th style={{ padding: '0.5rem' }}>Signals</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentEvents.map((event, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(event.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        background: getActionColor(event.action),
                        color: 'white',
                        fontSize: '0.8rem'
                      }}>
                        {event.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>{event.score}</td>
                    <td style={{ padding: '0.5rem' }}><code>{event.path}</code></td>
                    <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{event.signals.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #eee', fontSize: '0.9rem', color: '#666' }}>
        <p>AgentGate Dashboard - Refresh to see updated data</p>
      </footer>
    </main>
  );
}

function StatCard({ title, value, color = 'blue' }: { title: string; value: number; color?: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: `var(--${color}-color, #333)` }}>{value}</div>
    </div>
  );
}

function DistributionBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: '150px' }}>
      <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{
        height: '20px',
        background: `var(--${color}-color, #ddd)`,
        borderRadius: '4px',
        width: `${Math.min(100, (value / Math.max(1, value)) * 100)}%`,
        minWidth: value > 0 ? '20px' : '0',
        transition: 'width 0.3s'
      }} />
      <div style={{ fontSize: '0.8rem', color: '#666' }}>{value} requests</div>
    </div>
  );
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    allow: '#22c55e',
    limited: '#06b6d4',
    challenge: '#eab308',
    sandbox: '#a855f7',
    block: '#ef4444',
    log_only: '#6b7280',
  };
  return colors[action] || '#6b7280';
}
