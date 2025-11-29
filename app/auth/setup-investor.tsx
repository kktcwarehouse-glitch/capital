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

const investorTypes = ['Angel Investor', 'VC Fund', 'Corporate VC', 'Family Office', 'Other'];
const sectors = ALL_SECTORS;

export default function SetupInvestorScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [investorType, setInvestorType] = useState('');
  const [location, setLocation] = useState('');
  const [minInvestment, setMinInvestment] = useState('');
  const [maxInvestment, setMaxInvestment] = useState('');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSector = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter((s) => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const handleSubmit = async () => {
    if (!name || !investorType || !location) {
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
        .from('investor_profiles')
        .upsert({
          user_id: user.id,
          name,
          company: company || null,
          investor_type: investorType,
          location,
          investment_range_min: minInvestment ? parseFloat(minInvestment) : null,
          investment_range_max: maxInvestment ? parseFloat(maxInvestment) : null,
          sectors_of_interest: selectedSectors,
          bio: bio || null,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error creating investor profile:', upsertError);
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
            <Text style={styles.title}>Setup Your Investor Profile</Text>
            <Text style={styles.subtitle}>
              Help startups understand your investment focus
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Company / Fund</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter company name"
                placeholderTextColor={colors.textSecondary}
                value={company}
                onChangeText={setCompany}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Investor Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pills}>
                  {investorTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pill,
                        investorType === type && styles.pillSelected,
                      ]}
                      onPress={() => setInvestorType(type)}>
                      <Text
                        style={[
                          styles.pillText,
                          investorType === type && styles.pillTextSelected,
                        ]}>
                        {type}
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

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Min Investment (USD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 50000"
                  placeholderTextColor={colors.textSecondary}
                  value={minInvestment}
                  onChangeText={setMinInvestment}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Max Investment (USD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 500000"
                  placeholderTextColor={colors.textSecondary}
                  value={maxInvestment}
                  onChangeText={setMaxInvestment}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sectors of Interest</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pills}>
                  {sectors.map((sector) => (
                    <TouchableOpacity
                      key={sector}
                      style={[
                        styles.pill,
                        selectedSectors.includes(sector) && styles.pillSelected,
                      ]}
                      onPress={() => toggleSector(sector)}>
                      <Text
                        style={[
                          styles.pillText,
                          selectedSectors.includes(sector) &&
                            styles.pillTextSelected,
                        ]}>
                        {sector}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell startups about yourself..."
                placeholderTextColor={colors.textSecondary}
                value={bio}
                onChangeText={setBio}
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
    row: {
      flexDirection: 'row',
      gap: 16,
    },
    flex1: {
      flex: 1,
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
