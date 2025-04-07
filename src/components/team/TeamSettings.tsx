import React, { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { Save, Trash2 } from 'lucide-react';
import { FormLinksManagement } from './FormLinksManagement';

export function TeamSettings() {
  const { currentTeam, updateTeam, deleteTeam } = useTeam();
  const [name, setName] = useState(currentTeam?.name || '');
  const [description, setDescription] = useState(currentTeam?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update form when current team changes
  React.useEffect(() => {
    if (currentTeam) {
      setName(currentTeam.name);
      setDescription(currentTeam.description || '');
    }
  }, [currentTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTeam) {
      setError('No team selected');
      return;
    }
    
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);
      await updateTeam(currentTeam.id, name.trim(), description.trim() || undefined);
      setSuccess('Team settings updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update team');
      console.error('Update team error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTeam) return;
    
    try {
      await deleteTeam(currentTeam.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete team error:', err);
      setError('Failed to delete team');
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
        Please select or create a team to manage settings.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Settings</h3>
        
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">
              Team Name*
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter team name"
              required
            />
          </div>
          
          <div>
            <label htmlFor="team-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter team description"
              rows={3}
            />
          </div>
          
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Team
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <FormLinksManagement />
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Team</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete the team "{currentTeam.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}