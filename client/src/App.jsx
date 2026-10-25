import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('Not checked yet')

  async function checkBackend() {
    setMessage('Checking...')

    try {
      const response = await fetch('/api/health')

      if (!response.ok) {
        throw new Error('Request failed')
      }

      const data = await response.json()
      setMessage(data.message)
    } catch {
      setMessage('Cannot connect to the backend')
    }
  }

  return (
    <main>
      <h1>Teh Peng Platform</h1>
      <button onClick={checkBackend}>Check backend</button>
      <p>{message}</p>
    </main>
  )
}

export default App