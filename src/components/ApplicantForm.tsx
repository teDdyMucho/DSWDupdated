import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs, orderBy, updateDoc } from 'firebase/firestore';
import { Save, ArrowLeft, AlertCircle, Users, Edit2, X, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface FormData {
  last_name: string;
  first_name: string;
  middle_name: string;
  extension_name: string;
  birth_month: string;
  birth_day: string;
  birth_year: string;
  sex: string;
  barangay: string;
  psgc_city: string;
  city: string;
  province: string;
  type_of_assistance: string;
  amount: string;
  philsys_number: string;
  beneficiary_uniq: string;
  contact_number: string;
  target_sector: string;
  sub_category: string;
  civil_status: string;
}

const INITIAL_FORM_DATA: FormData = {
  last_name: '',
  first_name: '',
  middle_name: '',
  extension_name: '',
  birth_month: '',
  birth_day: '',
  birth_year: '',
  sex: '',
  barangay: '',
  psgc_city: '',
  city: '',
  province: '',
  type_of_assistance: '',
  amount: '',
  philsys_number: '',
  beneficiary_uniq: '',
  contact_number: '',
  target_sector: '',
  sub_category: '',
  civil_status: ''
};

type Tab = 'form' | 'submissions';
type SortConfig = { field: string; direction: 'asc' | 'desc' } | null;

export function ApplicantForm() {
  const { teamId, formLinkId } = useParams<{ teamId: string; formLinkId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [formLink, setFormLink] = useState<any>(null);
  const [previousSubmissions, setPreviousSubmissions] = useState<any[]>([]);
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    if (teamId && formLinkId) {
      loadFormLink();
      loadPreviousSubmissions();
    }
  }, [teamId, formLinkId]);

  const loadPreviousSubmissions = async () => {
    try {
      const submissionsQuery = query(
        collection(db, 'form_submissions'),
        where('form_link_id', '==', formLinkId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(submissionsQuery);
      setPreviousSubmissions(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate()
        }))
      );
    } catch (err) {
      console.error('Error loading previous submissions:', err);
    }
  };

  const loadFormLink = async () => {
    try {
      const linkDoc = await getDoc(doc(db, 'form_links', formLinkId!));
      if (!linkDoc.exists()) {
        setError('Invalid form link');
        return;
      }
      setFormLink(linkDoc.data());
    } catch (err) {
      console.error('Error loading form link:', err);
      setError('Failed to load form');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'middle_name' && value.length === 1) {
      setFieldErrors(prev => ({
        ...prev,
        middle_name: 'Please enter complete middle name, not just an initial'
      }));
    } else {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    const requiredFields = [
      { key: 'last_name', label: 'Last Name' },
      { key: 'first_name', label: 'First Name' },
      { key: 'middle_name', label: 'Middle Name' },
      { key: 'birth_month', label: 'Birth Month' },
      { key: 'birth_day', label: 'Birth Day' },
      { key: 'birth_year', label: 'Birth Year' },
      { key: 'sex', label: 'Sex' },
      { key: 'civil_status', label: 'Civil Status' },
      { key: 'province', label: 'Province' },
      { key: 'city', label: 'City' },
      { key: 'barangay', label: 'Barangay' }
    ];

    requiredFields.forEach(({ key, label }) => {
      if (!formData[key as keyof FormData]?.trim()) {
        errors[key] = `${label} is required`;
        isValid = false;
      }
    });

    if (formData.middle_name.trim().length === 1) {
      errors.middle_name = 'Please enter complete middle name, not just an initial';
      isValid = false;
    }

    if (formData.birth_year && formData.birth_month && formData.birth_day) {
      const birthDate = new Date(
        parseInt(formData.birth_year),
        ['January', 'February', 'March', 'April', 'May', 'June', 'July', 
         'August', 'September', 'October', 'November', 'December']
          .indexOf(formData.birth_month),
        parseInt(formData.birth_day)
      );
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        errors.birth_year = 'Applicant must be 18 years or older';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!teamId || !formLinkId) {
      setError('Invalid form link');
      return;
    }

    if (!validateForm()) {
      setError('Please complete all required fields correctly');
      return;
    }

    setLoading(true);

    try {
      const submissionData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        team_id: teamId,
        form_link_id: formLinkId,
        created_at: new Date()
      };

      if (editingSubmission) {
        await updateDoc(doc(db, 'form_submissions', editingSubmission), {
          ...submissionData,
          updated_at: new Date()
        });
      } else {
        await addDoc(collection(db, 'form_submissions'), submissionData);
      }

      await loadPreviousSubmissions();
      setSuccess(true);
      setFormData(INITIAL_FORM_DATA);
      setFieldErrors({});
      setEditingSubmission(null);
      setActiveTab('submissions');
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (submission: any) => {
    setFormData({
      last_name: submission.last_name || '',
      first_name: submission.first_name || '',
      middle_name: submission.middle_name || '',
      extension_name: submission.extension_name || '',
      birth_month: submission.birth_month || '',
      birth_day: submission.birth_day || '',
      birth_year: submission.birth_year || '',
      sex: submission.sex || '',
      barangay: submission.barangay || '',
      psgc_city: submission.psgc_city || '',
      city: submission.city || '',
      province: submission.province || '',
      type_of_assistance: submission.type_of_assistance || '',
      amount: submission.amount?.toString() || '',
      philsys_number: submission.philsys_number || '',
      beneficiary_uniq: submission.beneficiary_uniq || '',
      contact_number: submission.contact_number || '',
      target_sector: submission.target_sector || '',
      sub_category: submission.sub_category || '',
      civil_status: submission.civil_status || ''
    });
    setEditingSubmission(submission.id);
    setSuccess(false);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingSubmission(null);
    setFieldErrors({});
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

  const filteredSubmissions = previousSubmissions.filter(submission => {
    if (!searchTerm) return true;
    
    const searchFields = [
      'last_name', 'first_name', 'middle_name', 'barangay', 
      'city', 'province', 'type_of_assistance'
    ];
    
    return searchFields.some(field => 
      submission[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-red-600 mb-4">
              Error
            </h2>
            <p className="text-gray-600 mb-8">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success && activeTab === 'form') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-green-600 mb-4">
              Application Submitted!
            </h2>
            <p className="text-gray-600 mb-8">
              Thank you for submitting your application. The team will review your information.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => setSuccess(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Submit Another Application
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Users className="w-5 h-5 mr-2" />
                View All Submissions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderFieldError = (fieldName: string) => {
    if (!fieldErrors[fieldName]) return null;
    return (
      <div className="mt-1 text-sm text-red-600 flex items-center">
        <AlertCircle className="w-4 h-4 mr-1" />
        {fieldErrors[fieldName]}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formLink?.name || 'Beneficiary Application Form'}
              </h2>
              {editingSubmission && (
                <p className="text-sm text-blue-600 mt-1">Editing existing submission</p>
              )}
            </div>
            
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                    activeTab === 'form'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Edit2 className="w-5 h-5 mr-2" />
                  Application Form
                </button>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                    activeTab === 'submissions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Previous Submissions
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.last_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('last_name')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      First Name<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.first_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('first_name')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Middle Name<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.middle_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('middle_name')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Extension Name</label>
                    <input
                      type="text"
                      name="extension_name"
                      value={formData.extension_name}
                      onChange={handleChange}
                      placeholder="Jr., Sr., III, etc."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Birth Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Birth Information<span className="text-red-600">*</span>
                  <span className="text-sm text-gray-500 ml-2">(Must be 18 years or older)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Birth Month<span className="text-red-600">*</span>
                    </label>
                    <select
                      name="birth_month"
                      value={formData.birth_month}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.birth_month ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Month</option>
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    {renderFieldError('birth_month')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Birth Day<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      name="birth_day"
                      value={formData.birth_day}
                      onChange={handleChange}
                      min="1"
                      max="31"
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.birth_day ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('birth_day')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Birth Year<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      name="birth_year"
                      value={formData.birth_year}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear() - 18}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.birth_year ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('birth_year')}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sex<span className="text-red-600">*</span>
                    </label>
                    <select
                      name="sex"
                      value={formData.sex}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.sex ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {renderFieldError('sex')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Civil Status<span className="text-red-600">*</span>
                    </label>
                    <select
                      name="civil_status"
                      value={formData.civil_status}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.civil_status ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Civil Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                    {renderFieldError('civil_status')}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Province<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.province ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('province')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('city')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Barangay<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.barangay ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {renderFieldError('barangay')}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Assistance Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assistance Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type of Assistance</label>
                    <input
                      type="text"
                      name="type_of_assistance"
                      value={formData.type_of_assistance}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Identification */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Identification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PhilSys Number</label>
                    <input
                      type="text"
                      name="philsys_number"
                      value={formData.philsys_number}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Beneficiary ID</label>
                    <input
                      type="text"
                      name="beneficiary_uniq"
                      value={formData.beneficiary_uniq}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Classification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Sector</label>
                    <input
                      type="text"
                      name="target_sector"
                      value={formData.target_sector}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                    <input
                      type="text"
                      name="sub_category"
                      value={formData.sub_category}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                {editingSubmission && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <X className="w-5 h-5 mr-2 inline" />
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {loading ? 'Submitting...' : editingSubmission ? 'Update Application' : 'Submit Application'}
                </button>
              </div>
            </form>
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
              </div>

              <div className="bg-white shadow overflow-x-auto rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                      <th 
                        onClick={() => handleSort('last_name')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      >
                        <div className="flex items-center">
                          <span>Name</span>
                          <span className="ml-2">
                            {sortConfig?.field === 'last_name' ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )
                            ) : null}
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th 
                        onClick={() => handleSort('type_of_assistance')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      >
                        <div className="flex items-center">
                          <span>Type of Assistance</span>
                          <span className="ml-2">
                            {sortConfig?.field === 'type_of_assistance' ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )
                            ) : null}
                          </span>
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('amount')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      >
                        <div className="flex items-center">
                          <span>Amount</span>
                          <span className="ml-2">
                            {sortConfig?.field === 'amount' ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )
                            ) : null}
                          </span>
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('created_at')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      >
                        <div className="flex items-center">
                          <span>Submitted</span>
                          <span className="ml-2">
                            {sortConfig?.field === 'created_at' ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )
                            ) : null}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(submission)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {`${submission.last_name}, ${submission.first_name} ${submission.middle_name}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.contact_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.type_of_assistance || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.amount ? `₱${submission.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.created_at.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {sortedSubmissions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
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
      </div>
    </div>
  );
}