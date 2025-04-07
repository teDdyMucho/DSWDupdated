import React, { useState } from 'react';
import { Login } from './Login';
import { Register } from './Register';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          Beneficiary Data Management
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Team-based system for managing beneficiary data
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLogin ? (
            <Login onToggleForm={toggleForm} />
          ) : (
            <Register onToggleForm={toggleForm} />
          )}
        </div>
      </div>
    </div>
  );
}
