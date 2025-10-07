import DOMPurify from 'dompurify';
import React from 'react';

/**
 * Safely parses HTML string and returns React elements
 * Handles <em> tags for highlighting by splitting the text and rendering highlighted parts
 */
export function parseHtmlToReact(htmlString: string): React.ReactNode {
    if (!htmlString) return null;

    // First sanitize the HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(htmlString, {
        ALLOWED_TAGS: ['em', 'mark', 'strong', 'b', 'i', 'u'],
        ALLOWED_ATTR: []
    });

    // If the sanitized HTML doesn't contain any tags, return as plain text
    if (!/<[^>]*>/.test(sanitizedHtml)) {
        return sanitizedHtml;
    }

    // Parse the HTML and convert to React elements
    return parseHtmlString(sanitizedHtml);
}

/**
 * Recursively parses HTML string and converts to React elements
 */
function parseHtmlString(html: string): React.ReactNode {
    // Simple regex to match HTML tags
    const tagRegex = /<(\/?)([a-zA-Z]+)([^>]*)>/g;
    const parts: (string | { tag: string; attrs: Record<string, string>; content: string })[] = [];

    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
        const [fullMatch, isClosing, tagName, attrs] = match;
        const beforeTag = html.slice(lastIndex, match.index);

        if (beforeTag) {
            parts.push(beforeTag);
        }

        if (!isClosing) {
            // Parse attributes
            const attributes: Record<string, string> = {};
            const attrRegex = /(\w+)=["']([^"']*)["']/g;
            let attrMatch;
            while ((attrMatch = attrRegex.exec(attrs)) !== null) {
                attributes[attrMatch[1]] = attrMatch[2];
            }

            // Find the closing tag
            const closingTag = `</${tagName}>`;
            const closingIndex = html.indexOf(closingTag, match.index + fullMatch.length);

            if (closingIndex !== -1) {
                const content = html.slice(match.index + fullMatch.length, closingIndex);
                parts.push({ tag: tagName, attrs: attributes, content });
                lastIndex = closingIndex + closingTag.length;
            } else {
                // Self-closing tag or no closing tag found
                parts.push({ tag: tagName, attrs: attributes, content: '' });
                lastIndex = match.index + fullMatch.length;
            }
        } else {
            lastIndex = match.index + fullMatch.length;
        }
    }

    // Add remaining text
    const remaining = html.slice(lastIndex);
    if (remaining) {
        parts.push(remaining);
    }

    // Convert parts to React elements
    return parts.map((part, index) => {
        if (typeof part === 'string') {
            return part;
        }

        const { tag, attrs, content } = part;
        const children = parseHtmlString(content);

        switch (tag.toLowerCase()) {
            case 'em':
                return React.createElement('em', { key: index, ...attrs }, children);
            case 'mark':
                return React.createElement('mark', { key: index, ...attrs }, children);
            case 'strong':
            case 'b':
                return React.createElement('strong', { key: index, ...attrs }, children);
            case 'i':
                return React.createElement('i', { key: index, ...attrs }, children);
            case 'u':
                return React.createElement('u', { key: index, ...attrs }, children);
            default:
                // For unsupported tags, just return the content
                return children;
        }
    });
}

