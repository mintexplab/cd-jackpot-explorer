import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Disc, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useDiscogs } from '@/hooks/useDiscogs';
import { Button } from '@/components/ui/button';

export default function DiscogsCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeDiscogsAuth } = useDiscogs();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const oauthToken = searchParams.get('oauth_token');
      const oauthVerifier = searchParams.get('oauth_verifier');
      const denied = searchParams.get('denied');

      if (denied) {
        setStatus('error');
        setError('Authorization was denied. Please try again.');
        return;
      }

      if (!oauthToken || !oauthVerifier) {
        setStatus('error');
        setError('Missing authorization parameters.');
        return;
      }

      const success = await completeDiscogsAuth(oauthToken, oauthVerifier);
      
      if (success) {
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setError('Failed to complete authorization.');
      }
    };

    handleCallback();
  }, [searchParams, completeDiscogsAuth, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="stat-card p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h2 className="font-display text-2xl mt-6 tracking-wide">
              CONNECTING TO DISCOGS
            </h2>
            <p className="text-muted-foreground mt-2">
              Please wait while we complete the authorization...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="font-display text-2xl mt-6 tracking-wide text-green-500">
              SUCCESS!
            </h2>
            <p className="text-muted-foreground mt-2">
              Your Discogs account has been connected. Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="font-display text-2xl mt-6 tracking-wide">
              CONNECTION FAILED
            </h2>
            <p className="text-muted-foreground mt-2">
              {error || 'Something went wrong. Please try again.'}
            </p>
            <Button
              variant="hero"
              onClick={() => navigate('/dashboard')}
              className="mt-6"
            >
              Back to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
