import React, { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { Users, ChevronDown, Plus } from 'lucide-react';

interface TeamSelectorProps {
  onCreateTeamClick: () => void;
}

export function TeamSelector({ onCreateTeamClick }: TeamSelectorProps) {
  const { teams, currentTeam, selectTeam } = useTeam();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  
  const handleTeamSelect = (teamId: string) => {
    selectTeam(teamId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
        aria-expanded={isOpen}
      >
        <Users className="w-5 h-5 text-gray-500" />
        <span className="max-w-[150px] truncate">
          {currentTeam ? currentTeam.name : 'Select Team'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team.id)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  currentTeam?.id === team.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                {team.name}
              </button>
            ))}
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button
              onClick={() => {
                onCreateTeamClick();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 flex items-center"
              role="menuitem"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
