import { useState, useEffect } from 'react';
import { Search, Table } from 'lucide-react';

interface ColumnMapperProps {
  columns: string[];
  mappings: Record<string, string>;
  onMappingChange: (column: string, dbField: string) => void;
  columnRefs: Record<string, string>;
}

const dbFields = [
  { key: 'last_name', label: 'Last Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'extension_name', label: 'Extension Name (Jr., Sr., III, etc.)' },
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

export function ColumnMapper({ columns, mappings, onMappingChange, columnRefs }: ColumnMapperProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExcelColumns, setShowExcelColumns] = useState(false);
  const [autoMappingSuggestions, setAutoMappingSuggestions] = useState<Record<string, { dbField: string, exactMatch: boolean }>>({});

  // Generate auto-mapping suggestions when columns change
  useEffect(() => {
    const suggestions: Record<string, { dbField: string, exactMatch: boolean }> = {};
    
    columns.forEach(column => {
      // Try to find exact matches first (case insensitive)
      const normalizedColumn = column.toLowerCase().trim();
      
      // Check for matches in field keys
      const exactKeyMatch = dbFields.find(field => field.key.toLowerCase() === normalizedColumn);
      if (exactKeyMatch) {
        suggestions[column] = { dbField: exactKeyMatch.key, exactMatch: true };
        return;
      }
      
      // Check for matches in field labels
      const exactLabelMatch = dbFields.find(field => field.label.toLowerCase() === normalizedColumn);
      if (exactLabelMatch) {
        suggestions[column] = { dbField: exactLabelMatch.key, exactMatch: true };
        return;
      }
      
      // If no exact match, try to find similar matches
      const similarKeyMatch = dbFields.find(field => {
        const similarity = normalizedColumn.includes(field.key.toLowerCase()) || 
                          field.key.toLowerCase().includes(normalizedColumn);
        return similarity;
      });
      
      if (similarKeyMatch) {
        suggestions[column] = { dbField: similarKeyMatch.key, exactMatch: false };
        return;
      }
      
      const similarLabelMatch = dbFields.find(field => {
        const similarity = normalizedColumn.includes(field.label.toLowerCase()) || 
                          field.label.toLowerCase().includes(normalizedColumn);
        return similarity;
      });
      
      if (similarLabelMatch) {
        suggestions[column] = { dbField: similarLabelMatch.key, exactMatch: false };
      }
    });
    
    setAutoMappingSuggestions(suggestions);
  }, [columns]);

  const filteredFields = dbFields.filter(field => 
    field.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredColumns = columns.filter(column =>
    column.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Function to apply all auto-mapping suggestions
  const applyAutoMappings = () => {
    Object.entries(autoMappingSuggestions).forEach(([column, { dbField }]) => {
      if (!mappings[column]) {
        onMappingChange(column, dbField);
      }
    });
  };
  
  // Function to apply only exact auto-mapping suggestions
  const applyExactAutoMappings = () => {
    Object.entries(autoMappingSuggestions).forEach(([column, { dbField, exactMatch }]) => {
      if (!mappings[column] && exactMatch) {
        onMappingChange(column, dbField);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Column Mapping</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={applyExactAutoMappings}
                className="flex items-center px-3 py-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                title="Apply only exact matches"
              >
                Auto-Map Exact
              </button>
              <button
                onClick={applyAutoMappings}
                className="flex items-center px-3 py-2 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                title="Apply all suggested mappings"
              >
                Auto-Map All
              </button>
            </div>
            <button
              onClick={() => setShowExcelColumns(!showExcelColumns)}
              className={`flex items-center px-3 py-2 rounded-md ${showExcelColumns ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} hover:bg-blue-50`}
            >
              <Table className="w-4 h-4 mr-2" />
              {showExcelColumns ? 'Hide Excel Columns' : 'Show Excel Columns'}
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        {showExcelColumns && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Excel Columns</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column Reference</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mapped To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredColumns.map((column) => (
                    <tr key={column} className="hover:bg-gray-100">
                      <td className="px-4 py-2 text-sm text-gray-600">{columnRefs[column] || '-'}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-700">{column}</td>
                      <td className="px-4 py-2 text-sm">
                        {mappings[column] ? (
                          <span className="text-green-600">
                            {dbFields.find(f => f.key === mappings[column])?.label || mappings[column]}
                          </span>
                        ) : autoMappingSuggestions[column] ? (
                          <span className={autoMappingSuggestions[column].exactMatch ? 'text-blue-600 italic' : 'text-red-600 italic'}>
                            Suggested: {dbFields.find(f => f.key === autoMappingSuggestions[column].dbField)?.label}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          {filteredFields.map(({ key: dbField, label }) => (
            <div key={dbField} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <span className="text-xs text-gray-500">
                    Database field: {dbField}
                  </span>
                </div>
                {Object.entries(mappings).find(([_, value]) => value === dbField) && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Mapped
                  </span>
                )}
              </div>
              <select
                value={Object.entries(mappings).find(([_, value]) => value === dbField)?.[0] || ''}
                onChange={(e) => {
                  // Remove any existing mapping for this db field
                  const existingColumn = Object.entries(mappings).find(([_, value]) => value === dbField)?.[0];
                  if (existingColumn) {
                    onMappingChange(existingColumn, '');
                  }
                  // Add new mapping
                  if (e.target.value) {
                    onMappingChange(e.target.value, dbField);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Excel Column</option>
                {columns.map((column) => {
                  const suggestion = autoMappingSuggestions[column];
                  const isSuggested = suggestion && suggestion.dbField === dbField;
                  return (
                    <option 
                      key={column} 
                      value={column}
                      disabled={Boolean(mappings[column] && mappings[column] !== dbField)}
                      className={isSuggested ? (suggestion.exactMatch ? 'text-blue-600' : 'text-red-600') : ''}
                    >
                      {columnRefs[column] ? `${columnRefs[column]} - ${column}` : column}
                      {isSuggested && (suggestion.exactMatch ? ' (Exact Match)' : ' (Similar Match)')}
                    </option>
                  );
                })}
              </select>
              {dbField === 'extension_name' && (
                <p className="mt-2 text-xs text-gray-500 italic">
                  Common values: Jr., Sr., III, IV, etc.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Mapping Progress</h3>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(Object.keys(mappings).length / dbFields.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 min-w-[4rem]">
            {Object.keys(mappings).length} / {dbFields.length}
          </span>
        </div>
      </div>
    </div>
  );
}