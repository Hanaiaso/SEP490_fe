import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import NotificationsPage from './NotificationsPage'

export default function CustomerNotificationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <NotificationsPage />
      </main>
      <Footer />
    </div>
  )
}
