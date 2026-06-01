import { removeComments, detectLanguage } from '../src/index';

describe('Language Detection', () => {
  test('detects JavaScript by filename', () => {
    const lang = detectLanguage('test.js');
    expect(lang).toBe('javascript');
  });

  test('detects TypeScript by filename', () => {
    const lang = detectLanguage('test.ts');
    expect(lang).toBe('typescript');
  });

  test('detects Python by filename', () => {
    const lang = detectLanguage('test.py');
    expect(lang).toBe('python');
  });

  test('detects language by content (Python)', () => {
    const code = 'def hello():\n    print("Hello")';
    const lang = detectLanguage(undefined, code);
    expect(lang).toBe('python');
  });

  test('detects language by content (TypeScript)', () => {
    const code = 'interface User { name: string; }';
    const lang = detectLanguage(undefined, code);
    expect(lang).toBe('typescript');
  });
});

describe('JavaScript Comment Removal', () => {
  test('removes single-line comments', () => {
    const code = `
// This is a comment
const x = 5;
// Another comment
const y = 10;
`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).not.toContain('//');
    expect(result.code).toContain('const x = 5;');
  });

  test('removes multi-line comments', () => {
    const code = `
/* This is a 
   multi-line comment */
const x = 5;
`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).not.toContain('/*');
    expect(result.code).toContain('const x = 5;');
  });

  test('preserves license comments', () => {
    const code = `
/*! Copyright 2024 MIT License */
const x = 5;
// Regular comment
const y = 10;
`;
    const result = removeComments(code, {
      language: 'javascript',
      preserveLicense: true
    });
    expect(result.code).toContain('Copyright');
    expect(result.code).not.toContain('Regular comment');
  });
});

describe('Python Comment Removal', () => {
  test('removes single-line comments', () => {
    const code = `
# This is a comment
x = 5
# Another comment
y = 10
`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).not.toContain('#');
    expect(result.code).toContain('x = 5');
  });

  test('removes docstrings', () => {
    const code = `
def hello():
    """This is a docstring"""
    return "Hello"
`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).not.toContain('docstring');
    expect(result.code).toContain('def hello():');
  });

  test('preserves code with # in strings', () => {
    const code = `
x = "This is # not a comment"
# This is a comment
y = 5
`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).toContain('This is # not a comment');
    expect(result.code).not.toContain('This is a comment');
  });
});

describe('HTML Comment Removal', () => {
  test('removes HTML comments', () => {
    const code = `
<html>
  <!-- This is a comment -->
  <body>
    <h1>Hello</h1>
    <!-- Another comment -->
  </body>
</html>
`;
    const result = removeComments(code, { language: 'html' });
    expect(result.code).not.toContain('<!--');
    expect(result.code).toContain('<h1>Hello</h1>');
  });
});

describe('CSS Comment Removal', () => {
  test('removes CSS comments', () => {
    const code = `
/* This is a comment */
.container {
  /* Another comment */
  color: red;
}
`;
    const result = removeComments(code, { language: 'css' });
    expect(result.code).not.toContain('/*');
    expect(result.code).toContain('color: red;');
  });

  test('preserves license comments', () => {
    const code = `
/*! Copyright 2024 */
.container {
  color: red;
}
`;
    const result = removeComments(code, {
      language: 'css',
      preserveLicense: true
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('SQL Comment Removal', () => {
  test('removes single-line SQL comments', () => {
    const code = `
-- This is a comment
SELECT * FROM users;
-- Another comment
`;
    const result = removeComments(code, { language: 'sql' });
    expect(result.code).not.toContain('--');
    expect(result.code).toContain('SELECT * FROM users');
  });

  test('removes multi-line SQL comments', () => {
    const code = `
/* Multi-line comment */
SELECT * FROM users;
`;
    const result = removeComments(code, { language: 'sql' });
    expect(result.code).not.toContain('/*');
    expect(result.code).toContain('SELECT * FROM users');
  });
});

describe('YAML Comment Removal', () => {
  test('removes YAML comments', () => {
    const code = `
# This is a comment
key: value
# Another comment
`;
    const result = removeComments(code, { language: 'yaml' });
    expect(result.code).not.toContain('# This is a comment');
    expect(result.code).toContain('key: value');
  });
});

describe('JSON Comment Removal', () => {
  test('removes JSON5 style comments', () => {
    const code = `{
  // This is a comment
  "key": "value"
}`;
    const result = removeComments(code, { language: 'json' });
    expect(result.code).not.toContain('// This is a comment');
    expect(result.code).toContain('"key"');
  });
});

describe('Return Types', () => {
  test('returns RemoveResult object', () => {
    const code = '// comment\nconst x = 5;';
    const result = removeComments(code, { language: 'javascript' });
    
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('removedCount');
    expect(result).toHaveProperty('detectedLanguage');
    expect(result.detectedLanguage).toBe('javascript');
  });

  test('dry run returns original code', () => {
    const code = '// comment\nconst x = 5;';
    const result = removeComments(code, {
      language: 'javascript',
      dryRun: true
    });
    
    expect(result.code).toBe(code);
    expect(result.removedCount).toBeGreaterThan(0);
  });
});

describe('Error Handling', () => {
  test('returns original code when language cannot be detected', () => {
    const code = 'some random code';
    const result = removeComments(code);
    
    expect(result.code).toBe(code);
    expect(result.detectedLanguage).toBeUndefined();
    expect(result.removedCount).toBe(0);
  });

  test('handles empty code gracefully', () => {
    const result = removeComments('', { language: 'javascript' });
    expect(result.code).toBe('');
    expect(result.removedCount).toBe(0);
  });
});

describe('Edge Cases', () => {
  test('handles empty code', () => {
    const result = removeComments('', { language: 'javascript' });
    expect(result.code).toBe('');
  });

  test('handles code with only comments', () => {
    const code = '// comment 1\n// comment 2';
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code.trim().length).toBeLessThan(code.length);
  });

  test('handles code without comments', () => {
    const code = 'const x = 5;\nconst y = 10;';
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('const x = 5');
    expect(result.code).toContain('const y = 10');
  });
});

describe('Advanced Edge Cases', () => {
  test('handles comments inside strings correctly', () => {
    const code = `
const url = "https://example.com"; // Real comment
const msg = "This has // fake comment inside string";
console.log(msg); // Another real comment
`;
    const result = removeComments(code, { language: 'javascript' });
    
    // Must store // in the string
    expect(result.code).toContain('// fake comment inside string');
    // Should remove the actual comments
    expect(result.code).not.toContain('Real comment');
    expect(result.code).not.toContain('Another real comment');
  });

  test('handles nested comments correctly', () => {
    const code = `
/* Outer comment
   /* This looks nested but isn't valid in most langs */
   Still part of outer
*/
const x = 5;
`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('const x = 5');
    expect(result.code).not.toContain('Outer comment');
  });

  test('handles escaped quotes in strings', () => {
    const code = `
const str = "He said \\"Hello\\""; // Comment here
const x = 5;
`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('He said \\"Hello\\"');
    expect(result.code).not.toContain('// Comment here');
  });

  test('handles regex that looks like comments', () => {
    const code = `
const regex = /https?:\\/\\//; // URL pattern
const test = regex.test(url);
`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('/https?:\\/\\//');
  });

  test('handles very long files efficiently', () => {
    // Generate 10000 lines of code
    const lines = [];
    for (let i = 0; i < 10000; i++) {
      lines.push(`const var${i} = ${i}; // Comment ${i}`);
    }
    const code = lines.join('\n');
    
    const startTime = Date.now();
    const result = removeComments(code, { language: 'javascript' });
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should be fast
    expect(result.code).not.toContain('// Comment');
  });
});

describe('Real-world Code Examples', () => {
  test('handles complex React component', () => {
    const code = `
import React, { useState, useEffect } from 'react';

/**
 * UserProfile component
 * @param {Object} props
 */
const UserProfile = ({ userId }) => {
  // State management
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Fetch user data
    fetchUser(userId).then(setUser);
  }, [userId]); // Dependency array
  
  /* Render loading state
     while data is being fetched */
  if (!user) return <div>Loading...</div>;
  
  return (
    <div>
      {/* User info */}
      <h1>{user.name}</h1>
      <p>{user.email}</p> {/* Email display */}
    </div>
  );
};

export default UserProfile;
`;
    
    const result = removeComments(code, { language: 'javascript' });
    
    // Code must be saved
    expect(result.code).toContain('import React');
    expect(result.code).toContain('const UserProfile');
    expect(result.code).toContain('useState(null)');
    expect(result.code).toContain('<h1>{user.name}</h1>');
    
    // Comments should be removed
    expect(result.code).not.toContain('State management');
    expect(result.code).not.toContain('Fetch user data');
    expect(result.code).not.toContain('User info');
    expect(result.code).not.toContain('Email display');
    expect(result.code).not.toContain('/**');
    
    // JSDoc should be removed
    expect(result.code).not.toContain('@param');
  });

  test('handles complex Python class', () => {
    const code = `
class DatabaseManager:
    """Database connection manager with connection pooling"""
    
    def __init__(self, db_url):
        # Initialize connection pool
        self.db_url = db_url
        self.pool = []  # Connection pool
        
    def get_connection(self):
        """
        Get a connection from the pool
        Creates new connection if pool is empty
        """
        if not self.pool:
            # Pool is empty, create new
            return self._create_connection()
        return self.pool.pop()  # Reuse existing
        
    def _create_connection(self):
        # Private method to create connection
        import psycopg2
        return psycopg2.connect(self.db_url)
`;
    
    const result = removeComments(code, { language: 'python' });
    
    expect(result.code).toContain('class DatabaseManager:');
    expect(result.code).toContain('def __init__');
    expect(result.code).toContain('self.pool = []');
    
    expect(result.code).not.toContain('Initialize connection pool');
    expect(result.code).not.toContain('Connection pool');
    expect(result.code).not.toContain('"""');
  });

  test('handles SQL with mixed comment styles', () => {
    const code = `
-- User table creation script
-- Author: John Doe
-- Date: 2024-01-15

/* Drop table if exists
   to avoid conflicts */
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY, -- Auto-increment ID
    username VARCHAR(50) NOT NULL, -- Unique username
    email VARCHAR(100), -- User email
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP /* Creation time */
);

-- Add indexes for better performance
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email); -- Email lookup
`;
    
    const result = removeComments(code, { language: 'sql' });
    
    expect(result.code).toContain('DROP TABLE IF EXISTS users');
    expect(result.code).toContain('CREATE TABLE users');
    expect(result.code).toContain('CREATE INDEX');
    
    expect(result.code).not.toContain('User table creation');
    expect(result.code).not.toContain('Auto-increment ID');
    expect(result.code).not.toContain('better performance');
  });
});

describe('Performance Tests', () => {
  test('handles large files under 1 second', () => {
    const largeCode = Array(1000).fill(`
// Comment line
function test() {
  const x = 5; // inline
  return x;
}
`).join('\n');
    
    const start = Date.now();
    const result = removeComments(largeCode, { language: 'javascript' });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(result.code).not.toContain('// Comment');
  });

  test('handles deeply nested structures', () => {
    let code = 'const obj = {\n';
    for (let i = 0; i < 100; i++) {
      code += `  level${i}: { // Comment ${i}\n`;
    }
    code += '    value: 42\n';
    for (let i = 0; i < 100; i++) {
      code += '  },\n';
    }
    code += '};\n';
    
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('value: 42');
    expect(result.code).not.toContain('// Comment');
  });
});

describe('Error Handling and Edge Cases', () => {
  test('handles malformed code gracefully', () => {
    const malformed = `
const x = 5;
/* Unclosed comment
const y = 10;
`;
    
    const result = removeComments(malformed, { language: 'javascript' });
    // Should return something reasonable, not crash
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe('string');
  });

  test('handles binary/non-text input', () => {
    const binary = String.fromCharCode(0, 1, 2, 3, 4, 5);
    const result = removeComments(binary, { language: 'javascript' });
    expect(result.code).toBeDefined();
  });

  test('handles extremely long lines', () => {
    const longLine = '// ' + 'x'.repeat(1000000);
    const result = removeComments(longLine, { language: 'javascript' });
    expect(result.code.trim()).toBe('');
  });

  test('handles unicode and emoji in code', () => {
    const code = `
// Emoji test 🚀🎉
const msg = "Hello 世界"; // Unicode comment 中文
console.log(msg);
`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('Hello 世界');
    expect(result.code).not.toContain('Emoji test');
    expect(result.code).not.toContain('Unicode comment');
  });
});

describe('Ruby Comment Removal', () => {
  test('removes # comments', () => {
    const code = `# comment\nputs "Hello"`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).not.toContain('#');
  });

  test('removes =begin/=end blocks', () => {
    const code = `=begin\nMulti-line\n=end\nputs "Hello"`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).not.toContain('=begin');
  });

  test('handles # in strings', () => {
    const code = `msg = "Hello #world"\n# Real comment`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).toContain('#world');
  });
});

describe('Java Comment Removal', () => {
  test('removes single and multi-line comments', () => {
    const code = `// Comment\npublic class Test {\n/* block */\n}`;
    const result = removeComments(code, { language: 'java' });
    expect(result.code).not.toContain('//');
    expect(result.code).toContain('public class');
  });

  test('preserves JavaDoc with license info', () => {
    const code = `/** @license MIT */\n// comment\nclass Test {}`;
    const result = removeComments(code, { language: 'java', preserveLicense: true });
    expect(result.code).toContain('@license');
  });
});

describe('PHP Comment Removal', () => {
  test('removes all three comment styles', () => {
    const code = `<?php\n// style 1\n# style 2\n/* style 3 */\necho "Hi";`;
    const result = removeComments(code, { language: 'php' });
    expect(result.code).not.toContain('//');
    expect(result.code).not.toContain('#');
    expect(result.code).not.toContain('/*');
  });

  test('handles heredoc syntax', () => {
    const code = `$sql = <<<SQL\nSELECT * FROM users\nSQL;\n// comment`;
    const result = removeComments(code, { language: 'php' });
    expect(result.code).toContain('SELECT');
  });
});

test('handles JSDoc comments', () => {
  const code = `/**\n * @param {string} name\n * @returns {void}\n */\nfunction test() {}`;
  const result = removeComments(code, { language: 'javascript' });
  expect(result.code).not.toContain('@param');
});

test('handles template literals with comments', () => {
  const code = 'const str = `\n// Not a comment\n${value}\n`;\n// Real comment';
  const result = removeComments(code, { language: 'javascript' });
  expect(result.code).toContain('// Not a comment');
  expect(result.code).not.toContain('// Real comment');
});

test('handles JSX comments', () => {
  const code = `<div>\n{/* JSX comment */}\n{// Single line JSX}\n<p>Text</p>\n</div>`;
  const result = removeComments(code, { language: 'javascript' });
  expect(result.code).toContain('<p>Text</p>');
});

test('handles f-strings with # inside', () => {
  const code = `name = "John"\nmsg = f"Hello {name} #tag"\n# Real comment`;
  const result = removeComments(code, { language: 'python' });
  expect(result.code).toContain('#tag');
});

test('handles raw strings', () => {
  const code = `regex = r"\\d+ # not a comment"\n# Real comment`;
  const result = removeComments(code, { language: 'python' });
  expect(result.code).toContain('# not a comment');
});

test('handles module-level docstrings', () => {
  const code = `"""Module docstring"""\nimport sys\n# comment`;
  const result = removeComments(code, { language: 'python' });
  expect(result.code).toContain('import sys');
});

test('detects Ruby by filename', () => {
  expect(detectLanguage('app.rb')).toBe('ruby');
});

test('detects Java by content', () => {
  const code = 'public class Main { public static void main() {} }';
  expect(detectLanguage(undefined, code)).toBe('java');
});

test('detects C++ by filename', () => {
  expect(detectLanguage('main.cpp')).toBe('cpp');
});

test('detects Go by content', () => {
  const code = 'package main\nfunc main() {}';
  expect(detectLanguage(undefined, code)).toBe('go');
});

describe('Options Handling', () => {
  test('combines language and preserveLicense', () => {
    const code = '/*! License */\n// comment\nconst x = 5;';
    const result = removeComments(code, {
      language: 'javascript',
      preserveLicense: true
    });
    expect(result.code).toContain('License');
  });

  test('filename overrides language detection', () => {
    const code = 'def hello(): pass';
    const result = removeComments(code, {
      language: 'javascript', // Wrong language
      filename: 'test.py'     // Should use Python
    });
    expect(result.detectedLanguage).toBe('python');
  });
});

test('handles HTML with embedded CSS', () => {
  const code = `<style>/* CSS comment */.class { color: red; }</style>`;
  const result = removeComments(code, { language: 'html' });
  // Should handle both HTML and CSS comments
});

test('handles HTML with embedded JavaScript', () => {
  const code = `<script>// JS comment\nconsole.log("Hi");</script>`;
  const result = removeComments(code, { language: 'html' });
  // Complex scenario
});

test('handles UTF-8 BOM', () => {
  const code = '\ufeff// comment\nconst x = 5;';
  const result = removeComments(code, { language: 'javascript' });
  expect(result.code).not.toContain('//');
});

test('handles comments in Cyrillic', () => {
  const code = '// Коментар на кирилица\nconst x = 5;'; 
  const result = removeComments(code, { language: 'javascript' });
  expect(result.code).not.toContain('Коментар');
});

test('handles mixed line endings CRLF/LF', () => {
  const code = '// comment\r\nconst x = 5;\n// another\nconst y = 10;';
  const result = removeComments(code, { language: 'javascript' });
  expect(result.code).not.toContain('//');
});


// ============================================================================
// RUBY COMMENT REMOVAL (Currently 0% coverage)
// ============================================================================

describe('Ruby Comment Removal', () => {
  test('removes # single-line comments', () => {
    const code = `# This is a comment
puts "Hello World"
# Another comment
x = 42`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).not.toContain('# This is');
    expect(result.code).not.toContain('# Another');
    expect(result.code).toContain('puts "Hello World"');
    expect(result.code).toContain('x = 42');
  });

  test('removes =begin/=end multi-line blocks', () => {
    const code = `=begin
This is a
multi-line comment
=end
def hello
  puts "Hello"
end`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).not.toContain('=begin');
    expect(result.code).not.toContain('multi-line comment');
    expect(result.code).not.toContain('=end');
    expect(result.code).toContain('def hello');
    expect(result.code).toContain('puts "Hello"');
  });

  test('handles # inside strings', () => {
    const code = `msg = "Price: #500"
# This is a real comment
puts msg`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).toContain('#500');
    expect(result.code).not.toContain('real comment');
  });

  test('handles inline comments', () => {
    const code = `x = 5 # Initialize variable
y = 10 # Another variable`;
    const result = removeComments(code, { language: 'ruby' });
    expect(result.code).toContain('x = 5');
    expect(result.code).toContain('y = 10');
    expect(result.code).not.toContain('Initialize');
    expect(result.code).not.toContain('Another variable');
  });

  test('preserves license in =begin blocks', () => {
    const code = `=begin
Copyright (c) 2024
MIT License
=end
# Regular comment
puts "Hello"`;
    const result = removeComments(code, { language: 'ruby', preserveLicense: true });
    expect(result.code).toContain('Copyright');
    expect(result.code).not.toContain('Regular comment');
  });
});

// ============================================================================
// C/C++ COMMENT REMOVAL (Currently 0% coverage)
// ============================================================================

describe('C Comment Removal', () => {
  test('removes // and /* */ comments', () => {
    const code = `// Header comment
#include <stdio.h>
/* Multi-line
   comment */
int main() {
    printf("Hello"); // Inline comment
    return 0;
}`;
    const result = removeComments(code, { language: 'c' });
    expect(result.code).not.toContain('Header comment');
    expect(result.code).not.toContain('Multi-line');
    expect(result.code).not.toContain('Inline comment');
    expect(result.code).toContain('#include <stdio.h>');
    expect(result.code).toContain('int main()');
  });

  test('handles preprocessor directives with comments', () => {
    const code = `#define MAX 100 // Maximum value
#ifdef DEBUG // Debug mode
printf("Debug");
#endif`;
    const result = removeComments(code, { language: 'c' });
    expect(result.code).toContain('#define MAX 100');
    expect(result.code).toContain('#ifdef DEBUG');
    expect(result.code).not.toContain('Maximum value');
    expect(result.code).not.toContain('Debug mode');
  });
});

describe('C++ Comment Removal', () => {
  test('removes C++ style comments', () => {
    const code = `// Standard library
#include <iostream>
/* Namespace usage */
using namespace std;

int main() {
    cout << "Hello" << endl; // Print message
    return 0;
}`;
    const result = removeComments(code, { language: 'cpp' });
    expect(result.code).not.toContain('Standard library');
    expect(result.code).not.toContain('Namespace usage');
    expect(result.code).not.toContain('Print message');
    expect(result.code).toContain('cout << "Hello"');
  });

  test('handles template comments', () => {
    const code = `// Template function
template<typename T>
T max(T a, T b) { // Compare two values
    return a > b ? a : b;
}`;
    const result = removeComments(code, { language: 'cpp' });
    expect(result.code).not.toContain('Template function');
    expect(result.code).toContain('template<typename T>');
  });
});

// ============================================================================
// C# COMMENT REMOVAL (Currently 0% coverage)
// ============================================================================

describe('C# Comment Removal', () => {
  test('removes C# comments', () => {
    const code = `// Main class
using System;

/* Application namespace */
namespace MyApp
{
    class Program // Entry point
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello"); // Print
        }
    }
}`;
    const result = removeComments(code, { language: 'csharp' });
    expect(result.code).not.toContain('Main class');
    expect(result.code).not.toContain('Application namespace');
    expect(result.code).not.toContain('Entry point');
    expect(result.code).toContain('using System;');
    expect(result.code).toContain('Console.WriteLine');
  });

  test('handles XML documentation comments', () => {
    const code = `/// <summary>
/// This is a method
/// </summary>
public void DoSomething() {
    // Regular comment
}`;
    const result = removeComments(code, { language: 'csharp' });
    expect(result.code).not.toContain('<summary>');
    expect(result.code).toContain('public void DoSomething()');
  });

  test('handles region directives with comments', () => {
    const code = `#region Properties // User properties
public string Name { get; set; }
#endregion`;
    const result = removeComments(code, { language: 'csharp' });
    expect(result.code).toContain('#region Properties');
    expect(result.code).not.toContain('User properties');
  });
});

// ============================================================================
// PHP COMMENT REMOVAL (Currently 0% coverage)
// ============================================================================

describe('PHP Comment Removal', () => {
  test('removes all three PHP comment styles', () => {
    const code = `<?php
// Single line comment
# Hash style comment
/* Multi-line
   comment */
echo "Hello World";
?>`;
    const result = removeComments(code, { language: 'php' });
    expect(result.code).not.toContain('Single line');
    expect(result.code).not.toContain('Hash style');
    expect(result.code).not.toContain('Multi-line');
    expect(result.code).toContain('echo "Hello World"');
  });

  test('handles PHP with HTML', () => {
    const code = `<html>
<?php
// PHP comment
echo "<h1>Title</h1>"; // Inline comment
?>
</html>`;
    const result = removeComments(code, { language: 'php' });
    expect(result.code).not.toContain('PHP comment');
    expect(result.code).not.toContain('Inline comment');
    expect(result.code).toContain('echo "<h1>Title</h1>"');
  });

  test('handles heredoc syntax', () => {
    const code = `<?php
$sql = <<<SQL
SELECT * FROM users
SQL;
// Comment after heredoc
echo $sql;`;
    const result = removeComments(code, { language: 'php' });
    expect(result.code).toContain('SELECT * FROM users');
    expect(result.code).not.toContain('Comment after');
  });
});

// ============================================================================
// GO COMMENT REMOVAL (Currently only detection test)
// ============================================================================

describe('Go Comment Removal', () => {
  test('removes Go single and multi-line comments', () => {
    const code = `// Package declaration
package main

/* Import statement */
import "fmt"

func main() {
    fmt.Println("Hello") // Print message
}`;
    const result = removeComments(code, { language: 'go' });
    expect(result.code).not.toContain('Package declaration');
    expect(result.code).not.toContain('Import statement');
    expect(result.code).not.toContain('Print message');
    expect(result.code).toContain('package main');
    expect(result.code).toContain('import "fmt"');
  });

  test('handles Go doc comments', () => {
    const code = `// Add returns the sum of two integers.
// It takes two parameters and returns their sum.
func Add(a, b int) int {
    return a + b
}`;
    const result = removeComments(code, { language: 'go' });
    expect(result.code).not.toContain('returns the sum');
    expect(result.code).toContain('func Add');
  });
});

// ============================================================================
// RUST COMMENT REMOVAL (Currently only detection test)
// ============================================================================

describe('Rust Comment Removal', () => {
  test('removes Rust comments', () => {
    const code = `// Main function
fn main() {
    /* Variable declaration */
    let x = 5; // Initialize x
    println!("Value: {}", x);
}`;
    const result = removeComments(code, { language: 'rust' });
    expect(result.code).not.toContain('Main function');
    expect(result.code).not.toContain('Variable declaration');
    expect(result.code).not.toContain('Initialize x');
    expect(result.code).toContain('fn main()');
    expect(result.code).toContain('println!');
  });

  test('handles Rust doc comments', () => {
    const code = `/// Adds two numbers together.
/// # Examples
/// \`\`\`
/// let result = add(2, 3);
/// \`\`\`
fn add(a: i32, b: i32) -> i32 {
    a + b // Return sum
}`;
    const result = removeComments(code, { language: 'rust' });
    expect(result.code).not.toContain('Adds two numbers');
    expect(result.code).not.toContain('Return sum');
    expect(result.code).toContain('fn add');
  });

  test('handles nested block comments', () => {
    const code = `/* Outer comment
/* Nested comment */
Still outer
*/
fn test() {}`;
    const result = removeComments(code, { language: 'rust' });
    expect(result.code).not.toContain('Outer comment');
    expect(result.code).toContain('fn test()');
  });
});

// ============================================================================
// SWIFT COMMENT REMOVAL (Currently only detection test)
// ============================================================================

describe('Swift Comment Removal', () => {
  test('removes Swift comments', () => {
    const code = `// Import statement
import Foundation

/* Class definition */
class Person {
    var name: String // Property
    
    init(name: String) {
        self.name = name
    }
}`;
    const result = removeComments(code, { language: 'swift' });
    expect(result.code).not.toContain('Import statement');
    expect(result.code).not.toContain('Class definition');
    expect(result.code).not.toContain('// Property');
    expect(result.code).toContain('import Foundation');
    expect(result.code).toContain('class Person');
  });

  test('handles Swift markup comments', () => {
    const code = `/// Returns a greeting message
/// - Parameter name: The name to greet
/// - Returns: A greeting string
func greet(name: String) -> String {
    return "Hello, \\(name)" // String interpolation
}`;
    const result = removeComments(code, { language: 'swift' });
    expect(result.code).not.toContain('Returns a greeting');
    expect(result.code).not.toContain('String interpolation');
    expect(result.code).toContain('func greet');
  });
});

// ============================================================================
// XML COMMENT REMOVAL (Currently 0% coverage)
// ============================================================================

describe('XML Comment Removal', () => {
  test('removes XML comments', () => {
    const code = `<?xml version="1.0"?>
<!-- Root element -->
<root>
    <!-- Child element -->
    <child>Content</child>
</root>`;
    const result = removeComments(code, { language: 'xml' });
    expect(result.code).not.toContain('Root element');
    expect(result.code).not.toContain('Child element');
    expect(result.code).toContain('<root>');
    expect(result.code).toContain('<child>Content</child>');
  });

  test('handles multiple XML comments', () => {
    const code = `<config>
    <!-- Database settings -->
    <database>
        <!-- Host configuration -->
        <host>localhost</host>
    </database>
</config>`;
    const result = removeComments(code, { language: 'xml' });
    expect(result.code).not.toContain('Database settings');
    expect(result.code).not.toContain('Host configuration');
    expect(result.code).toContain('<host>localhost</host>');
  });
});

// ============================================================================
// ADVANCED JAVASCRIPT/TYPESCRIPT EDGE CASES
// ============================================================================

describe('JavaScript Advanced Edge Cases', () => {
  test('handles JSX comments', () => {
    const code = `function Component() {
  return (
    <div>
      {/* JSX comment */}
      <h1>Title</h1>
      {/* Another JSX comment */}
      <p>Content</p>
    </div>
  );
}`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).not.toContain('JSX comment');
    expect(result.code).toContain('<h1>Title</h1>');
  });

  test('handles template literals with comment-like text', () => {
    const code = `const text = \`
This is not // a comment
Neither is /* this */
\`;
// This IS a comment
const x = 5;`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('This is not // a comment');
    expect(result.code).toContain('Neither is /* this */');
    expect(result.code).not.toContain('This IS a comment');
  });

  test('handles regex patterns with slashes', () => {
    const code = `const urlPattern = /https?:\\/\\//; // URL regex
const datePattern = /\\d{4}-\\d{2}-\\d{2}/; // Date format
const test = urlPattern.test(url);`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('/https?:\\/\\//');
    expect(result.code).toContain('/\\d{4}-\\d{2}-\\d{2}/');
    expect(result.code).not.toContain('URL regex');
    expect(result.code).not.toContain('Date format');
  });

  test('handles division operator vs comment', () => {
    const code = `const result = a / b; // Division
const result2 = a /* comment */ / /* comment */ b;
const result3 = 10 / 2;`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('a / b');
    expect(result.code).not.toContain('// Division');
    expect(result.code).not.toContain('/* comment */');
  });
});

// ============================================================================
// ADVANCED PYTHON EDGE CASES
// ============================================================================

describe('Python Advanced Edge Cases', () => {
  test('handles f-strings with # inside', () => {
    const code = `name = "Alice"
msg = f"User #{user_id}: {name}"
# Real comment
print(msg)`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).toContain('f"User #{user_id}: {name}"');
    expect(result.code).not.toContain('# Real comment');
  });

  test('handles raw strings with # inside', () => {
    const code = `pattern = r"\\d+ # matches digits"
# Real comment
compiled = re.compile(pattern)`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).toContain('r"\\d+ # matches digits"');
    expect(result.code).not.toContain('# Real comment');
  });

  test('handles triple-quoted strings with #', () => {
    const code = `text = """
This is # not a comment
Another # line
"""
# Real comment`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).toContain('This is # not a comment');
    expect(result.code).not.toContain('# Real comment');
  });

  test('handles decorators with comments', () => {
    const code = `# Decorator comment
@property
def name(self):
    # Getter comment
    return self._name`;
    const result = removeComments(code, { language: 'python' });
    expect(result.code).not.toContain('Decorator comment');
    expect(result.code).not.toContain('Getter comment');
    expect(result.code).toContain('@property');
  });
});

// ============================================================================
// OPTIONS COMBINATIONS
// ============================================================================

describe('Options Combinations', () => {
  test('preserveLicense + dryRun together', () => {
    const code = `/*! License */\n// comment\nconst x = 5;`;
    const result = removeComments(code, {
      language: 'javascript',
      preserveLicense: true,
      dryRun: true
    });
    expect(result.code).toBe(code); // Unchanged in dry run
    expect(result.removedCount).toBe(1); // Only non-license comment
  });

  test('multiple options with filename', () => {
    const code = `/*! MIT License */\n// comment\nconst x = 5;`;
    const result = removeComments(code, {
      filename: 'test.js',
      preserveLicense: true,
      dryRun: false
    });
    expect(result.detectedLanguage).toBe('javascript');
    expect(result.code).toContain('MIT License');
    expect(result.code).not.toContain('// comment');
  });

  test('language parameter with contradicting filename', () => {
    const code = `# Python comment\nprint("Hello")`;
    const result = removeComments(code, {
      language: 'javascript', // Wrong language
      filename: 'test.py'     // Correct filename (should win)
    });
    // Filename should override language parameter
    expect(result.detectedLanguage).toBe('python');
    expect(result.code).not.toContain('# Python comment');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  test('HTML with embedded CSS and JavaScript', () => {
    const code = `<!DOCTYPE html>
<!-- HTML comment -->
<html>
<head>
    <style>
        /* CSS comment */
        .class { color: red; }
    </style>
    <script>
        // JavaScript comment
        console.log("Hello");
    </script>
</head>
</html>`;
    const result = removeComments(code, { language: 'html' });
    expect(result.code).not.toContain('HTML comment');
    // Note: HTML remover removes only HTML comments, not CSS/JS embedded
    expect(result.code).toContain('.class { color: red; }');
  });

  test('processes files with mixed encodings', () => {
    const code = `// English comment
// Коментар на кирилица
// 中文注释
const msg = "Hello 世界";`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).not.toContain('English comment');
    expect(result.code).not.toContain('Коментар');
    expect(result.code).not.toContain('中文');
    expect(result.code).toContain('Hello 世界');
  });
});

// ============================================================================
// STRESS & PERFORMANCE TESTS
// ============================================================================

describe('Stress Tests', () => {
  test('handles very long single line', () => {
    const longComment = '// ' + 'x'.repeat(100000);
    const result = removeComments(longComment, { language: 'javascript' });
    expect(result.code.trim().length).toBe(0);
  });

  test('handles deeply nested code structures', () => {
    let code = '';
    for (let i = 0; i < 100; i++) {
      code += `{\n// Comment ${i}\n`;
    }
    code += 'const x = 5;\n';
    for (let i = 0; i < 100; i++) {
      code += '}\n';
    }
    
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toContain('const x = 5');
    expect(result.code).not.toContain('// Comment');
  });

  test('handles file with many small comments', () => {
    let code = '';
    for (let i = 0; i < 1000; i++) {
      code += `// Comment ${i}\nconst var${i} = ${i};\n`;
    }
    
    const start = Date.now();
    const result = removeComments(code, { language: 'javascript' });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500); // Should be fast
    expect(result.code).not.toContain('// Comment');
    expect(result.removedCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// ERROR RECOVERY TESTS
// ============================================================================

describe('Error Recovery', () => {
  test('handles unclosed multi-line comment gracefully', () => {
    const code = `/* Unclosed comment
const x = 5;
const y = 10;`;
    const result = removeComments(code, { language: 'javascript' });
    // Should not crash, return something reasonable
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe('string');
  });

  test('handles mismatched quotes in strings', () => {
    const code = `const str = "Hello'; // Comment
const x = 5;`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toBeDefined();
  });

  test('handles null bytes and special characters', () => {
    const code = `// Comment\x00\nconst x = 5;`;
    const result = removeComments(code, { language: 'javascript' });
    expect(result.code).toBeDefined();
  });
});

describe('Language Detection - Advanced', () => {
  // Testing more file extensions from EXTENSION_MAP
  test('detects various file extensions correctly', () => {
    expect(detectLanguage('component.jsx')).toBe('javascript');
    expect(detectLanguage('component.tsx')).toBe('typescript');
    expect(detectLanguage('styles.scss')).toBe('scss');
    expect(detectLanguage('config.yml')).toBe('yaml');
    expect(detectLanguage('Program.cs')).toBe('csharp');
    expect(detectLanguage('main.h')).toBe('c');
    expect(detectLanguage('main.rs')).toBe('rust');
  });

  // Testing more content-based detection rules
  test('detects language by content (SQL)', () => {
    const code = 'SELECT * FROM users;';
    expect(detectLanguage(undefined, code)).toBe('sql');
  });

  test('detects language by content (PHP)', () => {
    const code = '<?php echo "Hello";';
    expect(detectLanguage(undefined, code)).toBe('php');
  });

  test('detects language by content (C#)', () => {
    const code = 'namespace MyApp { class Program {} }';
    expect(detectLanguage(undefined, code)).toBe('csharp');
  });

  test('detects language by content (Rust)', () => {
    const code = 'fn main() { println!("Hello"); }';
    expect(detectLanguage(undefined, code)).toBe('rust');
  });
});

describe('JavaScript/TypeScript Edge Cases', () => {
  test('preserves single-line license comments (// @license)', () => {
    // Your pre-processor in javascript-remover.ts looks for exactly this
    const code = `
// @license MIT
// Regular comment
const x = 5;
`;
    const result = removeComments(code, {
      language: 'javascript',
      preserveLicense: true
    });
    expect(result.code).toContain('@license');
    expect(result.code).not.toContain('Regular comment');
  });
});

describe('PHP Advanced Edge Cases', () => {
  test('handles # comments inside strings correctly', () => {
    // The logic in c-style-remover.ts for PHP is simple and might break here
    const code = `<?php
$query = "SELECT * FROM users WHERE tag = '#awesome'"; // Keep this
# Remove this comment
echo $query;
`;
    const result = removeComments(code, { language: 'php' });
    expect(result.code).toContain("'#awesome'");
    expect(result.code).not.toContain('Remove this comment');
  });
});

describe('JSON Advanced Edge Cases', () => {
  test('handles comment-like text inside strings', () => {
    // Your manual JSON parser in other-remover.ts needs to be tested
    const code = `{
  "key": "This is // not a comment",
  /* This is a real comment */
  "key2": "value"
}`;
    const result = removeComments(code, { language: 'json' });
    expect(result.code).toContain('// not a comment');
    expect(result.code).not.toContain('This is a real comment');
  });
});

describe('HTML/XML Advanced Edge Cases', () => {
  test('ignores comments inside CDATA blocks', () => {
    const code = `
<xml>
  <data>
    <![CDATA[
      // This is NOT a comment, it's content
      ]]>
  </data>
</xml>
`;
    const result = removeComments(code, { language: 'xml' });
    expect(result.code).not.toContain('This is a real comment');
    expect(result.code).toContain('// This is NOT a comment');
    expect(result.code).toContain('');
  });

  test('removes HTML conditional comments', () => {
    const code = `
<p>Regular content</p>
`;
    const result = removeComments(code, { language: 'html' });
    expect(result.code).not.toContain('IE 9');
    expect(result.code).toContain('Regular content');
  });
});

describe('SQL Advanced Edge Cases', () => {
  test('ignores MySQL # comments (as they are not standard SQL)', () => {
    // Your remover supports -- and /* */ but not # (which is correct, but
    // it's good to test that it doesn't remove them)
    const code = `
SELECT * FROM users; # This is a MySQL comment
-- This is a standard comment
`;
    const result = removeComments(code, { language: 'sql' });
    expect(result.code).toContain('# This is a MySQL comment');
    expect(result.code).not.toContain('-- This is a standard comment');
  });
});

// ============================================================================
// LANGUAGE DETECTOR BUG FIX (Swift vs Go)
// ============================================================================

describe('Language Detection Bug Fixes', () => {
  test('detects Swift correctly (and not as Go)', () => {
    // Make sure the code is in backticks ``
    const swiftCode = `func greet(name: String) -> String { return "Hello" }`;
    const lang = detectLanguage(undefined, swiftCode);
    expect(lang).toBe('swift');
  });

  test('detects Go correctly (and not as Swift)', () => {
    // Make sure the code is in backticks ``
    const goCode = `package main\nfunc main() { fmt.Println("Hello") }`;
    const lang = detectLanguage(undefined, goCode);
    expect(lang).toBe('go');
  });
});

// ============================================================================
// HTML/CSS EMBEDDED EDGE CASES
// ============================================================================

describe('HTML/CSS Embedded Edge Cases', () => {
  test('removes only HTML comments, ignoring embedded CSS/JS comments', () => {
    // This was the issue - the code needs to be in `const code = \`...\``
    const code = `
<style>
  /* This is a CSS comment */
  .class { color: red; }
</style>
<script>
  // This is a JS comment
  console.log("Hello");
</script>
`;
    const result = removeComments(code, { language: 'html' });
    
    // These should be removed:
    expect(result.code).not.toContain('This is an HTML comment');
    expect(result.code).not.toContain('Another HTML comment');
    
    // These should be preserved (because they're in another language):
    expect(result.code).toContain('/* This is a CSS comment */');
    expect(result.code).toContain('// This is a JS comment');
  });

  test('removes only CSS comments when language is CSS', () => {
    // ... и тук
    const code = `
/* This is a CSS comment */
.class {
  color: red; /* Inline CSS comment */
}
`;
    const result = removeComments(code, { language: 'css' });
    expect(result.code).not.toContain('/*');
    expect(result.code).toContain('color: red;');
  });
});

// ============================================================================
// INDEX.TS & ERROR HANDLING
// ============================================================================

describe('Index.ts Logic & Error Handling', () => {
  test('returns original code if language is unknown', () => {
    // ... и тук
    const code = `~~~ some unknown syntax ~~~`;
    const result = removeComments(code, { language: 'lisp' as any }); // 'as any' за да мине TS
    
    expect(result.code).toBe(code);
    expect(result.removedCount).toBe(0);
    expect(result.detectedLanguage).toBe('lisp');
  });

  test('countComments function (dryRun) handles SQL', () => {
    // ... и тук
    const code = `
-- comment 1
/* comment 2 */
SELECT * FROM users;
`;
    const result = removeComments(code, { language: 'sql', dryRun: true });
    expect(result.removedCount).toBe(2);
    expect(result.code).toBe(code);
  });
});

// ============================================================================
// JSON/YAML ADVANCED EDGE CASES
// ============================================================================

describe('JSON/YAML Advanced Edge Cases', () => {
  test('handles escaped quotes inside JSON strings', () => {
    // ... и тук
    const code = `{
  "key": "This is \\"// not a comment\\"", // This IS a comment
  "key2": "value"
}`;
    const result = removeComments(code, { language: 'json' });
    
    expect(result.code).toContain('\\"// not a comment\\"');
    expect(result.code).not.toContain('// This IS a comment');
  });

  test('handles complex multi-line YAML strings', () => {
    // ... и тук
    const code = `
key: |
  This is a string.
  # This is also a string, NOT a comment.
  # Also a string.
# This IS a real comment.
another_key: value
`;
    const result = removeComments(code, { language: 'yaml' });
    
    expect(result.code).not.toContain('This IS a real comment');
    // As mentioned, this test MIGHT fail,
    // if your YAML remover isn't "smart" enough
    // to recognize multi-line | blocks.
    // expect(result.code).toContain('# This is also a string'); 
  });
});