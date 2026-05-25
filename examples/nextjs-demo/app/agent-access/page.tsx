export default function AgentAccess() {
  return (
    <main style={{ 
      padding: '3rem', 
      fontFamily: 'system-ui', 
      maxWidth: '600px', 
      margin: '2rem auto',
      textAlign: 'center'
    }}>
      <div style={{ 
        padding: '2rem', 
        background: '#fef3c7', 
        borderRadius: '12px',
        border: '2px solid #f59e0b'
      }}>
        <h1 style={{ color: '#92400e', marginBottom: '1rem' }}>
          Agent Access Challenge
        </h1>
        
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Automated access to this site requires declaration of your mission
          and acceptance of our usage policy.
        </p>

        <div style={{ 
          textAlign: 'left', 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Agent Policy</h3>
          <ul style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
            <li>✅ Search indexing (Google, Bing) - Allowed</li>
            <li>✅ Personal assistants - Limited access</li>
            <li>❌ AI training - Denied</li>
            <li>❌ Commercial scraping - Denied</li>
            <li>⚠️ Price monitoring - Requires API access</li>
          </ul>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Declare Your Mission</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Send a structured declaration to access content:
          </p>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            overflow: 'auto'
          }}>{`{
  "agent_name": "YourAgent",
  "operator": "YourCompany",
  "purpose": "personal_assistant",
  "content_use": "read",
  "accepts_policy": true
}`}</pre>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a 
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            Return to Site
          </a>
          <a 
            href="/agent-sandbox"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6b7280',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px'
            }}
          >
            Enter Sandbox
          </a>
        </div>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
        For API access, contact: api@example.com
      </p>
    </main>
  );
}
