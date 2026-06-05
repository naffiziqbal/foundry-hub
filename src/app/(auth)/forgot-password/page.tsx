'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ ok: boolean; devToken?: string }>(
        '/auth/forgot-password',
        { email },
        { auth: false },
      );
      setSent(true);
      if (res.devToken) setDevToken(res.devToken);
      toast.success('If that email exists, a reset link was sent.');
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-medium">Reset password</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset token.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            Check your inbox for the reset token.
            {devToken && (
              <div className="mt-2">
                <p className="font-medium text-foreground/80">Dev token:</p>
                <code className="mt-1 block break-all rounded bg-background p-2 text-xs">
                  {devToken}
                </code>
              </div>
            )}
          </div>
          <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
            <Button className="w-full">Continue to reset</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Send reset token
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
