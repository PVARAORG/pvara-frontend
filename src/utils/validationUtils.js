/**
 * Validation Utilities for Argaam Frontend
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
 * Accepts URLs with or without http:// or https:// prefix
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

    // Try parsing with protocol first
    try {
        const urlObj = new URL(trimmed);
        if (['http:', 'https:'].includes(urlObj.protocol)) {
            return { isValid: true, error: null };
        }
    } catch (e) {
        // URL doesn't have protocol, try adding one
    }

    // Try with https:// prefix added
    try {
        const urlWithProtocol = 'https://' + trimmed;
        const urlObj = new URL(urlWithProtocol);
        // Basic validation: must have a valid hostname with at least one dot
        if (urlObj.hostname && urlObj.hostname.includes('.')) {
            return { isValid: true, error: null };
        }
    } catch (e) {
        // Still invalid
    }

    // Fallback: check with a flexible regex for common URL patterns
    // Allows: domain.com, domain.com/path, www.domain.com, etc.
    const urlPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/;
    if (urlPattern.test(trimmed)) {
        return { isValid: true, error: null };
    }

    return { isValid: false, error: 'Please enter a valid URL (e.g., linkedin.com/in/username or example.com)' };
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

    if (trimmed.length < 2) {
        return { isValid: false, error: 'Username must be at least 2 characters' };
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

/**
 * Validates file upload for security
 * Checks for valid extensions, double extensions, and dangerous patterns
 * @param {File} file - File object to validate
 * @param {object} options - Validation options
 * @param {string[]} options.allowedExtensions - Array of allowed extensions (e.g., ['.pdf', '.doc', '.docx'])
 * @param {number} options.maxSizeBytes - Maximum file size in bytes
 * @param {string} options.fieldName - Name of field for error messages
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateFileUpload(file, options = {}) {
    const {
        allowedExtensions = ['.pdf', '.doc', '.docx'],
        maxSizeBytes = 5 * 1024 * 1024, // 5MB default
        fieldName = 'File'
    } = options;

    if (!file) {
        return { isValid: false, error: `${fieldName} is required` };
    }

    // Get filename
    const filename = file.name || '';
    const lowerFilename = filename.toLowerCase();

    // Check file size
    if (file.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
        return {
            isValid: false,
            error: `${fieldName} must be smaller than ${maxSizeMB}MB`
        };
    }

    // Dangerous extension patterns to reject
    const dangerousPatterns = [
        '.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.phar',
        '.exe', '.sh', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.jar',
        '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb', '.htaccess'
    ];

    // Check for dangerous patterns anywhere in filename (catches double extensions like .php.docx)
    for (const pattern of dangerousPatterns) {
        if (lowerFilename.includes(pattern)) {
            return {
                isValid: false,
                error: `${fieldName} contains an invalid or dangerous file pattern`
            };
        }
    }

    // Get file extension (last part after final dot)
    const parts = lowerFilename.split('.');
    if (parts.length < 2) {
        return {
            isValid: false,
            error: `${fieldName} must have a valid extension`
        };
    }

    const extension = '.' + parts[parts.length - 1];

    // Check if extension is allowed
    const normalizedAllowed = allowedExtensions.map(ext => ext.toLowerCase());
    if (!normalizedAllowed.includes(extension)) {
        return {
            isValid: false,
            error: `${fieldName} must be one of: ${allowedExtensions.join(', ')}`
        };
    }

    // Check for double extensions (e.g., file.pdf.exe, file.docx.php)
    // If there are more than 2 parts and any middle part looks like an extension
    if (parts.length > 2) {
        const possibleExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', ...dangerousPatterns];
        for (let i = 1; i < parts.length - 1; i++) {
            const middlePart = '.' + parts[i];
            if (possibleExtensions.includes(middlePart)) {
                return {
                    isValid: false,
                    error: `${fieldName} appears to have multiple extensions which is not allowed`
                };
            }
        }
    }

    return { isValid: true, error: null };
}
