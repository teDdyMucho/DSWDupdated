import React, { useState } from 'react';
import { TeamSelector } from './TeamSelector';
import { CreateTeamModal } from './CreateTeamModal';
import { TeamMembers } from './TeamMembers';
import { TeamSettings } from './TeamSettings';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, Users } from 'lucide-react';

export function TeamManagementPage() {
  const { signOut, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Team Management</h1>
        
        <div className="flex items-center space-x-4">
          <TeamSelector onCreateTeamClick={() => setShowCreateTeamModal(true)} />
          
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">{currentUser?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-red-600 hover:text-red-800"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-6 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Team Members
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-6 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-5 h-5 mr-2" />
              Team Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'members' ? <TeamMembers /> : <TeamSettings />}
        </div>
      </div>
      
      <CreateTeamModal 
        isOpen={showCreateTeamModal} 
        onClose={() => setShowCreateTeamModal(false)} 
      />
    </div>
  );
}
