import * as React from "react"
import { FaGoogle, FaApple, FaGithub, FaMicrosoft, FaXTwitter, FaLinkedin, FaMeta } from "react-icons/fa6"
import { Mail, Globe } from "lucide-react"

export function ProviderIcon({ provider, className = "h-4 w-4" }: { provider: string, className?: string }) {
  const normalized = provider.toLowerCase()
  
  switch (normalized) {
    case 'google': return <FaGoogle className={className} />
    case 'facebook': case 'meta': return <FaMeta className={className} />
    case 'apple': return <FaApple className={className} />
    case 'github': return <FaGithub className={className} />
    case 'microsoft': return <FaMicrosoft className={className} />
    case 'twitter': case 'x': return <FaXTwitter className={className} />
    case 'linkedin': return <FaLinkedin className={className} />
    case 'email': case 'password': return <Mail className={className} />
    default: return <Globe className={className} />
  }
}
