import React, { useState, useEffect } from 'react';
import { Link, Copy, CheckCircle, Trash2, Eye, UserPlus, Search, Filter, X, ChevronDown, ChevronUp, UploadCloud } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, writeBatch, orderBy } from 'firebase/firestore';

interface FormLink {
  id: string;
  name: string;
  created_at: Date;
  team_id: string;
  submissions_count: number;
}

const TABLE_COLUMNS = [
  { key: 'last_name', label: 'Last Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'extension_name', label: 'Extension Name' },
  { key: 'birth_month', label: 'Birth Month' },
  { key: 'birth_day', label: 'Birth Day' },
  { key: 'birth_year', label: 'Birth Year' },
  { key: 'sex', label: 'Sex' },
  { key: 'civil_status', label: 'Civil Status' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'type_of_assistance', label: 'Type of Assistance' },
  { key: 'amount', label: 'Amount' },
  { key: 'philsys_number', label: 'PhilSys Number' },
  { key: 'beneficiary_uniq', label: 'Beneficiary ID' },
  { key: 'target_sector', label: 'Target Sector' },
  { key: 'sub_category', label: 'Sub Category' }
];

type Tab = 'links' | 'submissions';
type SortConfig = { field: string; direction: 'asc' | 'desc' } | null;

export function FormLinksManagement() {
  const { currentTeam } = useTeam();
  const [activeTab, setActiveTab] = useState<Tab>('links');
  const [formLinks, setFormLinks] = useState<FormLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLinkName, setNewLinkName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [processingSubmissions, setProcessingSubmissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(TABLE_COLUMNS.map(col => col.key)));
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      loadFormLinks();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (selectedLink) {
      loadSubmissions(selectedLink);
    }
  }, [selectedLink]);

  const loadFormLinks = async () => {
    if (!currentTeam) return;

    try {
      setLoading(true);
      const linksQuery = query(
        collection(db, 'form_links'),
        where('team_id', '==', currentTeam.id),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(linksQuery);
      
      const links = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const submissionsQuery = query(
          collection(db, 'form_submissions'),
          where('form_link_id', '==', doc.id)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at.toDate(),
          submissions_count: submissionsSnapshot.size
        } as FormLink;
      }));
      
      setFormLinks(links);
    } catch (err) {
      console.error('Error loading form links:', err);
      setError('Failed to load form links');
    } finally {
      setLoading(false);
    }
  };

  const createFormLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !newLinkName.trim()) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'form_links'), {
        name: newLinkName.trim(),
        team_id: currentTeam.id,
        created_at: new Date()
      });
      
      setNewLinkName('');
      await loadFormLinks();
    } catch (err) {
      console.error('Error creating form link:', err);
      setError('Failed to create form link');
    } finally {
      setLoading(false);
    }
  };

  const deleteFormLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this form link? This will also delete all submissions associated with this link.')) {
      return;
    }

    try {
      setLoading(true);
      
      const submissionsQuery = query(
        collection(db, 'form_submissions'),
        where('form_link_id', '==', linkId)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      
      const batch = writeBatch(db);
      
      submissionsSnapshot.docs.forEach((submissionDoc) => {
        batch.delete(submissionDoc.ref);
      });
      
      batch.delete(doc(db, 'form_links', linkId));
      
      await batch.commit();
      
      if (selectedLink === linkId) {
        setSelectedLink(null);
        setSubmissions([]);
      }
      await loadFormLinks();
      
    } catch (err) {
      console.error('Error deleting form link:', err);
      setError('Failed to delete form link and its submissions');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (linkId: string) => {
    const link = `${window.location.origin}/apply/${currentTeam?.id}/${linkId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const loadSubmissions = async (linkId: string) => {
    try {
      setLoading(true);
      const submissionsQuery = query(
        collection(db, 'form_submissions'),
        where('form_link_id', '==', linkId)
      );
      const snapshot = await getDocs(submissionsQuery);
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const addToBeneficiaryList = async (submission: any) => {
    if (!currentTeam) return;
    
    try {
      setProcessingSubmissions(prev => new Set(prev).add(submission.id));
      
      await addDoc(collection(db, 'beneficiaries'), {
        ...submission,
        team_id: currentTeam.id,
        created_at: new Date()
      });
      
      alert('Successfully added to Beneficiary List');
      
    } catch (err) {
      console.error('Error adding to beneficiary list:', err);
      alert('Failed to add to Beneficiary List');
    } finally {
      setProcessingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submission.id);
        return newSet;
      });
    }
  };

  const bulkAddToBeneficiaryList = async () => {
    if (!currentTeam || selectedSubmissions.size === 0) return;
    
    if (!confirm(`Are you sure you want to add ${selectedSubmissions.size} submissions to the beneficiary list?`)) {
      return;
    }
    
    try {
      setBulkProcessing(true);
      const batch = writeBatch(db);
      let successCount = 0;
      let errorCount = 0;
      
      // Get selected submissions
      const selectedItems = submissions.filter(submission => selectedSubmissions.has(submission.id));
      
      // Process each submission
      for (const submission of selectedItems) {
        try {
          await addDoc(collection(db, 'beneficiaries'), {
            ...submission,
            team_id: currentTeam.id,
            created_at: new Date()
          });
          successCount++;
        } catch (err) {
          console.error('Error adding submission to beneficiary list:', err);
          errorCount++;
        }
      }
      
      // Clear selections
      setSelectedSubmissions(new Set());
      
      // Show results
      alert(`Added ${successCount} submissions to Beneficiary List. ${errorCount > 0 ? `Failed to add ${errorCount} submissions.` : ''}`);
      
    } catch (err) {
      console.error('Error in bulk add operation:', err);
      alert('Failed to complete bulk add operation');
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const toggleAllSubmissions = () => {
    if (selectedSubmissions.size === sortedSubmissions.length) {
      // Deselect all
      setSelectedSubmissions(new Set());
    } else {
      // Select all
      setSelectedSubmissions(new Set(sortedSubmissions.map(s => s.id)));
    }
  };

  const handleSort = (field: string) => {
    setSortConfig(current => {
      if (current?.field === field) {
        return current.direction === 'asc' 
          ? { field, direction: 'desc' }
          : null;
      }
      return { field, direction: 'asc' };
    });
  };

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (!searchTerm) return true;
    
    return TABLE_COLUMNS.some(({ key }) => {
      const value = submission[key];
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;
    
    const comparison = aValue.toString().localeCompare(bValue.toString());
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  if (!currentTeam) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
        Please select a team to manage form links.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('links')}
            className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
              activeTab === 'links'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Link className="w-5 h-5 mr-2" />
            Form Links
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
              activeTab === 'submissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="w-5 h-5 mr-2" />
            Submissions
          </button>
        </nav>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {activeTab === 'links' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Form Links</h3>
            <form onSubmit={createFormLink} className="flex gap-2">
              <input
                type="text"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                placeholder="Enter form name"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !newLinkName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Link
              </button>
            </form>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {formLinks.map((link) => (
                <li key={link.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{link.name}</h4>
                      <p className="text-sm text-gray-500">
                        Created: {link.created_at.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submissions: {link.submissions_count}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLink(link.id);
                          setActiveTab('submissions');
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="View Submissions"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => copyLink(link.id)}
                        className="p-2 text-gray-600 hover:text-gray-800"
                        title="Copy Link"
                      >
                        {copiedId === link.id ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteFormLink(link.id)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="Delete Link"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search submissions..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {selectedSubmissions.size > 0 && (
                <button
                  onClick={bulkAddToBeneficiaryList}
                  disabled={bulkProcessing || selectedSubmissions.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Bulk Add ({selectedSubmissions.size})
                </button>
              )}
              
              <select
                value={selectedLink || ''}
                onChange={(e) => setSelectedLink(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Form Link</option>
                {formLinks.map(link => (
                  <option key={link.id} value={link.id}>
                    {link.name} ({link.submissions_count})
                  </option>
                ))}
              </select>

              <div className="relative">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
                  onClick={() => {
                    const menu = document.getElementById('column-menu');
                    menu?.classList.toggle('hidden');
                  }}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Columns
                </button>
                <div
                  id="column-menu"
                  className="hidden absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                >
                  <div className="py-1" role="menu">
                    {TABLE_COLUMNS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(key)}
                          onChange={() => toggleColumn(key)}
                          className="mr-2"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-x-auto rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.size > 0 && selectedSubmissions.size === sortedSubmissions.length}
                      onChange={toggleAllSubmissions}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                  {TABLE_COLUMNS.filter(({ key }) => visibleColumns.has(key)).map(({ key, label }) => (
                    <th 
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer group hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <span>{label}</span>
                        <span className="ml-2">
                          {sortConfig?.field === key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ChevronUp className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                          )}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.has(submission.id)}
                        onChange={() => toggleSubmissionSelection(submission.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => addToBeneficiaryList(submission)}
                        disabled={processingSubmissions.has(submission.id)}
                        className="text-green-600 hover:text-green-800 disabled:opacity-50"
                        title="Add to Beneficiary List"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </td>
                    {TABLE_COLUMNS.filter(({ key }) => visibleColumns.has(key)).map(({ key }) => (
                      <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {key === 'amount' && submission[key] 
                          ? `₱${submission[key].toLocaleString()}`
                          : submission[key] || '-'}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(submission.created_at?.toDate()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {sortedSubmissions.length === 0 && (
                  <tr>
                    <td
                      colSpan={visibleColumns.size + 2}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}