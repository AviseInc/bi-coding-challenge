import { useState } from 'react'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <div className="app-container">
      <header>
        <h1>Avise Query Tool</h1>
        {isLoggedIn && (
          <div className="user-info">
            <span>user@example.com</span>
            <button onClick={() => setIsLoggedIn(false)}>Logout</button>
          </div>
        )}
      </header>

      <main>
        {isLoggedIn ? (
          <div className="query-interface">
            <div className="sql-canvas">
              <textarea
                placeholder="Enter your SQL query here..."
                rows={10}
              />
              <div className="query-controls">
                <label>
                  Max Results:
                  <input type="number" defaultValue={100} />
                </label>
                <div className="button-group">
                  <button>Clear</button>
                  <button className="primary">Run Query</button>
                </div>
              </div>
            </div>
            <div className="results-section">
              <h2>Results</h2>
              <div className="format-selector">
                <button>Table</button>
                <button>JSON</button>
                <button>CSV</button>
                <button>Google Sheet</button>
              </div>
              <div className="results-display">
                <p>No results to display. Run a query to see results here.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="login-form">
            <h2>Login</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              setIsLoggedIn(true)
            }}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" required />
              </div>
              <button type="submit" className="primary">Login</button>
            </form>
            <div className="google-login">
              <button className="google-button">Sign in with Google</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
