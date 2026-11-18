import sanitizeHtml from 'sanitize-html';

// Matches the formats the editor allows. Everything else is stripped, keeping its text.
// Applied to every stored body: editor saves and imported files alike.
const options: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
  allowedAttributes: {},
  transformTags: { b: 'strong', i: 'em', h4: 'h3', h5: 'h3', h6: 'h3' },
};

export function sanitize(html: string): string {
  return sanitizeHtml(html, options);
}
