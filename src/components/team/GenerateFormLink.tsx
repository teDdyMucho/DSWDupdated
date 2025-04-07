import React, { useState } from 'react';
import { Link, Copy, CheckCircle } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';

export function GenerateFormLink() {
  const { currentTeam } = useTeam();
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const formLink = currentTeam 
    ? `${window.location.origin}/apply/${currentTeam.id}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
        Please select a team to generate an application form link.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Application Form Link</h3>
        {showSuccess && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            Link generated successfully!
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <Link className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={formLink}
            readOnly
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700"
          />
          <button
            onClick={handleCopy}
            className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Share this link with applicants to allow them to fill out their information.
        The form is specifically linked to your team and will automatically collect
        all required beneficiary data.
      </p>
    </div>
  );
}