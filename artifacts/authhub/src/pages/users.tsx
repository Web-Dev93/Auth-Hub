import * as React from "react"
import { Link } from "wouter"
import { AppLayout } from "@/components/layout"
import { useListUsers, useGetStats } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Shield, ShieldAlert, AlertCircle, Ghost } from "lucide-react"
import { ProviderIcon } from "@/components/provider-icon"
import { formatDistanceToNow } from "date-fns"

export default function Users() {
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: userData, isLoading } = useListUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined
  })

  const { data: stats } = useGetStats()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Identity Registry</h1>
            <p className="text-muted-foreground font-mono text-sm">TOTAL RECORDS: {stats?.totalUsers.toLocaleString() || "..."}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by email or name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 font-mono"
            />
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] font-mono text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL ROLES</SelectItem>
                <SelectItem value="admin">ADMIN</SelectItem>
                <SelectItem value="moderator">MODERATOR</SelectItem>
                <SelectItem value="premium">PREMIUM</SelectItem>
                <SelectItem value="user">USER</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] font-mono text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL STATUSES</SelectItem>
                <SelectItem value="active">ACTIVE</SelectItem>
                <SelectItem value="blocked">BLOCKED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-mono text-xs">USER</TableHead>
                <TableHead className="font-mono text-xs">ROLE</TableHead>
                <TableHead className="font-mono text-xs">STATUS</TableHead>
                <TableHead className="font-mono text-xs">VERIFICATION</TableHead>
                <TableHead className="font-mono text-xs">PROVIDERS</TableHead>
                <TableHead className="font-mono text-xs">LOCATION</TableHead>
                <TableHead className="font-mono text-xs text-right">LAST LOGIN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-muted animate-pulse" /><div className="space-y-2"><div className="h-4 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-24 bg-muted animate-pulse rounded" /></div></div></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : userData?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
                      <Ghost className="h-12 w-12 opacity-20" />
                      <p className="font-mono text-sm">NO RECORDS FOUND MATCHING CRITERIA</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                userData?.users.map((user) => (
                  <TableRow key={user.id} className="group transition-colors">
                    <TableCell>
                      <Link href={`/users/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="font-mono">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'premium' ? 'secondary' : 'outline'} className="font-mono text-[10px]">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'blocked' ? 'destructive' : 'outline'} className={`font-mono text-[10px] ${user.status === 'active' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <VerificationDots level={user.verificationLevel} />
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {user.connectedProviders?.map((p) => (
                          <div key={p} className="h-6 w-6 rounded-full bg-background border flex items-center justify-center" title={p}>
                            <ProviderIcon provider={p} className="h-3 w-3" />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.geoCity && user.geoCountry ? `${user.geoCity}, ${user.geoCountry}` : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination basic (assume more complex in real app) */}
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <span className="text-xs font-mono text-muted-foreground">
              PAGE {userData?.page || 1}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="font-mono text-xs"
              >
                PREV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!userData || userData.users.length < userData.limit}
                onClick={() => setPage(p => p + 1)}
                className="font-mono text-xs"
              >
                NEXT
              </Button>
            </div>
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
          className={`h-2 w-2 rounded-full ${i <= level ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]' : 'bg-muted border border-border'}`} 
        />
      ))}
    </div>
  )
}
