import * as React from "react"
import { useLocation } from "wouter"

export default function NotFound() {
  const [, setLocation] = useLocation()

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-8xl font-black text-primary font-mono drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">404</h1>
        <h2 className="text-2xl font-bold tracking-tight">TERMINAL NOT FOUND</h2>
        <p className="text-muted-foreground font-mono max-w-[400px]">
          The requested system node does not exist or access is restricted.
        </p>
        <button 
          onClick={() => setLocation('/')}
          className="mt-8 px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-mono font-medium"
        >
          RETURN TO DASHBOARD
        </button>
      </div>
    </div>
  )
}
