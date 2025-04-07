import React, { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { UserPlus, Trash2, UserCheck, UserX } from 'lucide-react';

export function TeamMembers() {
  const { teamMembers, currentTeam, addTeamMember, removeTeamMember, updateTeamMemberRole } = useTeam();
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      await addTeamMember(currentTeam.id, newMemberEmail.trim(), newMemberRole);
      setNewMemberEmail('');
      setNewMemberRole('member');
    } catch (err: any) {
      setError(err.message || 'Failed to add team member');
      console.error('Add member error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember(memberId);
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const handleRoleChange = async (memberId: string, role: 'admin' | 'member') => {
    try {
      await updateTeamMemberRole(memberId, role);
    } catch (err) {
      console.error('Update role error:', err);
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
        
        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
            required
          />
          
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </form>
        
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
                        <div className="text-sm text-gray-500">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {member.role === 'member' ? (
                        <button
                          onClick={() => handleRoleChange(member.id, 'admin')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Make admin"
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(member.id, 'member')}
                          className="text-yellow-600 hover:text-yellow-800"
                          title="Make member"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove member"
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
