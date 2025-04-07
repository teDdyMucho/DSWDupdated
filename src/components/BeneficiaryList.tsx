import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Download, ChevronUp, ChevronDown, Trash2, Copy, CheckSquare, Edit2, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BeneficiaryData {
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  extension_name?: string;
  birth_month?: string;
  birth_day?: string;
  birth_year?: string;
  sex?: string;
  barangay?: string;
  psgc_city?: string;
  city?: string;
  province?: string;
  type_of_assistance?: string;
  amount?: number;
  philsys_number?: string;
  beneficiary_uniq?: string;
  contact_number?: string;
  target_sector?: string;
  sub_category?: string;
  civil_status?: string;
  team_id?: string;
  docId?: string;
  [key: string]: string | number | undefined;
}

interface BeneficiaryListProps {
  teamId?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string;
  direction: SortDirection;
}

const MONTH_MAP: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
};

const COLUMN_HEADERS = [
  { key: 'last_name', label: 'Last Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'extension_name', label: 'Extension Name' },
  { key: 'birth_month', label: 'Birth Month' },
  { key: 'birth_day', label: 'Birth Day' },
  { key: 'birth_year', label: 'Birth Year' },
  { key: 'sex', label: 'Sex' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'psgc_city', label: 'PSGC City' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'type_of_assistance', label: 'Type of Assistance' },
  { key: 'amount', label: 'Amount' },
  { key: 'philsys_number', label: 'PhilSys Number' },
  { key: 'beneficiary_uniq', label: 'Beneficiary ID' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'target_sector', label: 'Target Sector' },
  { key: 'sub_category', label: 'Sub Category' },
  { key: 'civil_status', label: 'Civil Status' }
];

const isRowEmpty = (beneficiary: BeneficiaryData): boolean => {
  return COLUMN_HEADERS.every(({ key }) => {
    const value = beneficiary[key as keyof BeneficiaryData];
    return value === null || value === undefined || value === '' || value === 0;
  });
};

const convertMonthToNumber = (month: string | undefined): string => {
  if (!month) return '';
  const normalizedMonth = month.toLowerCase().trim();
  if (/^([1-9]|1[0-2])$/.test(normalizedMonth)) {
    return normalizedMonth.padStart(2, '0');
  }
  if (isNaN(Number(normalizedMonth))) {
    return MONTH_MAP[normalizedMonth] || normalizedMonth;
  }
  return normalizedMonth;
};

export function BeneficiaryList({ teamId }: BeneficiaryListProps) {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ column: '', direction: null });
  const [isClearing, setIsClearing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState<'single' | 'mass' | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (teamId) {
      loadBeneficiaries();
    } else {
      setBeneficiaries([]);
      setIsLoading(false);
    }
  }, [teamId]);

  const loadBeneficiaries = async () => {
    if (!teamId) return;
    
    try {
      setIsLoading(true);
      const beneficiariesRef = collection(db, 'beneficiaries');
      
      // Query beneficiaries for the current team
      const beneficiariesQuery = query(beneficiariesRef, where('team_id', '==', teamId));
      const snapshot = await getDocs(beneficiariesQuery);
      
      const data = snapshot.docs
        .map(doc => ({ ...doc.data() as BeneficiaryData, docId: doc.id }))
        .filter(beneficiary => !isRowEmpty(beneficiary));
        
      setBeneficiaries(data);
      setError(null);
    } catch (err) {
      setError('Failed to load beneficiaries');
      console.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter beneficiaries based on the search query across all columns
  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    if (!searchQuery.trim()) return true;
    return COLUMN_HEADERS.some(({ key }) => {
      const value = beneficiary[key as keyof BeneficiaryData];
      return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  const handleClearData = async () => {
    if (!teamId) return;
    
    if (!window.confirm('Are you sure you want to clear all beneficiary data for this team? This action cannot be undone.')) {
      return;
    }
    
    setIsClearing(true);
    setError(null);
    
    try {
      const beneficiariesRef = collection(db, 'beneficiaries');
      const beneficiariesQuery = query(beneficiariesRef, where('team_id', '==', teamId));
      const snapshot = await getDocs(beneficiariesQuery);
      
      const batchSize = 500;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, Math.min(docs.length, i + batchSize));
        await Promise.all(batch.map(doc => deleteDoc(doc.ref)));
      }
      
      setBeneficiaries([]);
      setSort({ column: '', direction: null });
    } catch (err) {
      setError('Failed to clear data');
      console.error('Clear error:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const findDuplicates = () => {
    const duplicates = beneficiaries.reduce((acc: Record<string, BeneficiaryData[]>, curr) => {
      const key = [
        curr.last_name,
        curr.first_name,
        curr.middle_name,
        curr.birth_month,
        curr.birth_day,
        curr.birth_year
      ].map(val => String(val || '').toLowerCase()).join('|');
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(curr);
      return acc;
    }, {});
    return Object.values(duplicates).filter(group => group.length > 1);
  };

  const handleRemoveDuplicates = async () => {
    const duplicateGroups = findDuplicates();
    if (duplicateGroups.length === 0) {
      alert('No duplicates found!');
      return;
    }
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.length - 1), 0);
    if (!window.confirm(`Found ${totalDuplicates} duplicate entries. Do you want to remove them?`)) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      for (const group of duplicateGroups) {
        const duplicatesToRemove = group.slice(1);
        for (const duplicate of duplicatesToRemove) {
          const docId = duplicate.docId;
          if (docId) {
            await deleteDoc(doc(db, 'beneficiaries', docId));
          }
        }
      }
      await loadBeneficiaries();
      alert('Duplicates removed successfully!');
    } catch (err) {
      setError('Failed to remove duplicates');
      console.error('Remove duplicates error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: string) => {
    const direction: SortDirection = 
      sort.column === column && sort.direction === 'asc' ? 'desc' :
      sort.column === column && sort.direction === 'desc' ? null :
      'asc';
    setSort({ column, direction });
    if (!direction) {
      loadBeneficiaries();
      return;
    }
    const sortedData = [...beneficiaries].sort((a, b) => {
      let aValue = a[column as keyof BeneficiaryData];
      let bValue = b[column as keyof BeneficiaryData];
      if (column === 'birth_month') {
        aValue = convertMonthToNumber(aValue as string);
        bValue = convertMonthToNumber(bValue as string);
      } else if (column === 'amount') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }
      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
    setBeneficiaries(sortedData);
  };

  const handleExport = () => {
    const exportData = beneficiaries
      .filter(beneficiary => !isRowEmpty(beneficiary))
      .map(beneficiary => {
        const formattedData: Record<string, any> = {};
        COLUMN_HEADERS.forEach(({ key, label }) => {
          if (key === 'amount' && beneficiary[key]) {
            formattedData[label] = `₱${beneficiary[key]?.toLocaleString()}`;
          } else if (key === 'birth_month') {
            formattedData[label] = convertMonthToNumber(beneficiary[key]);
          } else {
            formattedData[label] = beneficiary[key] || '';
          }
        });
        return formattedData;
      });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const columnWidths = COLUMN_HEADERS.map(() => ({ wch: 15 }));
    worksheet['!cols'] = columnWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Beneficiaries');
    XLSX.writeFile(workbook, 'beneficiaries.xlsx');
  };

  const handleSelectRow = (docId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredBeneficiaries.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredBeneficiaries.map(b => b.docId!)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.size} selected records?`)) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all(
        Array.from(selectedRows).map(docId => deleteDoc(doc(db, 'beneficiaries', docId)))
      );
      await loadBeneficiaries();
      setSelectedRows(new Set());
      alert('Selected records deleted successfully!');
    } catch (err) {
      setError('Failed to delete selected records');
      console.error('Delete error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (docId: string) => {
    const beneficiary = beneficiaries.find(b => b.docId === docId);
    if (beneficiary) {
      setEditData({ ...beneficiary });
      setEditingRow(docId);
      setEditMode('single');
    }
  };

  const handleMassEdit = () => {
    if (selectedRows.size === 0) {
      alert('Please select rows to edit');
      return;
    }
    setEditMode('mass');
    setEditData({});
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (editMode === 'single' && editingRow) {
        await updateDoc(doc(db, 'beneficiaries', editingRow), editData);
      } else if (editMode === 'mass') {
        await Promise.all(
          Array.from(selectedRows).map(docId =>
            updateDoc(doc(db, 'beneficiaries', docId), editData)
          )
        );
      }
      await loadBeneficiaries();
      setEditMode(null);
      setEditingRow(null);
      setEditData({});
      setSelectedRows(new Set());
    } catch (err) {
      setError('Failed to save changes');
      console.error('Save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    setEditingRow(null);
    setEditData({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Beneficiary List</h2>
        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <>
              <button
                onClick={handleMassEdit}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Selected ({selectedRows.size})
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedRows.size})
              </button>
            </>
          )}
          <button
            onClick={handleRemoveDuplicates}
            disabled={isLoading || beneficiaries.length === 0}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 mr-2" />
            Remove Duplicates
          </button>
          <button
            onClick={handleClearData}
            disabled={isClearing || beneficiaries.length === 0}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear Data'}
          </button>
          <button
            onClick={handleExport}
            disabled={beneficiaries.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search beneficiaries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-md w-full"
        />
      </div>

      {editMode === 'mass' && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-4">Mass Edit {selectedRows.size} Records</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {COLUMN_HEADERS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={key === 'amount' ? 'number' : 'text'}
                  value={editData[key] || ''}
                  onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <X className="w-4 h-4 mr-2 inline" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filteredBeneficiaries.length > 0 && selectedRows.size === filteredBeneficiaries.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              {COLUMN_HEADERS.map(({ key, label }) => (
                <th
                  key={label}
                  onClick={() => handleSort(key)}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    <span className="text-gray-400">
                      {sort.column === key && sort.direction === 'asc' && <ChevronUp className="w-4 h-4" />}
                      {sort.column === key && sort.direction === 'desc' && <ChevronDown className="w-4 h-4" />}
                      {(sort.column !== key || !sort.direction) && (
                        <span className="opacity-0 group-hover:opacity-100">
                          <ChevronUp className="w-4 h-4" />
                        </span>
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBeneficiaries.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_HEADERS.length + 3} className="px-3 py-2 text-center">
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredBeneficiaries.map((beneficiary, index) => (
                <tr 
                  key={beneficiary.beneficiary_uniq || index} 
                  className={`hover:bg-gray-50 ${selectedRows.has(beneficiary.docId!) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(beneficiary.docId!)}
                      onChange={() => handleSelectRow(beneficiary.docId!)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingRow === beneficiary.docId ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(beneficiary.docId!)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                  {COLUMN_HEADERS.map(({ key }) => (
                    <td key={key} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {editingRow === beneficiary.docId ? (
                        <input
                          type={key === 'amount' ? 'number' : 'text'}
                          value={editData[key] || ''}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        />
                      ) : (
                        key === 'amount' && beneficiary[key]
                          ? `₱${beneficiary[key]?.toLocaleString()}`
                          : key === 'birth_month'
                          ? convertMonthToNumber(beneficiary[key])
                          : beneficiary[key] || ''
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
