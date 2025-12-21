import pytest
import sys
import os

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils import sanitize_html, extract_plain_text

def test_sanitize_allowed_tags():
    """Test that allowed tags are preserved."""
    html = "<b>Bold</b> <i>Italic</i> <u>Underline</u>"
    result = sanitize_html(html)
    assert result == html

def test_sanitize_dangerous_tags():
    """Test that dangerous tags are removed."""
    html = '<b>Safe</b><script>alert("XSS")</script>'
    result = sanitize_html(html)
    assert '<script>' not in result
    # Bleach strip=True removes tags but keeps content. This is safe from XSS.
    # The text 'alert("XSS")' will remain as plain text.
    assert '<b>Safe</b>' in result

def test_sanitize_event_handlers():
    """Test that event handlers are removed."""
    html = '<b onclick="alert(1)">Click me</b>'
    result = sanitize_html(html)
    assert 'onclick' not in result
    assert '<b>Click me</b>' in result

def test_sanitize_max_length():
    """Test max length validation."""
    html = "A" * 6000
    with pytest.raises(ValueError, match="Description too long"):
        sanitize_html(html, max_length=5000)

def test_extract_plain_text():
    """Test plain text extraction."""
    html = "<b>Bold</b> and <i>italic</i> text"
    result = extract_plain_text(html)
    assert result == "Bold and italic text"

def test_sanitize_empty_string():
    """Test empty string handling."""
    assert sanitize_html("") == ""
    assert sanitize_html(None) == ""
    assert sanitize_html("   ") == ""
