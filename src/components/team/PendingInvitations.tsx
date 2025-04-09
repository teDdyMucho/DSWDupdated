import { useTeam } from '../../contexts/TeamContext';
import { Check, X } from 'lucide-react';

export function PendingInvitations() {
  const { pendingInvitations, acceptTeamInvitation, removeTeamMember } = useTeam();
  
  if (pendingInvitations.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6 bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-medium text-blue-900 mb-2">Pending Team Invitations</h3>
      <p className="text-sm text-blue-700 mb-4">
        You have been invited to join the following teams. Accept to join or decline to remove the invitation.
      </p>
      
      <div className="space-y-3">
        {pendingInvitations.map(invitation => (
          <div 
            key={invitation.id} 
            className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm"
          >
            <div>
              <p className="font-medium">Team Invitation</p>
              <p className="text-sm text-gray-500">
                Role: {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => acceptTeamInvitation(invitation.id)}
                className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                title="Accept invitation"
              >
                <Check className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => removeTeamMember(invitation.id)}
                className="p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                title="Decline invitation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
