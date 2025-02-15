import React from 'react';
import { Camera } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center">
            <Camera className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">RacePhotoHub</span>
          </div>
          <div className="text-sm text-gray-500 space-y-4">
            <p>© {new Date().getFullYear()} RacePhotoHub.</p>
            <p>All rights reserved.</p>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-indigo-600">Terms</a>
            <a href="#" className="hover:text-indigo-600">Privacy</a>
            <a href="#" className="hover:text-indigo-600">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}