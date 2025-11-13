import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Building2, TrendingUp } from 'lucide-react-native';
import { UserRole } from '@/types';

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user, refreshProfile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email!,
      role: selectedRole,
    });

    if (error) {
      console.error('Error creating profile:', error);
      setLoading(false);
      return;
    }

    await refreshProfile();

    if (selectedRole === 'startup') {
      router.replace('/auth/setup-startup');
    } else {
      router.replace('/auth/setup-investor');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to FundLink</Text>
          <Text style={styles.subtitle}>Choose your role to get started</Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'startup' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('startup')}>
            <Building2
              size={48}
              color={
                selectedRole === 'startup' ? colors.primary : colors.textSecondary
              }
            />
            <Text style={styles.roleTitle}>I'm a Startup</Text>
            <Text style={styles.roleDescription}>
              Looking for investors to fund my business
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'investor' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('investor')}>
            <TrendingUp
              size={48}
              color={
                selectedRole === 'investor'
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text style={styles.roleTitle}>I'm an Investor</Text>
            <Text style={styles.roleDescription}>
              Looking to discover and invest in startups
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedRole || loading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}>
          <Text style={styles.continueButtonText}>
            {loading ? 'Creating Profile...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'space-between',
    },
    header: {
      marginTop: 48,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    options: {
      gap: 16,
      flex: 1,
      justifyContent: 'center',
    },
    roleCard: {
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    roleCardSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    roleTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    roleDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    continueButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      opacity: 0.5,
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
