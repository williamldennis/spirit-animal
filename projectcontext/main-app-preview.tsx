import React, { useState } from 'react';
import { MessageCircle, Calendar, CheckSquare, Search, MoreVertical, Send } from 'lucide-react';

export default function MainAppPreview() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <h1 className="text-lg font-semibold">
          {activeTab === 'chat' ? 'Messages' : 
           activeTab === 'calendar' ? 'Calendar' : 'Tasks'}
        </h1>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <div className="divide-y">
            {[1, 2, 3].map((chat) => (
              <div key={chat} className="flex items-center p-4 bg-white hover:bg-gray-50">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">T</span>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Team Chat</h3>
                    <span className="text-sm text-gray-500">2m ago</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Latest message preview...</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="p-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold mb-4">November 2024</h2>
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
                  <div key={day} className="bg-white p-4 text-center">
                    <span className="text-sm font-medium">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-4 space-y-4">
            {['Today', 'Tomorrow', 'Upcoming'].map((section) => (
              <div key={section} className="bg-white rounded-xl p-4">
                <h2 className="font-semibold mb-2">{section}</h2>
                <div className="space-y-2">
                  {[1, 2].map((task) => (
                    <div key={task} className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1" />
                      <div>
                        <h3 className="font-medium">Task Title</h3>
                        <p className="text-sm text-gray-600">Task description...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Assistant Overlay */}
      {showAI && (
        <div className="absolute bottom-20 right-4 w-80 bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium">AI Assistant</span>
            <button onClick={() => setShowAI(false)} className="text-gray-400">✕</button>
          </div>
          <div className="h-64 border rounded-lg p-3 mb-3 overflow-y-auto">
            {/* AI messages would go here */}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask anything..."
              className="flex-1 border rounded-full px-4 py-2 text-sm"
            />
            <button className="p-2 bg-blue-600 text-white rounded-full">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-6 py-2">
        <div className="flex justify-around">
          {[
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'tasks', icon: CheckSquare, label: 'Tasks' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI FAB */}
      <button
        onClick={() => setShowAI(!showAI)}
        className="absolute bottom-20 right-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"
      >
        AI
      </button>
    </div>
  );
}
