import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ColumnMapper } from './components/ColumnMapper';
import { BeneficiaryList } from './components/BeneficiaryList';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Save, Upload, List, Settings } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { TeamManagementPage } from './components/team/TeamManagementPage';
import { useTeam } from './contexts/TeamContext';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route,
  createRoutesFromElements
} from 'react-router-dom';
import { ApplicantForm } from './components/ApplicantForm';

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
  [key: string]: string | number | undefined; 
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'import' | 'list' | 'team'>('import');
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [columnRefs, setColumnRefs] = useState<Record<string, string>>({});
  const { currentTeam } = useTeam();

  const handleFileLoad = (fileData: any[], sheets: string[], refs: Record<string, string>) => {
    setData(fileData);
    setColumns(Object.keys(fileData[0] || {}));
    setSheetNames(sheets);
    setSelectedSheet(sheets[0]);
    setColumnRefs(refs);
    setMessage(null);
  };

  const handleMappingChange = (column: string, dbField: string) => {
    setMappings((prev) => ({ ...prev, [column]: dbField }));
  };

  const handleSave = async () => {
    if (!currentTeam) {
      setMessage({ 
        type: 'error', 
        text: 'Please select or create a team before importing data.' 
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const beneficiariesRef = collection(db, 'beneficiaries');
      const transformedData = data.map(row => {
        const beneficiary: BeneficiaryData = {
          team_id: currentTeam.id 
        };
        Object.entries(mappings).forEach(([excelColumn, dbField]) => {
          if (dbField && row[excelColumn] !== undefined) {
            if (dbField === 'amount') {
              beneficiary[dbField] = parseFloat(row[excelColumn]) || 0;
            } else {
              beneficiary[dbField] = row[excelColumn]?.toString().trim();
            }
          }
        });
        return beneficiary;
      });

      const batchSize = 500;
      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        await Promise.all(batch.map(beneficiary => addDoc(beneficiariesRef, beneficiary)));
      }

      setMessage({ type: 'success', text: 'Beneficiary data imported successfully!' });
      setData([]);
      setColumns([]);
      setMappings({});
      setSelectedSheet('');
      setSheetNames([]);
      setColumnRefs({});
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to import data. Please check your column mappings and try again.' 
      });
      console.error('Import error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentTeam && activeTab !== 'team') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-yellow-50 p-4 rounded-md text-yellow-700 mb-4">
            Please select or create a team to continue.
          </div>
          <TeamManagementPage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Beneficiary Data Management</h1>
        
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('import')}
                className={`py-4 px-6 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-5 h-5 mr-2" />
                Import Data
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`py-4 px-6 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <List className="w-5 h-5 mr-2" />
                View List
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`py-4 px-6 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'team'
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
            {activeTab === 'import' ? (
              <div className="space-y-6">
                <FileUpload onFileLoad={handleFileLoad} />

                {data.length > 0 && (
                  <div className="space-y-6">
                    {sheetNames.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Sheet
                        </label>
                        <select
                          value={selectedSheet}
                          onChange={(e) => setSelectedSheet(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {sheetNames.map((sheet) => (
                            <option key={sheet} value={sheet}>{sheet}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <ColumnMapper
                      columns={columns}
                      mappings={mappings}
                      onMappingChange={handleMappingChange}
                      columnRefs={columnRefs}
                    />

                    {message && (
                      <div className={`p-4 rounded-md ${
                        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {message.text}
                      </div>
                    )}

                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {isLoading ? 'Importing...' : 'Import Beneficiary Data'}
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === 'list' ? (
              <BeneficiaryList teamId={currentTeam?.id} />
            ) : (
              <TeamManagementPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TeamProvider>
          <Routes>
            <Route path="/apply/:teamId/:formLinkId" element={<ApplicantForm />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
          </Routes>
        </TeamProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;