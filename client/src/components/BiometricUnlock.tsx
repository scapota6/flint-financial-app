import { useState, useEffect, useCallback } from 'react';
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Fingerprint, LogOut, AlertCircle } from 'lucide-react';

interface BiometricUnlockProps {
  onUnlock: () => void;
  onLogout: () => void;
}

export function BiometricUnlock({ onUnlock, onLogout }: BiometricUnlockProps) {
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAvailable(false);
      setHasChecked(true);
      return;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      setIsAvailable(result.isAvailable);
      setBiometryType(result.biometryType);
      setHasChecked(true);
    } catch (e) {
      console.error('Biometric check failed:', e);
      setIsAvailable(false);
      setHasChecked(true);
    }
  };

  const authenticate = useCallback(async () => {
    if (isAuthenticating) return;
    
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
        setError('Authentication failed. Tap Unlock to try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, onUnlock]);

  const getBiometryLabel = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.TOUCH_ID:
        return 'Touch ID';
      case BiometryType.FINGERPRINT:
        return 'Fingerprint';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Face Unlock';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Iris Scan';
      default:
        return 'Biometrics';
    }
  };

  const getUnlockButtonLabel = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
        return 'Unlock with Face ID';
      case BiometryType.TOUCH_ID:
        return 'Unlock with Touch ID';
      case BiometryType.FINGERPRINT:
        return 'Unlock with Fingerprint';
      default:
        return 'Unlock';
    }
  };

  const getBiometryIcon = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        return (
          <div className="w-28 h-28 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mb-8 shadow-lg">
            <svg viewBox="0 0 24 24" className="w-14 h-14 text-gray-800" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-28 h-28 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mb-8 shadow-lg">
            <Fingerprint className="w-14 h-14 text-gray-800" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F4F2ED]">
      <div className="flex flex-col items-center text-center w-full max-w-xs px-6">
        <div className="text-4xl font-bold text-gray-900 mb-2">Flint</div>
        <p className="text-gray-500 mb-10">Tap to unlock your account</p>
        
        {getBiometryIcon()}
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 mb-6 bg-red-50 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {hasChecked && isAvailable ? (
          <div className="space-y-4 w-full">
            <Button
              onClick={authenticate}
              disabled={isAuthenticating}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-7 text-lg font-semibold rounded-2xl shadow-lg"
            >
              {isAuthenticating ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </span>
              ) : (
                getUnlockButtonLabel()
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 py-4"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        ) : hasChecked ? (
          <div className="space-y-4 w-full">
            <p className="text-gray-500 text-sm mb-4">
              Biometric authentication is not available.
            </p>
            <Button
              onClick={onLogout}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-7 text-lg font-semibold rounded-2xl shadow-lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        ) : (
          <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
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
  } catch (e: any) {
    if (e?.code === 'UNIMPLEMENTED' || e?.message?.includes('UNIMPLEMENTED')) {
      console.log('Biometric credential storage not available on this device');
    } else {
      console.error('Failed to save biometric session:', e);
    }
  }
}

export async function clearBiometricSession(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await NativeBiometric.deleteCredentials({
      server: 'flint.app'
    });
  } catch (e: any) {
    if (e?.code === 'UNIMPLEMENTED' || e?.message?.includes('UNIMPLEMENTED')) {
      console.log('Biometric credential deletion not available on this device');
    } else {
      console.error('Failed to clear biometric session:', e);
    }
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
