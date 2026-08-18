import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useGetMe, useGetUser, getGetUserQueryKey, useListActivity, getListActivityQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProviderIcon } from "@/components/provider-icon"
import { Shield, MapPin, Laptop, Clock, Globe, Monitor, Smartphone } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

function VerificationDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i <= level ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground font-mono">
        LEVEL {level}/3
      </span>
    </div>
  )
}

export default function Profile() {
  const { data: me, isLoading: meLoading } = useGetMe()

  const { data: profile, isLoading: profileLoading } = useGetUser(me?.id ?? "", {
    query: {
      enabled: !!me?.id,
      queryKey: getGetUserQueryKey(me?.id ?? ""),
    },
  })

  const { data: activity } = useListActivity(
    { userId: me?.id, limit: 10 },
    {
      query: {
        enabled: !!me?.id,
        queryKey: getListActivityQueryKey({ userId: me?.id, limit: 10 }),
      },
    }
  )

  if (meLoading || profileLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse max-w-3xl">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardContent className="h-64 pt-6" /></Card>
            <div className="md:col-span-2 space-y-4">
              <Card><CardContent className="h-40 pt-6" /></Card>
              <Card><CardContent className="h-40 pt-6" /></Card>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!me || !profile) return null

  const initials = me.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mój profil</h1>
          <p className="text-muted-foreground font-mono text-xs mt-1">
            DANE ZEBRANE O TOBIE PRZEZ AUTHHUB
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={me.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <p className="font-semibold text-lg leading-tight">{me.name}</p>
                <p className="text-sm text-muted-foreground">{me.email}</p>
              </div>

              <Badge
                variant={me.role === "admin" ? "default" : "secondary"}
                className="font-mono text-xs"
              >
                {me.role.toUpperCase()}
              </Badge>

              <div className="w-full pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Weryfikacja</p>
                <VerificationDots level={me.verificationLevel ?? 1} />
              </div>

              <div className="w-full pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-3">Połączone konta</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(me.connectedProviders ?? []).map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-xs"
                    >
                      <ProviderIcon provider={p} className="h-3.5 w-3.5" />
                      <span className="capitalize">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-4">
            {/* Collected data */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  DANE SIECIOWE
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DataRow
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label="Lokalizacja"
                    value={
                      profile.geoCity && profile.geoCountry
                        ? `${profile.geoCity}, ${profile.geoCountry}`
                        : profile.geoCountry ?? "Nieznana"
                    }
                  />
                  <DataRow
                    icon={<Monitor className="h-3.5 w-3.5" />}
                    label="Adres IP"
                    value={profile.ipAddress ?? "Nieznany"}
                    mono
                  />
                  <DataRow
                    icon={<Laptop className="h-3.5 w-3.5" />}
                    label="Przeglądarka"
                    value={profile.browser ?? "Nieznana"}
                  />
                  <DataRow
                    icon={<Smartphone className="h-3.5 w-3.5" />}
                    label="System"
                    value={profile.os ?? "Nieznany"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  AKTYWNOŚĆ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DataRow
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Ostatnie logowanie"
                    value={
                      profile.lastLoginAt
                        ? formatDistanceToNow(new Date(profile.lastLoginAt), { addSuffix: true })
                        : "Nigdy"
                    }
                  />
                  <DataRow
                    icon={<Shield className="h-3.5 w-3.5" />}
                    label="Konto utworzone"
                    value={format(new Date(profile.createdAt), "d MMM yyyy")}
                  />
                </div>

                {activity && activity.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground font-mono mb-2">OSTATNIE ZDARZENIA</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {activity.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] py-0">
                              {log.eventType}
                            </Badge>
                            {log.provider && (
                              <ProviderIcon provider={log.provider} className="h-3 w-3" />
                            )}
                            {log.geoCity && (
                              <span className="text-muted-foreground">{log.geoCity}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function DataRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-mono uppercase">{label}</span>
      </div>
      <p className={`text-sm font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  )
}
