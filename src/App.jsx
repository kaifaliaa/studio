import React, { useState, useEffect } from 'react'

function App() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <nav className="bg-purple-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h2 className="text-2xl font-bold">ALI ENTERPRISES</h2>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Property Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <svg className="w-12 h-12 text-purple-700" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 3L4 9v12h16V9l-8-6z"/>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Property Management</h2>
            </div>
            <p className="text-gray-600">
              Professional property management services for residential and commercial properties.
            </p>
          </div>

          {/* Documentation Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <svg className="w-12 h-12 text-purple-700" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Documentation</h2>
            </div>
            <p className="text-gray-600">
              Complete documentation and transaction management services.
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <p className="text-lg text-purple-700 font-semibold">
              System Status: Active
            </p>
            <p className="text-gray-600">
              Current Time: {time.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App