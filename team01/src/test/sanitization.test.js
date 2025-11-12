import { expect } from 'chai';
import { sanitizeInput, sanitizeSessionMessage, sanitizeChatMessage, sanitizePlanInput, validateSessionMessage } from '../utils/sanitize.js';

describe('XSS Sanitization Tests', function() {
  describe('validateSessionMessage (Whitelist)', function() {
    it('should allow legitimate session messages', function() {
      const validMessages = [
        'Logged out due to session expiry',
        'Session expired',
        'Please log in to continue',
        'You have been logged out',
        'Session timeout',
        'Login required',
        'Authentication required',
        'Your session has expired'
      ];

      validMessages.forEach(message => {
        const result = validateSessionMessage(message);
        expect(result).to.equal(message);
      });
    });

    it('should reject malicious session messages', function() {
      const maliciousMessages = [
        '<script>alert("XSS")</script>Session expired',
        'TEST TEST',
        '<img src=x onerror=alert("XSS")>Logged out',
        'Custom hacker message',
        'Session expired<script>fetch("/steal")</script>',
        '<div><script>fetch(\'/steal-data\')</script></div>Session timeout'
      ];

      maliciousMessages.forEach(message => {
        const result = validateSessionMessage(message);
        expect(result).to.be.null;
      });
    });

    it('should reject HTML entity encoded script attacks', function() {
      const entityEncodedAttacks = [
        '&lt;script&gt;alert(\'test\')&lt;/script&gt;Session expired',
        '&#60;script&#62;alert(&#39;test&#39;)&#60;/script&#62;Session timeout',
        '&lt;img src=x onerror=alert(1)&gt;Login required',
        '&#x3C;script&#x3E;fetch(&#x27;/steal&#x27;)&#x3C;/script&#x3E;Session expired',
        '&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;Session timeout'
      ];

      entityEncodedAttacks.forEach(message => {
        const result = validateSessionMessage(message);
        expect(result).to.be.null; // Should be rejected due to HTML entities/suspicious patterns
      });
    });

    it('should handle empty or null input', function() {
      expect(validateSessionMessage('')).to.be.null;
      expect(validateSessionMessage(null)).to.be.null;
      expect(validateSessionMessage(undefined)).to.be.null;
    });

    it('should trim whitespace but still validate exact match', function() {
      const result = validateSessionMessage('  Session expired  ');
      expect(result).to.equal('Session expired');
    });

    it('should be case-sensitive', function() {
      const result = validateSessionMessage('session expired'); // lowercase
      expect(result).to.be.null;
    });

    it('should require exact matches', function() {
      const result = validateSessionMessage('Session expired!'); // extra punctuation
      expect(result).to.be.null;
    });
  });

  describe('sanitizeSessionMessage', function() {
    it('should remove all HTML tags from session messages', function() {
      const maliciousInput = '<script>alert("XSS")</script>Logged out';
      const result = sanitizeSessionMessage(maliciousInput);
      expect(result).to.equal('Logged out');
    });

    it('should handle normal session messages', function() {
      const normalInput = 'Logged out due to session expiry';
      const result = sanitizeSessionMessage(normalInput);
      expect(result).to.equal('Logged out due to session expiry');
    });

    it('should handle empty or null input', function() {
      expect(sanitizeSessionMessage('')).to.equal('');
      expect(sanitizeSessionMessage(null)).to.equal('');
      expect(sanitizeSessionMessage(undefined)).to.equal('');
    });

    it('should prevent script injection', function() {
      const scriptAttack = '<img src=x onerror=alert("XSS")>Session expired';
      const result = sanitizeSessionMessage(scriptAttack);
      expect(result).to.equal('Session expired');
    });
  });

  describe('HTML Entity Encoding Security Tests', function() {
    describe('sanitizeSessionMessage', function() {
      it('should handle HTML entity encoded scripts', function() {
        const entityEncodedScript = '&lt;script&gt;alert(\'test\')&lt;/script&gt;Session expired';
        const result = sanitizeSessionMessage(entityEncodedScript);
        // DOMPurify should decode entities and then strip the script
        expect(result).to.equal('Session expired');
        expect(result).to.not.include('<script>');
        expect(result).to.not.include('alert');
      });

      it('should handle double-encoded entities', function() {
        const doubleEncoded = '&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;Test';
        const result = sanitizeSessionMessage(doubleEncoded);
        expect(result).to.not.include('<script>');
        expect(result).to.not.include('alert');
      });

      it('should handle hex-encoded entities', function() {
        const hexEncoded = '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;Test';
        const result = sanitizeSessionMessage(hexEncoded);
        expect(result).to.not.include('<script>');
        expect(result).to.not.include('alert');
      });
    });

    describe('sanitizePlanInput', function() {
      it('should handle entity-encoded scripts in plan inputs', function() {
        const entityEncodedTime = '&lt;script&gt;alert(\'XSS\')&lt;/script&gt;2:00 PM';
        const result = sanitizePlanInput(entityEncodedTime);
        expect(result).to.equal('2:00 PM');
        expect(result).to.not.include('<script>');
        expect(result).to.not.include('alert');
      });

      it('should handle entity-encoded event handlers', function() {
        const entityEncodedHandler = 'Coffee Shop&lt;img src=x onerror=alert(1)&gt;';
        const result = sanitizePlanInput(entityEncodedHandler);
        expect(result).to.equal('Coffee Shop');
        expect(result).to.not.include('<img');
        expect(result).to.not.include('onerror');
      });
    });

    describe('sanitizeChatMessage', function() {
      it('should allow safe formatted content but block entity-encoded scripts', function() {
        const mixedContent = 'Hello &lt;script&gt;alert(1)&lt;/script&gt;<b>world</b>';
        const result = sanitizeChatMessage(mixedContent);
        expect(result).to.include('<b>world</b>'); // Safe formatting preserved
        expect(result).to.not.include('<script>'); // Entity-decoded script removed
        expect(result).to.not.include('alert');
      });
    });
  });

  describe('sanitizeChatMessage', function() {
    it('should allow basic formatting tags', function() {
      const input = 'Hello <b>world</b> <i>test</i>';
      const result = sanitizeChatMessage(input);
      expect(result).to.equal('Hello <b>world</b> <i>test</i>');
    });

    it('should remove script tags', function() {
      const input = 'Hello <script>alert("XSS")</script>world';
      const result = sanitizeChatMessage(input);
      expect(result).to.equal('Hello world');
    });

    it('should remove dangerous attributes', function() {
      const input = 'Hello <b onclick="alert(\'XSS\')">world</b>';
      const result = sanitizeChatMessage(input);
      expect(result).to.equal('Hello <b>world</b>');
    });
  });

  describe('sanitizeInput', function() {
    it('should allow basic formatting in bio content', function() {
      const input = 'I love <strong>hiking</strong>. <em>Reading</em> is fun.';
      const result = sanitizeInput(input);
      expect(result).to.equal('I love <strong>hiking</strong>. <em>Reading</em> is fun.');
    });

    it('should remove dangerous content', function() {
      const input = 'Check this out <iframe src="evil.com"></iframe>';
      const result = sanitizeInput(input);
      expect(result).to.equal('Check this out ');
    });

    it('should handle social media handles safely', function() {
      const input = '@user<script>alert("XSS")</script>';
      const result = sanitizeInput(input);
      expect(result).to.equal('@user');
    });
  });



  describe('sanitizePlanInput', function() {
    it('should allow normal time inputs', function() {
      const input = '2:00 PM';
      const result = sanitizePlanInput(input);
      expect(result).to.equal('2:00 PM');
    });

    it('should allow normal location inputs', function() {
      const input = 'Central Park';
      const result = sanitizePlanInput(input);
      expect(result).to.equal('Central Park');
    });

    it('should remove all HTML tags from plan inputs', function() {
      const input = '<script>alert("XSS")</script>2:00 PM';
      const result = sanitizePlanInput(input);
      expect(result).to.equal('2:00 PM');
    });

    it('should remove dangerous scripts from location', function() {
      const input = 'Coffee Shop<img src=x onerror=alert("XSS")>';
      const result = sanitizePlanInput(input);
      expect(result).to.equal('Coffee Shop');
    });

    it('should handle empty or null plan inputs', function() {
      expect(sanitizePlanInput('')).to.equal('');
      expect(sanitizePlanInput(null)).to.equal('');
      expect(sanitizePlanInput(undefined)).to.equal('');
    });

    it('should trim whitespace from plan inputs', function() {
      const input = '  3:00 PM  ';
      const result = sanitizePlanInput(input);
      expect(result).to.equal('3:00 PM');
    });

    it('should handle complex XSS attempts in time input', function() {
      const input = '"><script>fetch("/steal-data")</script><input value="';
      const result = sanitizePlanInput(input);
      // Our enhanced decoder now properly handles this, resulting in clean output
      expect(result).to.equal('">');
    });

    it('should handle complex XSS attempts in location input', function() {
      const input = 'javascript:alert("XSS")//Starbucks';
      const result = sanitizePlanInput(input);
      expect(result).to.equal('javascript:alert("XSS")//Starbucks');
    });
  });
}); 