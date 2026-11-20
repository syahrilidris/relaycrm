import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/plus-jakarta-sans'
import './globals.css'
import { CrmApp } from '@/components/crm/crm-app'

export const metadata: Metadata = {
  title: { default: 'Bintang CRM', template: '%s · Bintang CRM' },
  applicationName: 'Bintang CRM',
  description: 'Omnichannel CRM for WhatsApp, Messenger and Instagram: one inbox for customer conversations, contacts and support cases.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F6FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1430' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">
        <CrmApp>{children}</CrmApp>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
