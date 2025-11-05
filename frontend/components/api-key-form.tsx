"use client"

import type React from "react"

import { useState } from "react"

interface ApiKeyFormProps {
  onSubmit: (data: { name: string; service: string; value: string; lastUsed?: string }) => void
  onCancel: () => void
}

const services = ["OpenAI", "LinkedIn", "Stripe", "Twilio", "SendGrid", "Other"]

export function ApiKeyForm({ onSubmit, onCancel }: ApiKeyFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    service: "OpenAI",
    value: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.value) {
      onSubmit(formData)
      setFormData({ name: "", service: "OpenAI", value: "" })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Key Name</label>
          <input
            type="text"
            placeholder="e.g., Production OpenAI"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Service</label>
          <select
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          >
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          placeholder="Paste your API key here"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Your key is encrypted and never displayed in full</p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
        >
          Add API Key
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
