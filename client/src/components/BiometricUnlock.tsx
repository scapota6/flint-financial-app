import { useState, useEffect, useCallback } from 'react';
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Fingerprint, Lock, AlertCircle } from 'lucide-react';

interface BiometricUnlockProps {
  onUnlock: () => void;
  onFallbackToLogin: () => void;
}

export function BiometricUnlock({ onUnlock, onFallbackToLogin }: BiometricUnlockProps) {
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAvailable(false);
      return;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      setIsAvailable(result.isAvailable);
      setBiometryType(result.biometryType);
      
      if (result.isAvailable) {
        authenticate();
      }
    } catch (e) {
      console.error('Biometric check failed:', e);
      setIsAvailable(false);
    }
  };

  const authenticate = useCallback(async () => {
    if (!isAvailable || isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);

    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Flint',
        title: 'Unlock Flint',
        subtitle: getBiometryLabel(),
        description: 'Verify your identity to access your accounts',
      });
      
      onUnlock();
    } catch (e: any) {
      console.error('Biometric auth failed:', e);
      if (e.message?.includes('canceled') || e.message?.includes('user cancel')) {
        setError('Authentication canceled');
      } else {
        setError('Authentication failed. Try again or use password.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAvailable, isAuthenticating, onUnlock]);

  const getBiometryLabel = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
        return 'Use Face ID';
      case BiometryType.TOUCH_ID:
        return 'Use Touch ID';
      case BiometryType.FINGERPRINT:
        return 'Use Fingerprint';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Use Face Unlock';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Use Iris Scan';
      default:
        return 'Use Biometrics';
    }
  };

  const getBiometryIcon = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        return (
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 10h.01M15 10h.01M12 14a2 2 0 002-2M12 14a2 2 0 01-2-2M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <Fingerprint className="w-12 h-12 text-gray-700" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F4F2ED] p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="text-3xl font-bold text-gray-900 mb-2">Flint</div>
        <p className="text-gray-600 mb-8">Your session is locked</p>
        
        {getBiometryIcon()}
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {isAvailable ? (
          <div className="space-y-4 w-full">
            <Button
              onClick={authenticate}
              disabled={isAuthenticating}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-lg rounded-xl"
            >
              {isAuthenticating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5" />
                  {getBiometryLabel()}
                </span>
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onFallbackToLogin}
              className="w-full text-gray-600 hover:text-gray-900"
            >
              <Lock className="w-4 h-4 mr-2" />
              Use Password Instead
            </Button>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            <p className="text-gray-500 text-sm mb-4">
              Biometric authentication is not available on this device.
            </p>
            <Button
              onClick={onFallbackToLogin}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-lg rounded-xl"
            >
              <Lock className="w-4 h-4 mr-2" />
              Sign In with Password
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function saveSessionForBiometric(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await NativeBiometric.setCredentials({
      username: userId,
      password: 'session_active',
      server: 'flint.app'
    });
  } catch (e) {
    console.error('Failed to save biometric session:', e);
  }
}

export async function clearBiometricSession(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await NativeBiometric.deleteCredentials({
      server: 'flint.app'
    });
  } catch (e) {
    console.error('Failed to clear biometric session:', e);
  }
}

export async function hasBiometricSession(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const credentials = await NativeBiometric.getCredentials({
      server: 'flint.app'
    });
    return credentials.password === 'session_active';
  } catch {
    return false;
  }
}
