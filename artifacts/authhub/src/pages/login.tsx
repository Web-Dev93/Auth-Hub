import * as React from "react"
import { useLocation } from "wouter"
import { useGetMe } from "@workspace/api-client-react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FaGoogle } from "react-icons/fa6"

export default function Login() {
  const { data: me, isLoading } = useGetMe()
  const [, setLocation] = useLocation()

  React.useEffect(() => {
    if (!isLoading && me) {
      setLocation("/")
    }
  }, [me, isLoading, setLocation])

  const handleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="flex flex-col items-center space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">AuthHub Operations</h1>
              <p className="text-muted-foreground font-mono text-sm">SECURE TERMINAL ACCESS</p>
            </div>
          </div>

          <div className="w-full bg-card border border-border p-6 rounded-xl shadow-lg relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-xl" />
            
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Authentication requires verified administrative credentials. 
                </p>
              </div>

              <Button 
                onClick={handleLogin}
                className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02]"
              >
                <FaGoogle className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            UNAUTHORIZED ACCESS IS PROHIBITED
          </p>
        </div>
      </div>
    </div>
  )
}
