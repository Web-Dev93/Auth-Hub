import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useListActivity } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, History, ArrowRight } from "lucide-react"
import { ProviderIcon } from "@/components/provider-icon"
import { Link } from "wouter"

export default function Activity() {
  const { data: activities, isLoading } = useListActivity({ limit: 100 })
  const [search, setSearch] = React.useState("")

  const filtered = activities?.filter(a => 
    a.userEmail?.toLowerCase().includes(search.toLowerCase()) || 
    a.eventType.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground font-mono text-sm">SYSTEM-WIDE EVENT TELEMETRY</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter events or users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono bg-card"
          />
        </div>

        <Card className="overflow-hidden border-border/50">
          <div className="divide-y divide-border/50">
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="p-4 flex gap-4 animate-pulse">
                  <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
                  <div className="space-y-2 flex-1"><div className="h-4 w-1/4 bg-muted rounded" /><div className="h-3 w-1/2 bg-muted rounded" /></div>
                </div>
              ))
            ) : filtered?.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <History className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">NO EVENTS FOUND</p>
              </div>
            ) : (
              filtered?.map(activity => (
                <div key={activity.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-muted/30 transition-colors">
                  <div className="shrink-0 pt-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      {activity.provider ? (
                        <ProviderIcon provider={activity.provider} className="h-5 w-5 text-primary" />
                      ) : (
                        <History className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                        {activity.eventType.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-medium">
                        {activity.userEmail || activity.userName || 'System'}
                      </span>
                      {activity.appName && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {activity.appName}
                          </Badge>
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span>{new Date(activity.createdAt).toLocaleString()}</span>
                      {activity.ipAddress && <span>IP: {activity.ipAddress}</span>}
                      {activity.geoCountry && <span>LOC: {activity.geoCity}, {activity.geoCountry}</span>}
                    </div>
                  </div>
                  
                  {activity.userId && (
                    <div className="shrink-0 flex items-center">
                      <Link href={`/users/${activity.userId}`}>
                        <Button variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary">
                          VIEW USER
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
