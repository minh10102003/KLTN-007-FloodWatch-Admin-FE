import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="ml-56 min-h-screen overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
