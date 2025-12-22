/**
 * Validation Utilities for PVARA Frontend
 * Provides reusable validation functions for forms
 */

/**
 * Validates email format (RFC-compliant)
 * @param {string} email - Email address to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { isValid: false, error: 'Email is required' };
    }

    const trimmed = email.trim();
    if (!trimmed) {
        return { isValid: false, error: 'Email is required' };
    }

    // RFC 5322 simplified regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
        return { isValid: false, error: 'Please enter a valid email address' };
    }

    if (trimmed.length > 254) {
        return { isValid: false, error: 'Email address is too long' };
    }

    return { isValid: true, error: null };
}

/**
 * Validates phone number format
 * Accepts any phone number format with digits, spaces, dashes, plus signs, and parentheses
 * @param {string} phone - Phone number to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return { isValid: false, error: 'Phone number is required' };
    }

    const trimmed = phone.trim();
    if (!trimmed) {
        return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters for validation
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');

    // Just require at least 7 digits (minimum reasonable phone number length)
    if (digitsOnly.length < 7) {
        return {
            isValid: false,
            error: 'Phone number must have at least 7 digits'
        };
    }

    // Maximum 15 digits (international standard)
    if (digitsOnly.length > 15) {
        return {
            isValid: false,
            error: 'Phone number must not exceed 15 digits'
        };
    }

    return { isValid: true, error: null };
}

/**
 * Validates Pakistani CNIC format (xxxxx-xxxxxxx-x)
 * @param {string} cnic - CNIC to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateCNIC(cnic) {
    if (!cnic || typeof cnic !== 'string') {
        return { isValid: false, error: 'CNIC is required' };
    }

    const trimmed = cnic.trim();
    if (!trimmed) {
        return { isValid: false, error: 'CNIC is required' };
    }

    // Check format: xxxxx-xxxxxxx-x
    const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;

    if (!cnicRegex.test(trimmed)) {
        return {
            isValid: false,
            error: 'CNIC must be in format: 12345-1234567-1'
        };
    }

    // Extract digits only for additional validation
    const digits = trimmed.replace(/-/g, '');

    // Check if it's all zeros or obviously invalid
    if (digits === '0000000000000') {
        return { isValid: false, error: 'Please enter a valid CNIC' };
    }

    return { isValid: true, error: null };
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @param {boolean} required - Whether URL is required
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateURL(url, required = false) {
    if (!url || typeof url !== 'string') {
        return required
            ? { isValid: false, error: 'URL is required' }
            : { isValid: true, error: null };
    }

    const trimmed = url.trim();
    if (!trimmed) {
        return required
            ? { isValid: false, error: 'URL is required' }
            : { isValid: true, error: null };
    }

    try {
        const urlObj = new URL(trimmed);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return { isValid: false, error: 'URL must start with http:// or https://' };
        }
        return { isValid: true, error: null };
    } catch (e) {
        return { isValid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
    }
}

/**
 * Validates text length
 * @param {string} text - Text to validate
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum length
 * @param {number} options.max - Maximum length
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Name of field for error messages
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateTextLength(text, options = {}) {
    const {
        min = 0,
        max = Infinity,
        required = false,
        fieldName = 'Field'
    } = options;

    if (!text || typeof text !== 'string') {
        return required
            ? { isValid: false, error: `${fieldName} is required` }
            : { isValid: true, error: null };
    }

    const trimmed = text.trim();

    if (!trimmed) {
        return required
            ? { isValid: false, error: `${fieldName} is required` }
            : { isValid: true, error: null };
    }

    if (trimmed.length < min) {
        return {
            isValid: false,
            error: `${fieldName} must be at least ${min} character${min !== 1 ? 's' : ''}`
        };
    }

    if (trimmed.length > max) {
        return {
            isValid: false,
            error: `${fieldName} must not exceed ${max} character${max !== 1 ? 's' : ''}`
        };
    }

    return { isValid: true, error: null };
}

/**
 * Validates alphabetic text (letters and spaces only)
 * @param {string} text - Text to validate
 * @param {boolean} required - Whether field is required
 * @param {string} fieldName - Name of field for error messages
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateAlphabetic(text, required = false, fieldName = 'Field') {
    if (!text || typeof text !== 'string') {
        return required
            ? { isValid: false, error: `${fieldName} is required` }
            : { isValid: true, error: null };
    }

    const trimmed = text.trim();

    if (!trimmed) {
        return required
            ? { isValid: false, error: `${fieldName} is required` }
            : { isValid: true, error: null };
    }

    // Allow letters, spaces, and common name characters (apostrophes, hyphens)
    const alphaRegex = /^[a-zA-Z\s'-]+$/;

    if (!alphaRegex.test(trimmed)) {
        return {
            isValid: false,
            error: `${fieldName} should only contain letters, spaces, hyphens, and apostrophes`
        };
    }

    return { isValid: true, error: null };
}

/**
 * Validates number range
 * @param {number|string} value - Value to validate
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum value (inclusive)
 * @param {number} options.max - Maximum value (inclusive)
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Name of field for error messages
 * @param {boolean} options.allowFloat - Whether to allow decimal numbers
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateNumberRange(value, options = {}) {
    const {
        min = -Infinity,
        max = Infinity,
        required = false,
        fieldName = 'Value',
        allowFloat = false
    } = options;

    if (value === null || value === undefined || value === '') {
        return required
            ? { isValid: false, error: `${fieldName} is required` }
            : { isValid: true, error: null };
    }

    const num = Number(value);

    if (isNaN(num)) {
        return { isValid: false, error: `${fieldName} must be a valid number` };
    }

    if (!allowFloat && !Number.isInteger(num)) {
        return { isValid: false, error: `${fieldName} must be a whole number` };
    }

    if (num < min) {
        return { isValid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (num > max) {
        return { isValid: false, error: `${fieldName} must not exceed ${max}` };
    }

    return { isValid: true, error: null };
}

/**
 * Validates required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateRequired(value, fieldName = 'Field') {
    if (value === null || value === undefined) {
        return { isValid: false, error: `${fieldName} is required` };
    }

    if (typeof value === 'string' && !value.trim()) {
        return { isValid: false, error: `${fieldName} is required` };
    }

    if (Array.isArray(value) && value.length === 0) {
        return { isValid: false, error: `${fieldName} is required` };
    }

    return { isValid: true, error: null };
}

/**
 * Validates Pakistani postal code (5 digits)
 * @param {string} postalCode - Postal code to validate
 * @param {boolean} required - Whether field is required
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validatePostalCode(postalCode, required = false) {
    if (!postalCode || typeof postalCode !== 'string') {
        return required
            ? { isValid: false, error: 'Postal code is required' }
            : { isValid: true, error: null };
    }

    const trimmed = postalCode.trim();

    if (!trimmed) {
        return required
            ? { isValid: false, error: 'Postal code is required' }
            : { isValid: true, error: null };
    }

    const postalRegex = /^[0-9]{5}$/;

    if (!postalRegex.test(trimmed)) {
        return {
            isValid: false,
            error: 'Postal code must be 5 digits'
        };
    }

    return { isValid: true, error: null };
}

/**
 * Validates year (4-digit, not in future)
 * @param {number|string} year - Year to validate
 * @param {boolean} required - Whether field is required
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateYear(year, required = false) {
    if (!year || year === '') {
        return required
            ? { isValid: false, error: 'Year is required' }
            : { isValid: true, error: null };
    }

    const yearNum = Number(year);
    const currentYear = new Date().getFullYear();

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        return {
            isValid: false,
            error: `Year must be between 1900 and ${currentYear}`
        };
    }

    return { isValid: true, error: null };
}

/**
 * Validates username for admin/staff login
 * @param {string} username - Username to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { isValid: false, error: 'Username is required' };
    }

    const trimmed = username.trim();

    if (!trimmed) {
        return { isValid: false, error: 'Username is required' };
    }

    if (trimmed.length < 3) {
        return { isValid: false, error: 'Username must be at least 3 characters' };
    }

    if (trimmed.length > 50) {
        return { isValid: false, error: 'Username must not exceed 50 characters' };
    }

    // Allow alphanumeric, underscore, hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;

    if (!usernameRegex.test(trimmed)) {
        return {
            isValid: false,
            error: 'Username can only contain letters, numbers, hyphens, and underscores'
        };
    }

    return { isValid: true, error: null };
}
