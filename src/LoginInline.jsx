import React, { useState } from "react";
import { validateUsername, validateRequired } from "./utils/validationUtils";
import { useAuth } from "./AuthContext";

export default function LoginInline({ onLogin }) {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSubmit = async () => {
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

    setIsLoading(true);
    const result = await onLogin({ username: username.trim(), password });
    setIsLoading(false);

    // If 2FA not required and login successful, onLogin handles it
    // If 2FA required, AuthContext sets pending2FA state
  };

  const handleVerify2FA = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors(prev => ({ ...prev, otp: "Please enter 6-digit code" }));
      return;
    }

    setIsLoading(true);
    const result = await auth.verify2FA(otpCode);
    setIsLoading(false);

    if (!result.ok) {
      setErrors(prev => ({ ...prev, otp: result.message }));
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    const result = await auth.resendOTP();
    setResendLoading(false);
    if (result.ok) {
      setErrors(prev => ({ ...prev, otp: null }));
    }
  };

  const handleCancel2FA = () => {
    auth.cancelPending2FA();
    setOtpCode("");
    setErrors({});
  };

  const isValid = !errors.username && !errors.password && username && password;

  // Show 2FA OTP input if pending
  if (auth.pending2FA) {
    return (
      <div className="space-y-4">
        <div className="text-xs uppercase font-semibold text-green-700 mb-2 tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          2FA Verification
        </div>

        <div className="text-xs text-gray-600 mb-3">
          Enter the 6-digit code sent to your email
        </div>

        <div>
          <input
            placeholder="000000"
            className={`border-2 px-4 py-3 rounded-lg w-full text-center text-lg font-mono tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-green-200 ${errors.otp
              ? 'border-red-400 bg-red-50 focus:border-red-500'
              : 'border-gray-200 focus:border-green-500'
              }`}
            value={otpCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtpCode(val);
              setErrors(prev => ({ ...prev, otp: null }));
            }}
            maxLength={6}
            autoFocus
          />
          {errors.otp && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errors.otp}
            </p>
          )}
        </div>

        <button
          onClick={handleVerify2FA}
          disabled={isLoading || otpCode.length !== 6}
          className={`w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all ${isLoading || otpCode.length !== 6
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:from-green-700 hover:to-emerald-700 hover:shadow-md'
            }`}
        >
          {isLoading ? "Verifying..." : "Verify Code"}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button
            onClick={handleResendOTP}
            disabled={resendLoading}
            className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
          >
            {resendLoading ? "Sending..." : "Resend Code"}
          </button>
          <button
            onClick={handleCancel2FA}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wide">Staff Login</div>
      <div>
        <input
          placeholder="Username"
          className={`border-2 px-4 py-2.5 rounded-lg w-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-200 ${touched.username && errors.username
            ? 'border-red-400 bg-red-50 focus:border-red-500'
            : touched.username && !errors.username
              ? 'border-green-400 focus:border-green-500'
              : 'border-gray-200 focus:border-green-500'
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
        <div className="relative">
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            className={`border-2 px-4 py-2.5 pr-10 rounded-lg w-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-200 ${touched.password && errors.password
              ? 'border-red-400 bg-red-50 focus:border-red-500'
              : touched.password && !errors.password
                ? 'border-green-400 focus:border-green-500'
                : 'border-gray-200 focus:border-green-500'
              }`}
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleBlur('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        {touched.password && errors.password && (
          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {errors.password}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className={`w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all ${!isValid || isLoading
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:from-green-700 hover:to-emerald-700 hover:shadow-md'
          }`}
      >
        {isLoading ? "Signing in..." : "Login"}
      </button>
    </div>
  );
}
