import React, { useState } from "react";
import { validateUsername, validateRequired } from "./utils/validationUtils";

export default function LoginInline({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);

    if (touched.username) {
      const validation = validateUsername(value);
      setErrors(prev => ({ ...prev, username: validation.error }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    if (touched.password) {
      const validation = validateRequired(value, 'Password');
      setErrors(prev => ({ ...prev, password: validation.error }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    if (field === 'username') {
      const validation = validateUsername(username);
      setErrors(prev => ({ ...prev, username: validation.error }));
    } else if (field === 'password') {
      const validation = validateRequired(password, 'Password');
      setErrors(prev => ({ ...prev, password: validation.error }));
    }
  };

  const handleSubmit = () => {
    // Validate all fields
    const usernameValidation = validateUsername(username);
    const passwordValidation = validateRequired(password, 'Password');

    const newErrors = {
      username: usernameValidation.error,
      password: passwordValidation.error
    };

    setErrors(newErrors);
    setTouched({ username: true, password: true });

    // If any errors, don't submit
    if (newErrors.username || newErrors.password) {
      return;
    }

    onLogin({ username: username.trim(), password });
  };

  const isValid = !errors.username && !errors.password && username && password;

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wide">Staff Login</div>
      <div>
        <input
          placeholder="Username"
          className={`border-2 px-4 py-2.5 rounded-lg w-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-200 ${touched.username && errors.username
              ? 'border-red-400 bg-red-50 focus:border-red-500'
              : touched.username && !errors.username
                ? 'border-orange-400 focus:border-orange-500'
                : 'border-gray-200 focus:border-orange-500'
            }`}
          value={username}
          onChange={handleUsernameChange}
          onBlur={() => handleBlur('username')}
        />
        {touched.username && errors.username && (
          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {errors.username}
          </p>
        )}
      </div>

      <div>
        <input
          placeholder="Password"
          type="password"
          className={`border-2 px-4 py-2.5 rounded-lg w-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-200 ${touched.password && errors.password
              ? 'border-red-400 bg-red-50 focus:border-red-500'
              : touched.password && !errors.password
                ? 'border-orange-400 focus:border-orange-500'
                : 'border-gray-200 focus:border-orange-500'
            }`}
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur('password')}
        />
        {touched.password && errors.password && (
          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {errors.password}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className={`w-full bg-gradient-to-r from-orange-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all ${!isValid
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:from-orange-700 hover:to-emerald-700 hover:shadow-md'
          }`}
      >
        Login
      </button>
    </div>
  );
}
