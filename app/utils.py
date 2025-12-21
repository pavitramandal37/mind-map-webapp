import bleach
from typing import Optional

# Allowed HTML tags for rich text descriptions
ALLOWED_TAGS = ['b', 'i', 'u', 's', 'strong', 'em', 'br']
ALLOWED_ATTRIBUTES = {}  # No attributes allowed (prevents onclick, onerror, etc.)

def sanitize_html(html_content: Optional[str], max_length: int = 5000) -> str:
    """
    Sanitize HTML content to prevent XSS attacks.
    
    Args:
        html_content: Raw HTML string from user input
        max_length: Maximum allowed length (default 5000 characters)
    
    Returns:
        Sanitized HTML string
    
    Raises:
        ValueError: If content exceeds max_length
    """
    if not html_content:
        return ""
    
    # Remove leading/trailing whitespace
    html_content = html_content.strip()
    
    # Check length before sanitization
    if len(html_content) > max_length:
        raise ValueError(f"Description too long. Maximum {max_length} characters allowed.")
    
    # Sanitize HTML - removes all dangerous tags and attributes
    cleaned = bleach.clean(
        html_content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True  # Remove disallowed tags instead of escaping
    )
    
    # Bleach might add extra whitespace, clean it up
    cleaned = cleaned.strip()
    
    return cleaned


def extract_plain_text(html_content: str) -> str:
    """
    Extract plain text from HTML (for search/indexing).
    
    Args:
        html_content: HTML string
    
    Returns:
        Plain text with HTML tags removed
    """
    if not html_content:
        return ""
    
    # Remove all HTML tags
    plain = bleach.clean(html_content, tags=[], strip=True)
    return plain.strip()
