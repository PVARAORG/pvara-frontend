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
    <div className="space-y-3">
      <div className="text-xs uppercase font-semibold text-gray-500 mb-2">Staff Login</div>
      <div>
        <input
          placeholder="Username"
          className={`border p-2 rounded w-full text-sm ${touched.username && errors.username ? 'border-red-500' :
            touched.username && !errors.username ? 'border-green-500' : ''
            }`}
          value={username}
          onChange={handleUsernameChange}
          onBlur={() => handleBlur('username')}
        />
        {touched.username && errors.username && (
          <p className="text-xs text-red-600 mt-1">{errors.username}</p>
        )}
      </div>

      <div>
        <input
          placeholder="Password"
          type="password"
          className={`border p-2 rounded w-full text-sm ${touched.password && errors.password ? 'border-red-500' :
            touched.password && !errors.password ? 'border-green-500' : ''
            }`}
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur('password')}
        />
        {touched.password && errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password}</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className={`w-full bg-green-600 text-white px-4 py-2 rounded text-sm font-medium ${!isValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
          }`}
      >
        Login
      </button>
    </div>
  );
}
