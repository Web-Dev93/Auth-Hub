import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useGetApp, useUpdateApp, useDeleteApp, useRotateAppKey, getListAppsQueryKey, getGetAppQueryKey, useCreateApp } from "@workspace/api-client-react"
import { useLocation, useParams } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ProviderIcon } from "@/components/provider-icon"
import { ArrowLeft, KeyRound, Copy, RefreshCw, Trash2, Save, Terminal, ShieldCheck, Box } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

const AVAILABLE_PROVIDERS = [
  { id: 'google', name: 'Google' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'apple', name: 'Apple' },
  { id: 'github', name: 'GitHub' },
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'twitter', name: 'Twitter / X' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'email', name: 'Email / Password' },
]

export default function AppDetail() {
  const params = useParams()
  const id = params.id as string
  const isNew = !id || id === 'new'
  
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: existingApp, isLoading: isLoadingApp } = useGetApp(id, { query: { enabled: !isNew, queryKey: getGetAppQueryKey(id) } })
  const createApp = useCreateApp()
  const updateApp = useUpdateApp()
  const deleteApp = useDeleteApp()
  const rotateKey = useRotateAppKey()

  const [formData, setFormData] = React.useState({
    name: "",
    url: "",
    logoUrl: "",
    enabledProviders: [] as string[]
  })
  
  const [newSecret, setNewSecret] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isRotating, setIsRotating] = React.useState(false)
  
  const initializedForId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!isNew && existingApp && initializedForId.current !== id) {
      initializedForId.current = id
      setFormData({
        name: existingApp.name,
        url: existingApp.url,
        logoUrl: existingApp.logoUrl || "",
        enabledProviders: existingApp.enabledProviders || []
      })
    }
  }, [existingApp, id, isNew])

  if (!isNew && isLoadingApp) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6"><Card><CardContent className="h-96" /></Card></div>
            <div className="col-span-1 space-y-6"><Card><CardContent className="h-80" /></Card></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  const handleProviderToggle = (providerId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabledProviders: checked 
        ? [...prev.enabledProviders, providerId]
        : prev.enabledProviders.filter(p => p !== providerId)
    }))
  }

  const handleSave = () => {
    if (!formData.name || !formData.url) {
      toast({ title: "Validation Error", description: "Name and URL are required.", variant: "destructive" })
      return
    }

    if (isNew) {
      createApp.mutate({ data: formData }, {
        onSuccess: (newApp) => {
          queryClient.invalidateQueries({ queryKey: getListAppsQueryKey() })
          toast({ title: "App created", description: "Client credentials generated successfully." })
          // Force navigate to the new app and pass secret via state, but we don't have router state.
          // Better: show secret here in a dialog before navigating.
          setNewSecret(newApp.clientSecret)
        }
      })
    } else {
      updateApp.mutate({ id, data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(id) })
          queryClient.invalidateQueries({ queryKey: getListAppsQueryKey() })
          toast({ title: "App updated", description: "Configuration saved successfully." })
        }
      })
    }
  }

  const handleRotateKey = () => {
    rotateKey.mutate({ id }, {
      onSuccess: (keys) => {
        setNewSecret(keys.clientSecret)
        setIsRotating(false)
        toast({ title: "Key rotated", description: "New client secret generated. Update your environment." })
      }
    })
  }

  const handleDelete = () => {
    deleteApp.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppsQueryKey() })
        setLocation('/apps')
      }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard", description: "Ready to paste." })
  }

  const iframeSnippet = `<iframe src="https://auth.yourdomain.com/widget?app=${existingApp?.clientId || 'YOUR_CLIENT_ID'}" width="400" height="600" frameBorder="0"></iframe>`
  const jsSnippet = `<script src="https://auth.yourdomain.com/widget.js" data-app="${existingApp?.clientId || 'YOUR_CLIENT_ID'}"></script>`

  if (newSecret && isNew) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Card className="border-primary shadow-[0_0_30px_rgba(var(--primary),0.15)]">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <KeyRound className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Application Registered</CardTitle>
              <CardDescription>Store your client secret securely. It will not be shown again.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Client ID</label>
                <div className="flex font-mono text-sm bg-muted/50 p-3 rounded border items-center justify-between">
                  <span className="truncate mr-4 text-foreground">{createApp.data?.clientId}</span>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createApp.data?.clientId || '')} className="h-8 w-8 shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-primary font-bold uppercase flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Client Secret
                </label>
                <div className="flex font-mono text-sm bg-primary/5 p-3 rounded border border-primary/20 items-center justify-between">
                  <span className="truncate mr-4 text-primary">{newSecret}</span>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(newSecret)} className="h-8 w-8 shrink-0 text-primary hover:bg-primary/20">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full font-mono font-bold tracking-widest" onClick={() => setLocation(`/apps/${createApp.data?.id}`)}>
                I HAVE SAVED THE SECRET
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            <button onClick={() => setLocation('/apps')} className="hover:text-foreground flex items-center transition-colors">
              <ArrowLeft className="mr-1 h-4 w-4" /> BACK
            </button>
            <span>/</span>
            <span className="text-foreground">{isNew ? 'NEW CLIENT' : existingApp?.id}</span>
          </div>
          <Button onClick={handleSave} disabled={createApp.isPending || updateApp.isPending} className="font-mono text-xs font-bold tracking-wider">
            <Save className="mr-2 h-4 w-4" /> {isNew ? 'REGISTER CLIENT' : 'SAVE CHANGES'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-primary" /> Application Profile</CardTitle>
                <CardDescription>Core identity and origin configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Application Name</label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Production Dashboard" 
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Origin URL</label>
                    <Input 
                      value={formData.url} 
                      onChange={e => setFormData({...formData, url: e.target.value})} 
                      placeholder="https://app.example.com" 
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Logo URL (Optional)</label>
                    <Input 
                      value={formData.logoUrl} 
                      onChange={e => setFormData({...formData, logoUrl: e.target.value})} 
                      placeholder="https://example.com/logo.png" 
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Authentication Providers</CardTitle>
                <CardDescription>Select which identity providers are active for this application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVAILABLE_PROVIDERS.map(provider => {
                    const isEnabled = formData.enabledProviders.includes(provider.id)
                    return (
                      <div key={provider.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isEnabled ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <ProviderIcon provider={provider.id} />
                          </div>
                          <span className="font-medium text-sm">{provider.name}</span>
                        </div>
                        <Switch 
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleProviderToggle(provider.id, checked)}
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {!isNew && existingApp && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5 text-primary" /> Integration Snippets</CardTitle>
                  <CardDescription>Embed the AuthHub widget into your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-mono text-muted-foreground uppercase">Javascript Embed</label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => copyToClipboard(jsSnippet)}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-muted-foreground border">
                      <code>{jsSnippet}</code>
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-mono text-muted-foreground uppercase">Iframe Fallback</label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => copyToClipboard(iframeSnippet)}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-muted-foreground border">
                      <code>{iframeSnippet}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Config */}
          <div className="space-y-6">
            {!isNew && existingApp && (
              <Card>
                <CardHeader>
                  <CardTitle>Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase">Client ID</label>
                    <div className="flex font-mono text-xs bg-muted/50 p-2 rounded border items-center justify-between">
                      <span className="truncate mr-2">{existingApp.clientId}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(existingApp.clientId)} className="h-6 w-6 shrink-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {newSecret && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-mono text-primary font-bold uppercase flex items-center gap-1">
                        New Secret
                      </label>
                      <div className="flex font-mono text-xs bg-primary/10 p-2 rounded border border-primary/30 items-center justify-between">
                        <span className="truncate mr-2 text-primary">{newSecret}</span>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(newSecret)} className="h-6 w-6 shrink-0 text-primary">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Dialog open={isRotating} onOpenChange={setIsRotating}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full font-mono text-xs mt-2">
                        <RefreshCw className="mr-2 h-3 w-3" /> ROTATE SECRET
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rotate Client Secret</DialogTitle>
                        <DialogDescription>
                          Generating a new secret will immediately invalidate the old one. Your application will be unable to authenticate users until updated with the new secret.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRotating(false)}>Cancel</Button>
                        <Button onClick={handleRotateKey} disabled={rotateKey.isPending}>
                          Generate New Secret
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {!isNew && existingApp && (
              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive text-sm font-mono uppercase tracking-wider">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Deleting this application will permanently break authentication for all connected instances.
                  </p>
                  <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full font-mono text-xs">
                        <Trash2 className="mr-2 h-4 w-4" /> DELETE APPLICATION
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-destructive">Delete Application</DialogTitle>
                        <DialogDescription>
                          Are you absolutely sure? This will permanently delete <strong>{existingApp.name}</strong> and remove all associated configuration. Active users will be forcefully disconnected.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteApp.isPending}>
                          Yes, Delete Application
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
