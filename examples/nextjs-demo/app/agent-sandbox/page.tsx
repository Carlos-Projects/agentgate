export default function AgentSandbox() {
  return (
    <main style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui',
      background: '#fafafa',
      minHeight: '100vh'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        padding: '2rem',
        background: 'white',
        borderRadius: '12px',
        border: '2px solid #e5e7eb'
      }}>
        <h1 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
          🤖 Agent Sandbox
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
          Controlled environment for unverified agents
        </p>

        <div style={{ 
          padding: '1.5rem', 
          background: '#fef2f2', 
          borderRadius: '8px',
          border: '1px solid #fecaca',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#dc2626', marginTop: 0 }}>
            ⚠️ Limited Access Zone
          </h3>
          <p style={{ lineHeight: '1.6' }}>
            You are in a sandboxed environment. Content here is limited and 
            monitored. To access full content, please:
          </p>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Declare your mission at <a href="/agent-access">/agent-access</a></li>
            <li>Use our official API at <code>/api/agent-api</code></li>
            <li>Contact us for authorized access</li>
          </ol>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          background: '#f0f9ff', 
          borderRadius: '8px',
          border: '1px solid #bae6fd',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#0369a1', marginTop: 0 }}>
            📋 Available Resources
          </h3>
          <ul style={{ lineHeight: '2' }}>
            <li>
              <a href="/llms.txt" style={{ color: '#0284c7' }}>
                /llms.txt
              </a> - Structured content summary
            </li>
            <li>
              <a href="/agent-policy.json" style={{ color: '#0284c7' }}>
                /agent-policy.json
              </a> - Machine-readable policy
            </li>
            <li>
              <a href="/robots.txt" style={{ color: '#0284c7' }}>
                /robots.txt
              </a> - Crawler directives
            </li>
          </ul>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          background: '#f5f5f5', 
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Sandbox Rules</h3>
          <ul style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
            <li>Maximum 5 page views per session</li>
            <li>No access to /admin, /api, or /pricing</li>
            <li>All activity is logged</li>
            <li>Repeated violations result in blocking</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a 
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              marginRight: '1rem'
            }}
          >
            Exit Sandbox
          </a>
          <a 
            href="/agent-honeypot"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px'
            }}
          >
            Test Honeypot
          </a>
        </div>
      </div>

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '2rem', 
        fontSize: '0.85rem', 
        color: '#9ca3af' 
      }}>
        AgentGate Sandbox • Session ID: {Math.random().toString(36).slice(2)}
      </footer>
    </main>
  );
}
