import React, { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { UserPlus, Trash2, UserCheck, UserX, Loader } from 'lucide-react';

export function TeamMembers() {
  const { 
    teamMembers, 
    currentTeam, 
    addTeamMember, 
    removeTeamMember, 
    updateTeamMemberRole,
    checkUserExists,
    teams
  } = useTeam();
  
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setNewMemberEmail(email);
    
    // Clear any previous messages
    setError(null);
    setSuccess(null);
    
    // If email is empty or doesn't look like a valid email, don't verify
    if (!email || !email.includes('@') || email.length < 5) {
      setEmailExists(null);
      return;
    }
    
    // Debounce the verification
    const timeoutId = setTimeout(async () => {
      try {
        setVerifyingEmail(true);
        const exists = await checkUserExists(email);
        setEmailExists(exists);
        
        // We're no longer showing errors for non-existent accounts
        // since we're allowing them in certain conditions
        setError(null);
      } catch (err) {
        console.error('Error verifying email:', err);
      } finally {
        setVerifyingEmail(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTeam) {
      setError('No team selected');
      return;
    }
    
    if (!newMemberEmail.trim()) {
      setError('Email is required');
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);
      
      await addTeamMember(currentTeam.id, newMemberEmail.trim(), newMemberRole);
      setNewMemberEmail('');
      setNewMemberRole('member');
      setEmailExists(null);
      setSuccess(`Successfully added ${newMemberEmail.trim()} to the team.`);
    } catch (err: any) {
      setError(err.message || 'Failed to add team member');
      console.error('Add member error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this team?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await removeTeamMember(memberId);
      setSuccess(`Successfully removed ${email} from the team.`);
    } catch (err: any) {
      setError(err.message || 'Failed to remove team member');
      console.error('Remove member error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: 'admin' | 'member', email: string) => {
    try {
      setLoading(true);
      await updateTeamMemberRole(memberId, role);
      setSuccess(`Successfully updated ${email}'s role to ${role}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
      console.error('Update role error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
        Please select or create a team to manage members.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="email"
              value={newMemberEmail}
              onChange={handleEmailChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                emailExists === true 
                  ? 'border-green-300 focus:ring-green-500' 
                  : emailExists === false 
                    ? 'border-gray-300 focus:ring-blue-500' 
                    : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Email address"
              required
              disabled={loading}
            />
            {verifyingEmail && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
            {emailExists === true && !verifyingEmail && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <UserCheck className="w-4 h-4 text-green-500" />
              </div>
            )}
          </div>
          
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          
          <button
            type="submit"
            disabled={loading || verifyingEmail}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </>
            )}
          </button>
        </form>
        
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md">
          <p className="text-sm">
            <strong>Note:</strong> Enter the email address of the person you want to add to your team.
            They will be able to access this team once added.
          </p>
        </div>
        
        {teamMembers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No team members yet.</p>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {teamMembers.map((member) => (
                <li key={member.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {member.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.email || 'Pending User'}
                        </div>
                        <div className="flex text-sm text-gray-500">
                          <span className="mr-2">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                          {member.teamId && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {teams.find(t => t.id === member.teamId)?.name || 'Unknown Team'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {member.role === 'member' ? (
                        <button
                          onClick={() => handleRoleChange(member.id, 'admin', member.email || '')}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          title="Make admin"
                          disabled={loading}
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(member.id, 'member', member.email || '')}
                          className="text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                          title="Make member"
                          disabled={loading}
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id, member.email || '')}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Remove member"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
