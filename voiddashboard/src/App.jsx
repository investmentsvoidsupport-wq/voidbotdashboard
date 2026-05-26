import { useEffect, useState } from 'react';

const sampleStatus = {
  botName: 'Void Bot',
  prefix: '!',
  guilds: 24,
  users: 4785,
  uptime: '3d 12h',
  shard: 1,
  memory: '185 MB',
  cpu: '12.5%',
  online: true,
  commands: ['blacklist', 'ticket', 'economy', 'moderation'],
  recentRequests: [
    { id: '#0012', user: '@NightRider', action: 'Blacklist', status: 'Pending', time: '2m ago' },
    { id: '#0011', user: '@Echo', action: 'Warning', status: 'Approved', time: '18m ago' },
    { id: '#0010', user: '@Nova', action: 'Blacklist', status: 'Rejected', time: '1h ago' }
  ],
  activity: [
    { label: 'Mon', value: 18 },
    { label: 'Tue', value: 22 },
    { label: 'Wed', value: 27 },
    { label: 'Thu', value: 20 },
    { label: 'Fri', value: 32 },
    { label: 'Sat', value: 26 },
    { label: 'Sun', value: 30 }
  ],
  alerts: ['Blacklist role not configured', 'Monitor command queue delay']
};

function App() {
  const [status, setStatus] = useState(sampleStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error('API not available');
        const data = await response.json();
        setStatus((prev) => ({ ...prev, ...data }));
      } catch (err) {
        setError('Using sample dashboard data. Connect a backend to enable live bot metrics.');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  const maxActivity = Math.max(...status.activity.map((item) => item.value));

  return (
    <div className="layout">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">V</span>
          <div>
            <p className="brand-title">Void Bot</p>
            <p className="brand-subtitle">Admin Control Panel</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button button-secondary">Support</button>
          <button className="button button-primary">Sign in</button>
        </div>
      </nav>

      <header className="hero-card hero-grid">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Power up your server moderation workflow.</h1>
          <p>Manage blacklist requests, monitor bot health, and see the latest activity from your Discord bot in one place.</p>
          <div className="hero-tags">
            <span>Discord Bot</span>
            <span>Moderation</span>
            <span>Analytics</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="status-pill">Live status</div>
          <div className="hero-stat">
            <strong>{status.guilds}</strong>
            <span>Servers</span>
          </div>
          <div className="hero-stat">
            <strong>{status.users}</strong>
            <span>Users served</span>
          </div>
          <div className="hero-stat">
            <strong>{status.commands.length}</strong>
            <span>Commands</span>
          </div>
        </div>
      </header>

      <section className="grid-panel">
        <div className="panel card status-summary">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Bot health at a glance</h2>
            </div>
            <span className={`badge ${status.online ? 'online' : 'offline'}`}>
              {status.online ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="status-grid">
            <div className="status-card">
              <span>Bot</span>
              <strong>{status.botName}</strong>
            </div>
            <div className="status-card">
              <span>Uptime</span>
              <strong>{status.uptime}</strong>
            </div>
            <div className="status-card">
              <span>Memory</span>
              <strong>{status.memory}</strong>
            </div>
            <div className="status-card">
              <span>CPU</span>
              <strong>{status.cpu}</strong>
            </div>
          </div>

          {loading && <p className="panel-alert">Loading live status…</p>}
          {error && <p className="panel-alert panel-error">{error}</p>}
        </div>

        <div className="panel card quick-actions">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h2>Manage bot settings</h2>
            </div>
          </div>
          <div className="actions-grid">
            <button className="action-card">Refresh data</button>
            <button className="action-card">View bot logs</button>
            <button className="action-card">Review blacklist</button>
            <button className="action-card">Open command history</button>
          </div>
        </div>
      </section>

      <section className="grid-panel">
        <div className="panel card wide-card activity-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Activity</p>
              <h2>Command activity this week</h2>
            </div>
            <span className="badge badge-soft">{status.prefix} help</span>
          </div>

          <div className="chart">
            {status.activity.map((item) => (
              <div key={item.label} className="chart-bar-wrap">
                <div className="chart-bar" style={{ height: `${(item.value / maxActivity) * 100}%` }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel card requests-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Requests</p>
              <h2>Recent moderation actions</h2>
            </div>
          </div>

          <div className="request-list">
            {status.recentRequests.map((request) => (
              <div key={request.id} className="request-item">
                <div>
                  <strong>{request.user}</strong>
                  <p>{request.action} • {request.time}</p>
                </div>
                <span className={`request-badge ${request.status.toLowerCase()}`}>{request.status}</span>
              </div>
            ))}
          </div>

          <div className="panel-note">Use these cards as the starting point for live data and approvals.</div>
        </div>
      </section>

      <section className="panel card help-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Setup</p>
            <h2>Next steps to connect your bot</h2>
          </div>
        </div>
        <ol>
          <li>Install dependencies: <code>npm install</code></li>
          <li>Run locally: <code>npm run dev</code></li>
          <li>Add a backend endpoint for <code>/api/status</code> to return bot metrics</li>
          <li>Connect Discord OAuth2 for secure admin login</li>
        </ol>
      </section>
    </div>
  );
}

export default App;
