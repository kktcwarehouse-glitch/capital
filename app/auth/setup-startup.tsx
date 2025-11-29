import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

import { ALL_SECTORS } from '@/constants/Sectors';

const stages = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
const sectors = ALL_SECTORS;

export default function SetupStartupScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [stage, setStage] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!companyName || !sector || !location || !stage) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user) {
      setError('User not found. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use upsert in case profile already exists
      const { data, error: upsertError } = await supabase
        .from('startup_profiles')
        .upsert({
          user_id: user.id,
          company_name: companyName,
          sector,
          location,
          stage,
          funding_goal: fundingGoal ? parseFloat(fundingGoal) : 0,
          description: description || '',
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error creating startup profile:', upsertError);
        setError(upsertError.message || 'Failed to create profile. Please try again.');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Failed to create profile. Please try again.');
        setLoading(false);
        return;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Setup Your Startup Profile</Text>
            <Text style={styles.subtitle}>
              Tell investors about your company
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter company name"
                placeholderTextColor={colors.textSecondary}
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sector *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pills}>
                  {sectors.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.pill,
                        sector === s && styles.pillSelected,
                      ]}
                      onPress={() => setSector(s)}>
                      <Text
                        style={[
                          styles.pillText,
                          sector === s && styles.pillTextSelected,
                        ]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="City, Country"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Stage *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pills}>
                  {stages.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.pill,
                        stage === s && styles.pillSelected,
                      ]}
                      onPress={() => setStage(s)}>
                      <Text
                        style={[
                          styles.pillText,
                          stage === s && styles.pillTextSelected,
                        ]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Funding Goal (USD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500000"
                placeholderTextColor={colors.textSecondary}
                value={fundingGoal}
                onChangeText={setFundingGoal}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your company..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Creating Profile...' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    },
    header: {
      padding: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    form: {
      padding: 24,
      gap: 24,
      paddingBottom: 48,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    pills: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    pillSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    pillTextSelected: {
      color: '#FFFFFF',
    },
    button: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
      padding: 8,
      backgroundColor: `${colors.error}15`,
      borderRadius: 8,
      marginHorizontal: 24,
    },
  });
}
