import { getEnv } from '../config/index.js';

// ─── Email Service Interface ─────────────────────────────────────────────────

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

// ─── Console Email Service (Development) ─────────────────────────────────────

class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    console.log('──────────────────────────────────────────');
    console.log('📧 Email (dev console)');
    console.log(`   To: ${message.to}`);
    console.log(`   Subject: ${message.subject}`);
    console.log(`   Body: ${message.text}`);
    console.log('──────────────────────────────────────────');
  }
}

// ─── SMTP Email Service (Production) ─────────────────────────────────────────
// Placeholder — add nodemailer or similar when SMTP is needed.
// The interface is already defined above, so swapping is trivial.

// ─── Factory ─────────────────────────────────────────────────────────────────

let _emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!_emailService) {
    const env = getEnv();
    if (env.EMAIL_PROVIDER === 'smtp') {
      // In production, this would instantiate an SMTP transport.
      // For now, fall back to console to avoid requiring SMTP config.
      console.warn('SMTP email provider requested but not yet implemented. Falling back to console.');
      _emailService = new ConsoleEmailService();
    } else {
      _emailService = new ConsoleEmailService();
    }
  }
  return _emailService;
}

// ─── Email Template Helpers ──────────────────────────────────────────────────

export function buildVerificationEmail(handle: string, token: string): EmailMessage {
  const env = getEnv();
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  return {
    to: '', // Set by caller
    subject: 'Verify your CodeArena account',
    text: `Hi ${handle},\n\nPlease verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— CodeArena`,
  };
}

export function buildPasswordResetEmail(handle: string, token: string): EmailMessage {
  const env = getEnv();
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  return {
    to: '', // Set by caller
    subject: 'Reset your CodeArena password',
    text: `Hi ${handle},\n\nA password reset was requested for your account. Reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n— CodeArena`,
  };
}
