import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useGetUser, useUpdateUser, useDeleteUser, getListUsersQueryKey, getGetUserQueryKey } from "@workspace/api-client-react"
import { useLocation, useParams } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProviderIcon } from "@/components/provider-icon"
import { Shield, MapPin, Laptop, Clock, Activity, AlertTriangle, ShieldCheck, Trash2, ArrowLeft } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function UserDetail() {
  const params = useParams()
  const id = params.id as string
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()

  const { data: user, isLoading, error } = useGetUser(id, { query: { enabled: !!id, queryKey: getGetUserQueryKey(id) } })
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [isDeleting, setIsDeleting] = React.useState(false)

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 space-y-6"><Card><CardContent className="h-80" /></Card></div>
            <div className="col-span-2 space-y-6"><Card><CardContent className="h-96" /></Card></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !user) {
    return (
      <AppLayout>
        <div className="py-12 text-center text-destructive">Failed to load user.</div>
      </AppLayout>
    )
  }

  const handleRoleChange = (newRole: string) => {
    updateUser.mutate({ id, data: { role: newRole } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
      }
    })
  }

  const handleStatusToggle = () => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active'
    updateUser.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
      }
    })
  }

  const handleDelete = () => {
    deleteUser.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })
        setLocation('/users')
      }
    })
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground mb-4">
          <button onClick={() => setLocation('/users')} className="hover:text-foreground flex items-center transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" /> BACK TO USERS
          </button>
          <span>/</span>
          <span className="text-foreground">{user.id}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Profile Card */}
          <div className="col-span-1 space-y-6">
            <Card className="overflow-hidden border-t-4 border-t-primary">
              <div className="bg-muted/30 p-6 flex flex-col items-center text-center border-b">
                <Avatar className="h-24 w-24 mb-4 border-2 border-background shadow-xl ring-2 ring-primary/20">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl font-mono">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'premium' ? 'secondary' : 'outline'} className="font-mono text-xs uppercase">
                    {user.role}
                  </Badge>
                  <Badge variant={user.status === 'blocked' ? 'destructive' : 'outline'} className={`font-mono text-xs uppercase ${user.status === 'active' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {user.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="p-4 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-mono">VERIFICATION</span>
                    <div className="flex items-center gap-2">
                      <VerificationDots level={user.verificationLevel} />
                      <span className="font-mono font-medium">LVL {user.verificationLevel}</span>
                    </div>
                  </div>
                  <div className="p-4 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-mono">CREATED</span>
                    <span className="font-mono">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground font-mono">ADMIN ACTIONS</p>
                    <div className="space-y-2">
                      <Select value={user.role} onValueChange={handleRoleChange} disabled={updateUser.isPending}>
                        <SelectTrigger className="w-full font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">ROLE: ADMIN</SelectItem>
                          <SelectItem value="moderator">ROLE: MODERATOR</SelectItem>
                          <SelectItem value="premium">ROLE: PREMIUM</SelectItem>
                          <SelectItem value="user">ROLE: USER</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant={user.status === 'active' ? 'destructive' : 'default'} 
                        className="w-full font-mono text-xs uppercase"
                        onClick={handleStatusToggle}
                        disabled={updateUser.isPending}
                      >
                        {user.status === 'active' ? <><AlertTriangle className="mr-2 h-4 w-4" /> Block Access</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Restore Access</>}
                      </Button>

                      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full font-mono text-xs text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground mt-4">
                            <Trash2 className="mr-2 h-4 w-4" /> PERMANENTLY DELETE
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" /> Confirm Deletion
                            </DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will permanently delete the user account and all associated authentication data.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending}>
                              Delete User
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Telemetry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{user.geoCity || 'Unknown'}, {user.geoCountry || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.ipAddress || 'No IP logged'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Laptop className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{user.os || 'Unknown OS'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.browser || 'Unknown Browser'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Last Login</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Linked Accounts & Activity */}
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Providers</CardTitle>
                <CardDescription>Authentication methods connected to this identity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.accounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
                      <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center shadow-sm">
                        <ProviderIcon provider={acc.provider} className="h-5 w-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-sm capitalize">{acc.provider}</p>
                        <p className="text-xs text-muted-foreground truncate">{acc.providerEmail || acc.providerName || 'ID: ' + acc.id.substring(0,8)}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">ACTIVE</Badge>
                    </div>
                  ))}
                  {user.accounts.length === 0 && (
                    <div className="col-span-full py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                      No external providers linked.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest events for this user</CardDescription>
                </div>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                  {user.recentActivity.map((log, index) => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted/80 text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 font-mono text-[10px] uppercase">
                        {log.provider ? <ProviderIcon provider={log.provider} className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">{log.eventType.replace('_', ' ')}</Badge>
                          <span className="text-xs font-mono text-muted-foreground">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                        </div>
                        {log.appName && <p className="text-sm font-medium mt-2">{log.appName}</p>}
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          IP: {log.ipAddress || 'Unknown'} &bull; {log.geoCity || 'Unknown Loc'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {user.recentActivity.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">No activity recorded for this user.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function VerificationDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1" title={`Level ${level} Verification`}>
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className={`h-2.5 w-2.5 rounded-full transition-all ${i <= level ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]' : 'bg-muted border border-border'}`} 
        />
      ))}
    </div>
  )
}
