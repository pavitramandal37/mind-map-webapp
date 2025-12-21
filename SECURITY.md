# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email: pavitramandal37@gmail.com

## Implemented Security Measures

### 1. HTML Sanitization
- **Frontend**: DOMPurify (v3.0.6)
- **Backend**: Bleach (v6.1.0)
- **Allowed tags**: Limited to `<b>`, `<i>`, `<u>`, `<s>`, `<strong>`, `<em>`, `<br>` only.

### 2. Input Validation
- Maximum description length: 5000 characters
- JSON structure validation
- Recursive node validation

### 3. XSS Prevention
- All user HTML is sanitized before storage
- No event handlers allowed
- No script tags allowed
- No dangerous attributes

### 4. Authentication
- JWT tokens (30-minute expiry)
- Bcrypt password hashing
- Rate limiting on login/signup

## Testing for XSS

To verify sanitization works:

1. Attempt to create node with: `<script>alert('XSS')</script>`
2. Should be stripped or escaped
3. Attempt: `<img src=x onerror="alert('XSS')">`
4. Should remove onerror handler

## Dependencies

- Keep DOMPurify updated: `npm update dompurify`
- Keep Bleach updated: `pip install --upgrade bleach`
