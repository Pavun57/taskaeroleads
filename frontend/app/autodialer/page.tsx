"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Phone, Plus, Activity, Clock, CheckCircle, XCircle, AlertCircle, Upload, Trash2, X } from "lucide-react"
import { apiClient } from "@/lib/api"

interface CallLog {
  id?: string
  phone_number: string
  status: string
  duration?: string
  timestamp: string
  notes?: string
  call_id?: string
  error_message?: string
  message?: string
}

export default function AutodialerPage() {
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState({
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_from_number: "",
    gemini_api_key: "",
  })
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([])
  const [isCalling, setIsCalling] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showAICommand, setShowAICommand] = useState(false)
  const [aiCommandPrompt, setAiCommandPrompt] = useState("")
  const [isExecutingAICommand, setIsExecutingAICommand] = useState(false)
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null)
  const [uploadedNumbers, setUploadedNumbers] = useState<string[]>([])
  const [showPhoneNumbers, setShowPhoneNumbers] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    setIsClient(true)
    loadCallLogs()
    loadPhoneNumbers()
    // Check if Gemini API key is configured
    apiClient.getConfigStatus().then((response) => {
      if (response.data) {
        const status = response.data
        if (status.gemini_api_key === "configured") {
          setShowGeminiKey(false)
        } else {
          setShowGeminiKey(true)
        }
      }
    })
  }, [])

  const loadPhoneNumbers = async () => {
    try {
      const response = await apiClient.getPhoneNumbers()
      if (response.data) {
        setUploadedNumbers(response.data.phone_numbers || [])
      }
    } catch (err) {
      console.error("Failed to load phone numbers:", err)
    }
  }

  const loadCallLogs = async () => {
    try {
      const response = await apiClient.getCallLogs()
      if (response.data) {
        const logs = response.data.map((log, index) => ({
          id: log.call_id || index.toString(),
          phone_number: log.phone_number,
          status: log.status,
          duration: log.duration,
          timestamp: log.timestamp,
          notes: log.notes,
          call_id: log.call_id,
          error_message: log.error_message,
          message: log.message,
        }))
        setCallLogs(logs)
      }
    } catch (err) {
      console.error("Failed to load call logs:", err)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      // Parse CSV or text file with phone numbers
      const numbers = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && /[\d\s\-\+\(\)]/.test(line))
      setPhoneNumbers(numbers)
    }
    reader.readAsText(file)
  }

  const handleUploadNumbers = async () => {
    if (!selectedFile) {
      setError("Please select a file first")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.uploadNumbersFile(selectedFile)

      if (response.error) {
        // Handle error response - it might be a string or an object
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || response.error?.detail || 'Failed to upload numbers'
        setError(errorMsg)
      } else if (response.data) {
        const added = response.data.added || 0
        const invalid = response.data.invalid || 0
        const duplicates = response.data.duplicates || 0
        let message = `Successfully uploaded ${added} phone number${added !== 1 ? 's' : ''}`
        if (invalid > 0) message += `, ${invalid} invalid`
        if (duplicates > 0) message += `, ${duplicates} duplicate${duplicates !== 1 ? 's' : ''}`
        setSuccess(message)
        setTimeout(() => {
          setSuccess(null)
          setSelectedFile(null)
          setPhoneNumbers([])
          setShowNewCampaign(false)
        }, 3000)
        loadPhoneNumbers()
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload numbers"
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCallAll = async () => {
    setIsCalling(true)
    setError(null)

    try {
      const response = await apiClient.callAll({
        ...(apiKeys.twilio_account_sid && { twilio_account_sid: apiKeys.twilio_account_sid }),
        ...(apiKeys.twilio_auth_token && { twilio_auth_token: apiKeys.twilio_auth_token }),
        ...(apiKeys.twilio_from_number && { twilio_from_number: apiKeys.twilio_from_number }),
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setSuccess(`Started calling ${response.data.calls_initiated} numbers`)
        setTimeout(() => {
          setSuccess(null)
          loadCallLogs()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start calls")
    } finally {
      setIsCalling(false)
    }
  }

  const handleAICommand = async (command: string) => {
    setIsExecutingAICommand(true)
    setIsLoading(true)
    setError(null)

    // Check if command is a call command
    const isCallCommand = /call|dial|ring/i.test(command)

    try {
      const response = await apiClient.aiCommand({
        command,
        ...(apiKeys.gemini_api_key && { gemini_api_key: apiKeys.gemini_api_key }),
        ...(apiKeys.twilio_account_sid && { twilio_account_sid: apiKeys.twilio_account_sid }),
        ...(apiKeys.twilio_auth_token && { twilio_auth_token: apiKeys.twilio_auth_token }),
        ...(apiKeys.twilio_from_number && { twilio_from_number: apiKeys.twilio_from_number }),
      })

      if (response.error) {
        setError(response.error)
        setIsExecutingAICommand(false)
      } else if (response.data) {
        setSuccess(response.data.message || "Command executed successfully")
        if (isCallCommand) {
          // If it's a call command, keep showing loading and refresh logs
          setTimeout(() => {
            loadCallLogs()
            setIsExecutingAICommand(false)
            setSuccess(null)
          }, 3000)
        } else {
        setTimeout(() => {
          setSuccess(null)
          loadCallLogs()
        }, 2000)
          setIsExecutingAICommand(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute command")
      setIsExecutingAICommand(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNumber = async (phoneNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${phoneNumber}?`)) return

    setIsLoading(true)
    try {
      const response = await apiClient.deletePhoneNumber(phoneNumber)
      if (response.error) {
        setError(response.error)
      } else {
        setSuccess("Phone number deleted successfully")
        loadPhoneNumbers()
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete number")
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      // Use a more stable format to avoid hydration issues
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return timestamp
      
      // Format as a simple date string to avoid timezone issues
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours < 1) return "Just now"
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? "s" : ""} ago`
    } catch {
      return timestamp
    }
  }

  const completedCalls = callLogs.filter((log) => 
    log.status === "answered"
  ).length
  const failedCalls = callLogs.filter((log) => log.status === "failed").length
  const totalCalls = callLogs.length
  const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12 fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-green-600 to-green-400 p-3 rounded-xl">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Autodialer</h1>
                  <p className="text-muted-foreground">Intelligent calling campaigns & tracking</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewCampaign(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Phone Numbers
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Error/Success Messages */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-600">{success}</p>
                  </div>
                </div>
              )}

              {/* Active Campaign Alert */}
              {(isCalling || isExecutingAICommand) && (
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 flex items-start gap-4">
                  <Activity className="w-5 h-5 text-green-600 flex-shrink-0 mt-1 animate-pulse" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {isExecutingAICommand ? "Processing AI Command..." : "Calls in Progress"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {isExecutingAICommand 
                        ? "Executing your command, please wait..."
                        : `${completedCalls} / ${totalCalls} calls completed`}
                    </p>
                    {!isExecutingAICommand && (
                    <div className="w-full bg-green-500/20 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0}%`,
                        }}
                      />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gemini API Key Section */}
              {showGeminiKey && (
                <div className="bg-card border border-border rounded-xl p-6 fade-in">
                  <h2 className="text-2xl font-semibold mb-4">Gemini API Configuration</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Gemini API key is required for AI commands functionality.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="Your Gemini API key"
                        value={apiKeys.gemini_api_key}
                        onChange={(e) => setApiKeys({ ...apiKeys, gemini_api_key: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (apiKeys.gemini_api_key) {
                            const response = await apiClient.updateConfig({
                              gemini_api_key: apiKeys.gemini_api_key,
                            })
                            if (response.data) {
                              setShowGeminiKey(false)
                              setSuccess("Gemini API key configured successfully")
                              setTimeout(() => setSuccess(null), 3000)
                            }
                          }
                        }}
                        disabled={!apiKeys.gemini_api_key.trim()}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
                      >
                        Save API Key
                      </button>
                      <button
                        onClick={() => setShowGeminiKey(false)}
                        className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all duration-200"
                      >
                        Skip for Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Phone Numbers Form */}
              {showNewCampaign && (
                <div className="bg-card border border-border rounded-xl p-6 fade-in">
                  <h2 className="text-2xl font-semibold mb-6">Upload Phone Numbers</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleUploadNumbers()
                    }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone List File (CSV or TXT)</label>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      {phoneNumbers.length > 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {phoneNumbers.length} phone numbers loaded
                        </p>
                      )}
                    </div>

                    {/* API Keys Section */}
                    <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-4">
                      <h3 className="text-sm font-medium">Twilio Configuration (Optional)</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1">Account SID</label>
                          <input
                            type="text"
                            placeholder="Your Twilio Account SID"
                            value={apiKeys.twilio_account_sid}
                            onChange={(e) => setApiKeys({ ...apiKeys, twilio_account_sid: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Auth Token</label>
                          <input
                            type="password"
                            placeholder="Your Twilio Auth Token"
                            value={apiKeys.twilio_auth_token}
                            onChange={(e) => setApiKeys({ ...apiKeys, twilio_auth_token: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">From Number</label>
                          <input
                            type="text"
                            placeholder="+1234567890"
                            value={apiKeys.twilio_from_number}
                            onChange={(e) => setApiKeys({ ...apiKeys, twilio_from_number: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Gemini API Key (for AI commands)</label>
                          <input
                            type="password"
                            placeholder="Your Gemini API key"
                            value={apiKeys.gemini_api_key}
                            onChange={(e) => setApiKeys({ ...apiKeys, gemini_api_key: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isLoading || phoneNumbers.length === 0}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Numbers
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCampaign(false)
                          setPhoneNumbers([])
                          setSelectedFile(null)
                        }}
                        className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* AI Command Form */}
              {showAICommand && (
                <div className="bg-card border border-border rounded-xl p-6 fade-in">
                  <h2 className="text-2xl font-semibold mb-4">AI Command</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter a natural language command to control the autodialer. For example: "Call all uploaded numbers" or "Call the number 9876543210"
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (aiCommandPrompt.trim()) {
                        handleAICommand(aiCommandPrompt)
                        setShowAICommand(false)
                        setAiCommandPrompt("")
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2">Command</label>
                      <input
                        type="text"
                        placeholder="e.g., Call all uploaded numbers"
                        value={aiCommandPrompt}
                        onChange={(e) => setAiCommandPrompt(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isLoading || !aiCommandPrompt.trim()}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Executing...
                          </>
                        ) : (
                          "Execute Command"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAICommand(false)
                          setAiCommandPrompt("")
                        }}
                        className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Phone Numbers Management */}
              {showPhoneNumbers && (
                <div className="bg-card border border-border rounded-xl p-6 fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold">Uploaded Phone Numbers</h2>
                    <button
                      onClick={() => setShowPhoneNumbers(false)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {uploadedNumbers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No phone numbers uploaded yet</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {uploadedNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                        >
                          <span className="font-mono text-sm">{number}</span>
                          <button
                            onClick={() => handleDeleteNumber(number)}
                            disabled={isLoading}
                            className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!showNewCampaign && !showAICommand && !showPhoneNumbers && (
                <div className="flex gap-3">
                  <button
                    onClick={handleCallAll}
                    disabled={isCalling || isLoading || isExecutingAICommand}
                    className="flex-1 bg-gradient-to-br from-green-600 to-green-400 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCalling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        Call All Numbers
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowAICommand(true)}
                    disabled={isCalling || isLoading || isExecutingAICommand}
                    className="flex-1 bg-secondary text-foreground px-6 py-3 rounded-lg hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    AI Command
                  </button>
                  <button
                    onClick={() => {
                      setShowPhoneNumbers(true)
                      loadPhoneNumbers()
                    }}
                    disabled={isCalling || isLoading || isExecutingAICommand}
                    className="px-4 py-3 bg-secondary text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    View Numbers
                  </button>
                </div>
              )}


              {/* Call Log Detail Modal */}
              {selectedCallLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold">Call Details</h2>
                      <button
                        onClick={() => setSelectedCallLog(null)}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                        <p className="font-mono text-lg font-semibold mt-1">{selectedCallLog.phone_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-medium capitalize">{selectedCallLog.status}</p>
                          {selectedCallLog.status === "answered" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </div>
                      {selectedCallLog.duration && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Duration</label>
                          <p className="mt-1">{selectedCallLog.duration}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                        <p className="mt-1" suppressHydrationWarning>
                          {new Date(selectedCallLog.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {selectedCallLog.call_id && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Call ID</label>
                          <p className="font-mono text-sm mt-1">{selectedCallLog.call_id}</p>
                        </div>
                      )}
                      {selectedCallLog.message && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Message</label>
                          <p className="mt-1">{selectedCallLog.message}</p>
                        </div>
                      )}
                      {selectedCallLog.notes && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Notes</label>
                          <p className="mt-1">{selectedCallLog.notes}</p>
                        </div>
                      )}
                      {(selectedCallLog.error_message || (selectedCallLog.status === "failed" && selectedCallLog.message)) && (
                        <div>
                          <label className="text-sm font-medium text-destructive">Error Message</label>
                          <p className="mt-1 text-destructive">
                            {selectedCallLog.error_message || selectedCallLog.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Call Logs */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Call Logs</h2>
                  <button
                    onClick={loadCallLogs}
                    className="text-sm text-primary hover:underline"
                  >
                    Refresh
                  </button>
                </div>
                <div className="space-y-3">
                  {callLogs.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-xl">
                      <Phone className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">No call logs yet</p>
                      <button
                        onClick={() => setShowNewCampaign(true)}
                        className="text-primary hover:underline font-medium"
                      >
                        Upload numbers and start calling
                      </button>
                    </div>
                  ) : (
                    callLogs.map((call, index) => (
                      <div
                        key={call.id || index}
                        onClick={() => setSelectedCallLog(call)}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-sm font-semibold text-foreground">
                                {call.phone_number}
                              </span>
                              {call.status === "answered" ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            {call.notes && (
                              <p className="text-sm text-muted-foreground mb-1">{call.notes}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {call.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {call.duration}
                                </span>
                              )}
                              <span>{isClient ? formatTimestamp(call.timestamp) : call.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Overall Stats */}
              <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
                <h3 className="font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Calls</p>
                    <p className="text-3xl font-bold text-foreground">{totalCalls.toLocaleString()}</p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
                    <p className="text-3xl font-bold text-foreground">{successRate.toFixed(1)}%</p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{completedCalls}</p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Failed</p>
                    <p className="text-3xl font-bold text-destructive">{failedCalls}</p>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-secondary/30 border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-3">Campaign Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Start with 30-60 calls/hour</li>
                  <li>• Best times: 9 AM - 5 PM</li>
                  <li>• Keep scripts under 30 seconds</li>
                  <li>• Monitor success metrics weekly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
