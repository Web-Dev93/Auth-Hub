import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useListApps } from "@workspace/api-client-react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Globe, Users, Clock, Box } from "lucide-react"
import { ProviderIcon } from "@/components/provider-icon"
import { formatDistanceToNow } from "date-fns"

export default function Apps() {
  const { data: apps, isLoading } = useListApps()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground font-mono text-sm">REGISTERED IDENTITY CLIENTS</p>
          </div>
          <Link href="/apps/new">
            <Button className="font-mono text-xs">
              <Plus className="mr-2 h-4 w-4" /> NEW CLIENT
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-20 bg-muted/50 rounded-t-xl border-b" />
                <CardContent className="p-6 space-y-4">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          ) : apps?.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-card/50">
              <Box className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No Applications Registered</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first application to get your API keys.</p>
              <Link href="/apps/new">
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Register Application</Button>
              </Link>
            </div>
          ) : (
            apps?.map(app => (
              <Card key={app.id} className="group hover:border-primary/50 transition-colors flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b bg-muted/20">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {app.logoUrl ? (
                        <img src={app.logoUrl} alt={app.name} className="h-6 w-6 rounded" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground flex items-center">
                      <Globe className="mr-1.5 h-3 w-3" /> {app.url}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono mb-2">ENABLED PROVIDERS</p>
                    <div className="flex flex-wrap gap-2">
                      {app.enabledProviders?.length > 0 ? app.enabledProviders.map(p => (
                        <Badge key={p} variant="secondary" className="font-mono text-[10px] pl-1.5 pr-2 py-0.5 border-border">
                          <ProviderIcon provider={p} className="h-3 w-3 mr-1.5" />
                          {p.toUpperCase()}
                        </Badge>
                      )) : (
                        <span className="text-xs text-muted-foreground italic">None configured</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono flex items-center mb-1">
                        <Users className="mr-1.5 h-3 w-3" /> USERS
                      </p>
                      <p className="font-medium font-mono">{app.userCount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-mono flex items-center mb-1">
                        <Clock className="mr-1.5 h-3 w-3" /> CREATED
                      </p>
                      <p className="text-sm">{formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 border-t bg-muted/10">
                  <Link href={`/apps/${app.id}`} className="w-full">
                    <Button variant="outline" className="w-full font-mono text-xs group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                      MANAGE CONFIGURATION
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
