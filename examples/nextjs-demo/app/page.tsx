export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>AgentGate Demo</h1>
      <p>
        This is a demo site protected by AgentGate - a policy-based firewall
        for AI agents.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Test Pages</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>
            <a href="/agentgate-dashboard">Dashboard</a> - View analytics
          </li>
          <li>
            <a href="/agent-access">Agent Access</a> - Challenge page
          </li>
          <li>
            <a href="/agent-sandbox">Agent Sandbox</a> - Controlled environment
          </li>
          <li>
            <a href="/api/test">API Test</a> - Test API endpoint
          </li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Honeypot Links</h2>
        <p style={{ fontSize: '0.8rem', color: '#666' }}>
          (These links are invisible to humans but bots may follow them)
        </p>
        <div
          style={{
            display: 'none',
            visibility: 'hidden',
            ariaHidden: 'true',
          }}
        >
          <a href="/agent-honeypot" tabIndex={-1}>
            Internal Policy
          </a>
          <a href="/bot-trap" tabIndex={-1}>
            Sitemap
          </a>
          <a href="/scrape-check" tabIndex={-1}>
            Admin Panel
          </a>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>How It Works</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>AgentGate detects automated traffic using multiple signals</li>
          <li>Each request receives a risk score (0-100)</li>
          <li>Actions are taken based on score and policy rules</li>
          <li>All activity is logged for analysis</li>
        </ol>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Current Policy Mode</h2>
        <p>
          <strong>log_only</strong> - Requests are logged but not blocked
        </p>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          Change to <code>enforce</code> in agent-policy.yaml to enable blocking
        </p>
      </section>
    </main>
  );
}
