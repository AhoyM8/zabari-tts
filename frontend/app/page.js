'use client'

import { useState, useEffect } from 'react'
import TTSManager from './components/TTSManager'

export default function Home() {
  // Chat platform states
  const [platforms, setPlatforms] = useState({
    twitch: { enabled: false, url: 'https://www.twitch.tv/popout/zabariyarin/chat?popout=' },
    youtube: { enabled: false, url: 'https://www.youtube.com/live_chat?is_popout=1&v=S6ATuj2NnUU' },
    kick: { enabled: false, url: 'https://kick.com/popout/xqc/chat' }
  })

  // TTS engine selection
  const [ttsEngine, setTtsEngine] = useState('webspeech') // 'webspeech' or 'neutts'

  // Connection mode selection
  const [connectionMode, setConnectionMode] = useState('playwright') // 'playwright' or 'api'
  const [youtubeApiKey, setYoutubeApiKey] = useState('') // For API mode YouTube

  // TTS configuration
  const [ttsConfig, setTtsConfig] = useState({
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
    announceUsername: true,
    excludeCommands: true,
    excludeLinks: true,
    excludeUsers: ['nightbot', 'moobot', 'streamelements', 'streamlabs', 'fossabot']
  })

  // NeuTTS specific config
  const [neuttsConfig, setNeuttsConfig] = useState({
    voice: 'dave',
    serverUrl: 'http://localhost:8765'
  })

  // App state
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')

  // Poll for messages when running
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/chat/messages')
        const data = await response.json()
        setMessages(data.messages)
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }, 500) // Poll every 500ms

    return () => clearInterval(interval)
  }, [isRunning])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = document.getElementById('chat-container')
    if (container && messages.length > 0) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  // Toggle platform
  const togglePlatform = (platform) => {
    setPlatforms(prev => ({
      ...prev,
      [platform]: { ...prev[platform], enabled: !prev[platform].enabled }
    }))
  }

  // Update platform URL
  const updatePlatformUrl = (platform, url) => {
    setPlatforms(prev => ({
      ...prev,
      [platform]: { ...prev[platform], url }
    }))
  }

  // Start/Stop chat logger
  const toggleChatLogger = async () => {
    if (isRunning) {
      // Stop
      try {
        const response = await fetch('/api/chat/stop', { method: 'POST' })
        const data = await response.json()
        if (data.success) {
          setIsRunning(false)
          setStatus('stopped')
        }
      } catch (error) {
        console.error('Error stopping chat logger:', error)
        setStatus('error')
      }
    } else {
      // Start
      try {
        const enabledPlatforms = Object.keys(platforms).filter(p => platforms[p].enabled)

        if (enabledPlatforms.length === 0) {
          alert('Please enable at least one chat platform')
          return
        }

        const config = {
          platforms,
          ttsEngine,
          connectionMode,
          youtubeApiKey: connectionMode === 'api' ? youtubeApiKey : undefined,
          ttsConfig: ttsEngine === 'webspeech' ? ttsConfig : neuttsConfig
        }

        const response = await fetch('/api/chat/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        })

        const data = await response.json()
        if (data.success) {
          setIsRunning(true)
          setStatus('running')
        }
      } catch (error) {
        console.error('Error starting chat logger:', error)
        setStatus('error')
      }
    }
  }

  // Add excluded user
  const addExcludedUser = (user) => {
    if (user && !ttsConfig.excludeUsers.includes(user.toLowerCase())) {
      setTtsConfig(prev => ({
        ...prev,
        excludeUsers: [...prev.excludeUsers, user.toLowerCase()]
      }))
    }
  }

  // Remove excluded user
  const removeExcludedUser = (user) => {
    setTtsConfig(prev => ({
      ...prev,
      excludeUsers: prev.excludeUsers.filter(u => u !== user)
    }))
  }

  return (
    <main className="min-h-screen p-8">
      {/* TTS Manager for API mode - only active when using API connection */}
      {connectionMode === 'api' && isRunning && (
        <TTSManager
          messages={messages}
          ttsConfig={ttsConfig}
          enabled={true}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text">
            Zabari TTS
          </h1>
          <p className="text-gray-400 text-lg">Multi-Platform Chat Logger with Text-to-Speech</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Chat Platforms */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Chat Platforms</h2>

              {/* Twitch */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-twitch rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Twitch</h3>
                      <p className="text-sm text-gray-400">Live chat streaming</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('twitch')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.twitch.enabled ? 'bg-twitch' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        platforms.twitch.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.twitch.enabled && (
                  <input
                    type="text"
                    value={platforms.twitch.url}
                    onChange={(e) => updatePlatformUrl('twitch', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-twitch text-sm"
                    placeholder="Twitch chat URL"
                  />
                )}
              </div>

              {/* YouTube */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-youtube rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">YouTube</h3>
                      <p className="text-sm text-gray-400">Live stream chat</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('youtube')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.youtube.enabled ? 'bg-youtube' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        platforms.youtube.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.youtube.enabled && (
                  <input
                    type="text"
                    value={platforms.youtube.url}
                    onChange={(e) => updatePlatformUrl('youtube', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-youtube text-sm"
                    placeholder="YouTube live chat URL"
                  />
                )}
              </div>

              {/* Kick */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-kick rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.81l7 3.5v7.38l-7-3.5V9.81zm9 10.88v-7.38l7-3.5v7.38l-7 3.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Kick</h3>
                      <p className="text-sm text-gray-400">Streaming platform chat</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('kick')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.kick.enabled ? 'bg-kick' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-gray-900 transition-transform ${
                        platforms.kick.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.kick.enabled && (
                  <input
                    type="text"
                    value={platforms.kick.url}
                    onChange={(e) => updatePlatformUrl('kick', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-kick text-sm"
                    placeholder="Kick chat URL"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - TTS Settings */}
          <div className="space-y-6">
            {/* Connection Method Selection */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Chat Connection Method</h2>

              <div className="space-y-4">
                {/* Playwright Mode */}
                <button
                  onClick={() => setConnectionMode('playwright')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    connectionMode === 'playwright'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Playwright (Browser Automation)</h3>
                      <p className="text-sm text-gray-400">Local only - requires installed browsers</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      connectionMode === 'playwright' ? 'border-green-500 bg-green-500' : 'border-gray-600'
                    }`}>
                      {connectionMode === 'playwright' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>

                {/* API Mode */}
                <button
                  onClick={() => setConnectionMode('api')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    connectionMode === 'api'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Direct API Connection</h3>
                      <p className="text-sm text-gray-400">Vercel-compatible - works everywhere</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      connectionMode === 'api' ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                    }`}>
                      {connectionMode === 'api' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* API Mode Config */}
              {connectionMode === 'api' && (
                <div className="mt-6 space-y-4 p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-blue-400 mb-4">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <strong>API Mode TTS:</strong> Uses browser Web Speech API for text-to-speech. NeuTTS is not supported in API mode.
                    </div>
                  </div>

                  {platforms.youtube?.enabled && (
                    <div>
                      <label className="block text-sm font-medium mb-2">YouTube API Key (Optional)</label>
                      <input
                        type="password"
                        value={youtubeApiKey}
                        onChange={(e) => setYoutubeApiKey(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="Get from Google Cloud Console"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Required for YouTube in API mode. Get your key at{' '}
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          console.cloud.google.com
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TTS Engine Selection */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">TTS Engine</h2>

              <div className="space-y-4">
                {/* Web Speech API */}
                <button
                  onClick={() => setTtsEngine('webspeech')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    ttsEngine === 'webspeech'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Web Speech API</h3>
                      <p className="text-sm text-gray-400">Browser-based TTS (No server required)</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      ttsEngine === 'webspeech' ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                    }`}>
                      {ttsEngine === 'webspeech' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>

                {/* NeuTTS Air */}
                <button
                  onClick={() => setTtsEngine('neutts')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    ttsEngine === 'neutts'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">NeuTTS Air</h3>
                      <p className="text-sm text-gray-400">High-quality AI voice cloning (Requires server)</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      ttsEngine === 'neutts' ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                    }`}>
                      {ttsEngine === 'neutts' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* NeuTTS Config */}
              {ttsEngine === 'neutts' && (
                <div className="mt-6 space-y-4 p-4 bg-gray-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">Voice</label>
                    <input
                      type="text"
                      value={neuttsConfig.voice}
                      onChange={(e) => setNeuttsConfig(prev => ({ ...prev, voice: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="e.g., dave, jo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Server URL</label>
                    <input
                      type="text"
                      value={neuttsConfig.serverUrl}
                      onChange={(e) => setNeuttsConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="http://localhost:8765"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TTS Settings */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">TTS Settings</h2>

              <div className="space-y-6">
                {/* Volume */}
                {ttsEngine === 'webspeech' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Volume: {ttsConfig.volume.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={ttsConfig.volume}
                        onChange={(e) => setTtsConfig(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Rate: {ttsConfig.rate.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={ttsConfig.rate}
                        onChange={(e) => setTtsConfig(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Pitch: {ttsConfig.pitch.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={ttsConfig.pitch}
                        onChange={(e) => setTtsConfig(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </>
                )}

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.announceUsername}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, announceUsername: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span>Announce username before message</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.excludeCommands}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, excludeCommands: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span>Exclude bot commands (!)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.excludeLinks}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, excludeLinks: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span>Exclude messages with links</span>
                  </label>
                </div>

                {/* Excluded Users */}
                <div>
                  <label className="block text-sm font-medium mb-2">Excluded Users</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      id="excludeUserInput"
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                      placeholder="Username to exclude"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addExcludedUser(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('excludeUserInput')
                        addExcludedUser(input.value)
                        input.value = ''
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ttsConfig.excludeUsers.map(user => (
                      <span
                        key={user}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full text-sm"
                      >
                        {user}
                        <button
                          onClick={() => removeExcludedUser(user)}
                          className="hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Control Button */}
            <button
              onClick={toggleChatLogger}
              disabled={status === 'error'}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              } ${status === 'error' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRunning ? 'Stop Chat Logger' : 'Start Chat Logger'}
            </button>

            {/* Status */}
            <div className={`text-center py-3 rounded-lg ${
              status === 'running' ? 'bg-green-500/20 text-green-400' :
              status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        </div>

        {/* Live Chat Display */}
        {isRunning && (
          <div className="mt-8">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Live Chat</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">{messages.length} messages</span>
                </div>
              </div>

              <div className="bg-gray-950 rounded-lg p-4 h-[500px] overflow-y-auto" id="chat-container">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                      <p>Waiting for messages...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors animate-fadeIn"
                      >
                        {/* Platform Badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          msg.platform === 'twitch' ? 'bg-twitch' :
                          msg.platform === 'youtube' ? 'bg-youtube' :
                          'bg-kick'
                        }`}>
                          {msg.platform === 'twitch' && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                            </svg>
                          )}
                          {msg.platform === 'youtube' && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          )}
                          {msg.platform === 'kick' && (
                            <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.81l7 3.5v7.38l-7-3.5V9.81zm9 10.88v-7.38l7-3.5v7.38l-7 3.5z"/>
                            </svg>
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className={`font-semibold ${
                              msg.platform === 'twitch' ? 'text-twitch' :
                              msg.platform === 'youtube' ? 'text-youtube' :
                              'text-kick'
                            }`}>
                              {msg.username}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-200 break-words">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </main>
  )
}
