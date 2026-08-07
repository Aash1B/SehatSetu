import { GoogleLogin } from '@react-oauth/google';

type GoogleSignInButtonProps = {
  role: 'PATIENT' | 'DOCTOR';
  mode: 'login' | 'signup';
  dataConsent?: boolean;
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
};

export default function GoogleSignInButton({ role, mode, dataConsent = true, onCredential, onError }: GoogleSignInButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const buttonText = role === 'DOCTOR' ? 'Continue with Google' : 'Continue with Google';

  if (!clientId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
        Google Sign-In is not configured for this environment.
      </div>
    );
  }

  if (mode === 'signup' && !dataConsent) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-400"
      >
        {buttonText}
      </button>
    );
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={async (response) => {
          const credential = response.credential;
          if (!credential) {
            onError('Google authentication did not return a credential.');
            return;
          }

          try {
            await onCredential(credential);
          } catch (error: any) {
            onError(error?.message || 'Google Sign-In failed.');
          }
        }}
        onError={() => onError('Google Sign-In failed. Please try again.')}
        theme="outline"
        size="large"
        text={mode === 'signup' ? 'signup_with' : 'signin_with'}
        shape="pill"
        width="100%"
        context="signin"
      />
    </div>
  );
}