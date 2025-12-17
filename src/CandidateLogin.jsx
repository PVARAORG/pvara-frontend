import React, { useState } from "react";
import { validateCNIC, validatePhone, validateEmail } from "./utils/validationUtils";

export default function CandidateLogin({ onLogin, onCancel }) {
  const [cnic, setCnic] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleCnicChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
    if (val.length > 15) val = val.slice(0, 15);
    setCnic(val);

    if (touched.cnic) {
      const validation = validateCNIC(val);
      setErrors(prev => ({ ...prev, cnic: validation.error }));
    }
  };

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);

    if (touched.phone) {
      const validation = validatePhone(e.target.value);
      setErrors(prev => ({ ...prev, phone: validation.error }));
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);

    if (touched.email) {
      const validation = validateEmail(e.target.value);
      setErrors(prev => ({ ...prev, email: validation.error }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    if (field === 'cnic') {
      const validation = validateCNIC(cnic);
      setErrors(prev => ({ ...prev, cnic: validation.error }));
    } else if (field === 'phone') {
      const validation = validatePhone(phone);
      setErrors(prev => ({ ...prev, phone: validation.error }));
    } else if (field === 'email') {
      const validation = validateEmail(email);
      setErrors(prev => ({ ...prev, email: validation.error }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate CNIC
    const cnicValidation = validateCNIC(cnic);

    // Validate verification field
    const verificationValue = verificationMethod === "phone" ? phone : email;
    const verificationValidation = verificationMethod === "phone"
      ? validatePhone(verificationValue)
      : validateEmail(verificationValue);

    const newErrors = {
      cnic: cnicValidation.error,
      [verificationMethod]: verificationValidation.error
    };

    setErrors(newErrors);
    setTouched({ cnic: true, [verificationMethod]: true });

    // If any errors, don't submit
    if (newErrors.cnic || newErrors[verificationMethod]) {
      return;
    }

    onLogin({
      cnic,
      [verificationMethod]: verificationValue
    });
  };

  const isValid = !errors.cnic &&
    !errors[verificationMethod] &&
    cnic &&
    (verificationMethod === "phone" ? phone : email);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Track Applications</h1>
          <p className="text-gray-600">Access your application status using your CNIC</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CNIC Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CNIC (National Identity Card) *
            </label>
            <input
              type="text"
              value={cnic}
              onChange={handleCnicChange}
              onBlur={() => handleBlur('cnic')}
              placeholder="12345-1234567-1"
              maxLength="15"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-200 transition font-mono text-lg ${touched.cnic && errors.cnic ? 'border-red-500 focus:border-red-500' :
                  touched.cnic && !errors.cnic ? 'border-green-500 focus:border-green-500' :
                    'border-gray-300 focus:border-green-500'
                }`}
              required
            />
            {touched.cnic && errors.cnic ? (
              <p className="text-sm text-red-600 mt-1">{errors.cnic}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Format: xxxxx-xxxxxxx-x</p>
            )}
          </div>

          {/* Verification Method Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Verify with *
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setVerificationMethod("phone");
                  setErrors(prev => ({ ...prev, email: null }));
                  setTouched(prev => ({ ...prev, email: false }));
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${verificationMethod === "phone"
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Phone Number
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationMethod("email");
                  setErrors(prev => ({ ...prev, phone: null }));
                  setTouched(prev => ({ ...prev, phone: false }));
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${verificationMethod === "email"
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Email
              </button>
            </div>

            {/* Verification Input */}
            {verificationMethod === "phone" ? (
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => handleBlur('phone')}
                  placeholder="0300-1234567"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-200 transition ${touched.phone && errors.phone ? 'border-red-500 focus:border-red-500' :
                      touched.phone && !errors.phone ? 'border-green-500 focus:border-green-500' :
                        'border-gray-300 focus:border-green-500'
                    }`}
                  required
                />
                {touched.phone && errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="your.email@example.com"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-200 transition ${touched.email && errors.email ? 'border-red-500 focus:border-red-500' :
                      touched.email && !errors.email ? 'border-green-500 focus:border-green-500' :
                        'border-gray-300 focus:border-green-500'
                    }`}
                  required
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${isValid
                ? 'bg-green-700 text-white hover:bg-green-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Access My Applications
          </button>

          {/* Cancel Button */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Back to Jobs
            </button>
          )}
        </form>

        {/* Info Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Why CNIC?</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Secure access to all your applications</li>
            <li>• Works with any email you used to apply</li>
            <li>• No password to remember</li>
            <li>• Prevents duplicate profiles</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

