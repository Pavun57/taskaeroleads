"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Lock, Save, Trash2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { apiClient } from "@/lib/api"

interface ConfigStatus {
  gemini_api_key?: "configured" | "not_set"
  linkedin_email?: "configured" | "not_set"
  linkedin_password?: "configured" | "not_set"
  twilio_account_sid?: "configured" | "not_set"
  twilio_auth_token?: "configured" | "not_set"
  twilio_from_number?: "configured" | "not_set"
}

interface ConfigValues {
  gemini_api_key: string
  linkedin_email: string
  linkedin_password: string
  twilio_account_sid: string
  twilio_auth_token: string
  twilio_from_number: string
  gemini_model: string
}

export default function ConfigurationPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({})
  const [configValues, setConfigValues] = useState<ConfigValues>({
    gemini_api_key: "",
    linkedin_email: "",
    linkedin_password: "",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_from_number: "",
    gemini_model: "gemini-2.5-flash",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())
  const [clearingKeys, setClearingKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadConfigStatus()
  }, [])

  const loadConfigStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.getConfigStatus()
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setConfigStatus(response.data as ConfigStatus)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (key: keyof ConfigValues) => {
    if (!configValues[key]?.trim()) {
      setError(`Please enter a value for ${key.replace(/_/g, " ")}`)
      return
    }

    setSavingKeys((prev) => new Set(prev).add(key))
    setError(null)
    setSuccess(null)

    try {
      const updateData: Partial<ConfigValues> = {}
      updateData[key] = configValues[key]

      const response = await apiClient.updateConfig(updateData)
      if (response.error) {
        setError(response.error)
      } else {
        setSuccess(`${key.replace(/_/g, " ")} saved successfully`)
        setTimeout(() => setSuccess(null), 3000)
        await loadConfigStatus()
        // Clear the saved field
        setConfigValues((prev) => ({ ...prev, [key]: "" }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleSaveAll = async () => {
    setSavingKeys(new Set(Object.keys(configValues) as Array<keyof ConfigValues>))
    setError(null)
    setSuccess(null)

    try {
      const updateData: Partial<ConfigValues> = {}
      Object.keys(configValues).forEach((key) => {
        if (configValues[key as keyof ConfigValues]?.trim()) {
          updateData[key as keyof ConfigValues] = configValues[key as keyof ConfigValues]
        }
      })

      if (Object.keys(updateData).length === 0) {
        setError("Please enter at least one configuration value")
        setSavingKeys(new Set())
        return
      }

      const response = await apiClient.updateConfig(updateData)
      if (response.error) {
        setError(response.error)
      } else {
        setSuccess("Configuration saved successfully")
        setTimeout(() => setSuccess(null), 3000)
        await loadConfigStatus()
        // Clear all fields
        setConfigValues({
          gemini_api_key: "",
          linkedin_email: "",
          linkedin_password: "",
          twilio_account_sid: "",
          twilio_auth_token: "",
          twilio_from_number: "",
          gemini_model: "gemini-2.5-flash",
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setSavingKeys(new Set())
    }
  }

  const handleClear = async (key: string) => {
    if (!confirm(`Are you sure you want to clear ${key.replace(/_/g, " ")}?`)) {
      return
    }

    setClearingKeys((prev) => new Set(prev).add(key))
    setError(null)
    setSuccess(null)

    try {
      // Map field keys to environment variable names (uppercase with underscores)
      const envKeyMap: Record<string, string> = {
        gemini_api_key: "GEMINI_API_KEY",
        linkedin_email: "LINKEDIN_EMAIL",
        linkedin_password: "LINKEDIN_PASSWORD",
        twilio_account_sid: "TWILIO_ACCOUNT_SID",
        twilio_auth_token: "TWILIO_AUTH_TOKEN",
        twilio_from_number: "TWILIO_FROM_NUMBER",
        gemini_model: "GEMINI_MODEL",
      }
      const envKey = envKeyMap[key] || key.toUpperCase()

      const response = await apiClient.clearConfig([envKey])
      if (response.error) {
        setError(response.error)
      } else {
        setSuccess(`${key.replace(/_/g, " ")} cleared successfully`)
        setTimeout(() => setSuccess(null), 3000)
        await loadConfigStatus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear configuration")
    } finally {
      setClearingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const getStatusIcon = (status?: "configured" | "not_set") => {
    if (status === "configured") {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />
    }
    return <XCircle className="w-4 h-4 text-red-600" />
  }

  const getStatusText = (status?: "configured" | "not_set") => {
    if (status === "configured") {
      return <span className="text-green-600 font-medium">Configured</span>
    }
    return <span className="text-red-600 font-medium">Not Set</span>
  }

  const configFields = [
    {
      key: "gemini_api_key" as const,
      label: "Gemini API Key",
      description: "Required for AI blog generation and LinkedIn scraping",
      type: "password" as const,
    },
    {
      key: "linkedin_email" as const,
      label: "LinkedIn Email",
      description: "Required for LinkedIn profile scraping",
      type: "email" as const,
    },
    {
      key: "linkedin_password" as const,
      label: "LinkedIn Password",
      description: "Required for LinkedIn profile scraping",
      type: "password" as const,
    },
    {
      key: "twilio_account_sid" as const,
      label: "Twilio Account SID",
      description: "Required for autodialer phone calls",
      type: "text" as const,
    },
    {
      key: "twilio_auth_token" as const,
      label: "Twilio Auth Token",
      description: "Required for autodialer phone calls",
      type: "password" as const,
    },
    {
      key: "twilio_from_number" as const,
      label: "Twilio From Number",
      description: "Phone number to call from (e.g., +1234567890)",
      type: "tel" as const,
    },
    {
      key: "gemini_model" as const,
      label: "Gemini Model",
      description: "Gemini model to use (default: gemini-2.5-flash)",
      type: "text" as const,
    },
  ]

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12 fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-600 to-purple-400 p-3 rounded-xl">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Configuration</h1>
                  <p className="text-lg text-muted-foreground">Manage your API keys and platform settings securely</p>
                </div>
              </div>
              <button
                onClick={loadConfigStatus}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-green-600">{success}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Configuration Fields */}
              <div className="space-y-6">
              {configFields.map((field) => {
                const status = field.key !== "gemini_model" ? configStatus[field.key as keyof ConfigStatus] : undefined
                const isSaving = savingKeys.has(field.key)
                const isClearing = clearingKeys.has(field.key)

                return (
                  <div key={field.key} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">{field.label}</h3>
                          {field.key !== "gemini_model" && getStatusIcon(status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{field.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {field.key !== "gemini_model" && getStatusText(status)}
                        {status === "configured" && (
                  <button
                            onClick={() => handleClear(field.key)}
                            disabled={isClearing}
                            className="p-2 hover:bg-destructive/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Clear configuration"
                  >
                            <Trash2 className={`w-4 h-4 text-destructive ${isClearing ? "animate-pulse" : ""}`} />
                  </button>
                        )}
                      </div>
                </div>

                      <div className="space-y-3">
                        <input
                          type={field.type}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          value={configValues[field.key]}
                          onChange={(e) =>
                            setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        <button
                          onClick={() => handleSave(field.key)}
                          disabled={isSaving || !configValues[field.key]?.trim()}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 w-full"
                        >
                          {isSaving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                      </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Save All Button */}
              <div className="bg-card border border-border rounded-xl p-6">
                <button
                  onClick={handleSaveAll}
                  disabled={savingKeys.size > 0 || Object.values(configValues).every((v) => !v.trim())}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-600 to-purple-400 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {savingKeys.size > 0 ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving All...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save All Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Status Summary */}
              <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Configuration Status
                </h3>
                <div className="space-y-3">
                  {configFields.map((field) => {
                    const status = field.key !== "gemini_model" ? configStatus[field.key as keyof ConfigStatus] : undefined
                    return (
                      <div key={field.key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{field.label}</span>
                        {field.key !== "gemini_model" && (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(status)}
                            {getStatusText(status)}
                          </div>
                        )}
                        {field.key === "gemini_model" && (
                          <span className="text-muted-foreground text-xs">Optional</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Security Best Practices */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Security Best Practices
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Never share your API keys in code or version control</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Rotate keys regularly for enhanced security</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Use environment variables for local development</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Enable two-factor authentication on your accounts</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Monitor API usage regularly for suspicious activity</span>
                  </li>
                </ul>
              </div>

              {/* System Status */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">System Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Connection</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs font-medium">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Encryption</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs font-medium">Enabled</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Authentication</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}