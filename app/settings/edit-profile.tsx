import { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { ArrowLeft, Upload, X, Plus, Trash2, FileText } from 'lucide-react-native';
import { StartupProfile, InvestorProfile, Founder } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { ALL_SECTORS } from '@/constants/Sectors';
import * as DocumentPicker from 'expo-document-picker';

const sectors = ALL_SECTORS;
const stages = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
const investorTypes = ['Angel Investor', 'VC Fund', 'Corporate VC', 'Family Office', 'Other'];

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [startupData, setStartupData] = useState<Partial<StartupProfile>>({});
  const [investorData, setInvestorData] = useState<Partial<InvestorProfile>>({});
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [uploadingFounderPhoto, setUploadingFounderPhoto] = useState<number | null>(null);
  const [uploadingPitchDeck, setUploadingPitchDeck] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [profile]);

  const fetchProfileData = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'startup') {
        const { data } = await supabase
          .from('startup_profiles')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (data) {
          setStartupData(data);
          // Parse founders from JSONB
          if (data.founders && Array.isArray(data.founders)) {
            setFounders(data.founders);
          } else {
            setFounders([]);
          }
        }
      } else {
        const { data } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (data) {
          setInvestorData(data);
          setSelectedSectors(data.sectors_of_interest || []);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSector = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter((s) => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const pickLogo = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image upload is not available in web preview. Please use a mobile device or development build.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadLogo(asset.uri);
    }
  };

  const uploadLogo = async (uri: string) => {
    if (!user || !profile) return;

    setUploadingLogo(true);

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      const bucketName = profile.role === 'startup' ? 'startup-images' : 'startup-images'; // Using same bucket for now
      const filePath = `${user.id}/logo-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload logo');
        setUploadingLogo(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (profile.role === 'startup') {
        setStartupData({ ...startupData, logo_url: urlData.publicUrl });
      } else {
        setInvestorData({ ...investorData, avatar_url: urlData.publicUrl });
      }

      Alert.alert('Success', 'Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Error', 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    if (profile?.role === 'startup') {
      setStartupData({ ...startupData, logo_url: undefined });
    } else {
      setInvestorData({ ...investorData, avatar_url: undefined });
    }
  };

  const pickPitchDeck = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Document upload is not available in web preview. Please use a mobile device or development build.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPitchDeck(result.assets[0].uri, result.assets[0].name || 'pitch-deck.pdf');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadPitchDeck = async (uri: string, fileName: string) => {
    if (!user || !profile || profile.role !== 'startup') return;

    setUploadingPitchDeck(true);

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      const bucketName = 'startup-documents';
      const filePath = `${user.id}/pitch-deck-${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload pitch deck');
        setUploadingPitchDeck(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setStartupData({ ...startupData, pitch_deck_url: urlData.publicUrl });
      Alert.alert('Success', 'Pitch deck uploaded successfully');
    } catch (error) {
      console.error('Error uploading pitch deck:', error);
      Alert.alert('Error', 'Failed to upload pitch deck');
    } finally {
      setUploadingPitchDeck(false);
    }
  };

  const removePitchDeck = () => {
    setStartupData({ ...startupData, pitch_deck_url: undefined });
  };

  const addFounder = () => {
    setFounders([...founders, { name: '', previous_experience: '', key_roles: '' }]);
  };

  const removeFounder = (index: number) => {
    setFounders(founders.filter((_, i) => i !== index));
  };

  const updateFounder = (index: number, field: keyof Founder, value: string) => {
    const updated = [...founders];
    updated[index] = { ...updated[index], [field]: value };
    setFounders(updated);
  };

  const pickFounderPhoto = async (index: number) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image upload is not available in web preview.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && user) {
      setUploadingFounderPhoto(index);
      try {
        const response = await fetch(result.assets[0].uri);
        const arrayBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);
        const filePath = `${user.id}/founder-${Date.now()}-${index}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('startup-images')
          .upload(filePath, fileBytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          Alert.alert('Error', 'Failed to upload photo');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('startup-images')
          .getPublicUrl(filePath);

        updateFounder(index, 'photo_url', urlData.publicUrl);
      } catch (error) {
        Alert.alert('Error', 'Failed to upload photo');
      } finally {
        setUploadingFounderPhoto(null);
      }
    }
  };

  const handleSave = async () => {
    if (!profile || !user) {
      setError('User not found. Please sign in again.');
      return;
    }

    // Validate required fields
    if (profile.role === 'startup') {
      if (!startupData.company_name || !startupData.sector || !startupData.location || !startupData.stage) {
        setError('Please fill in all required fields');
        return;
      }
    } else {
      if (!investorData.name || !investorData.investor_type || !investorData.location) {
        setError('Please fill in all required fields');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      if (profile.role === 'startup') {
        const profileData: any = {
          user_id: profile.id,
          company_name: startupData.company_name,
          sector: startupData.sector,
          location: startupData.location,
          stage: startupData.stage,
          funding_goal: startupData.funding_goal || 0,
          description: startupData.description || '',
          updated_at: new Date().toISOString(),
        };

        if (startupData.website) profileData.website = startupData.website;
        if (startupData.team_size) profileData.team_size = startupData.team_size;
        if (startupData.founded_year) profileData.founded_year = startupData.founded_year;
        if (startupData.logo_url !== undefined) profileData.logo_url = startupData.logo_url || null;
        if (startupData.pitch_deck_url !== undefined) profileData.pitch_deck_url = startupData.pitch_deck_url || null;
        // Founders
        profileData.founders = founders.length > 0 ? founders : [];
        // Business metrics
        if (startupData.monthly_recurring_revenue !== undefined) profileData.monthly_recurring_revenue = startupData.monthly_recurring_revenue || null;
        if (startupData.growth_percentage !== undefined) profileData.growth_percentage = startupData.growth_percentage || null;
        if (startupData.growth_period_months !== undefined) profileData.growth_period_months = startupData.growth_period_months || null;
        if (startupData.important_partnerships !== undefined) profileData.important_partnerships = startupData.important_partnerships || null;
        // Investment details
        if (startupData.equity_offered !== undefined) profileData.equity_offered = startupData.equity_offered || null;
        if (startupData.company_valuation_pre_money !== undefined) profileData.company_valuation_pre_money = startupData.company_valuation_pre_money || null;
        if (startupData.minimum_investment !== undefined) profileData.minimum_investment = startupData.minimum_investment || null;

        console.log('Upserting startup profile:', { user_id: profile.id, profileData });
        
        // Use upsert to create if doesn't exist, update if it does
        const { data, error: upsertError } = await supabase
          .from('startup_profiles')
          .upsert(profileData, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        console.log('Upsert result:', { data, error: upsertError });

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          throw upsertError;
        }

        if (!data) {
          throw new Error('Failed to save profile. Please try again.');
        }
      } else {
        const profileData: any = {
          user_id: profile.id,
          name: investorData.name,
          investor_type: investorData.investor_type,
          location: investorData.location,
          sectors_of_interest: selectedSectors,
          updated_at: new Date().toISOString(),
        };

        if (investorData.company) profileData.company = investorData.company;
        if (investorData.investment_range_min !== undefined) profileData.investment_range_min = investorData.investment_range_min;
        if (investorData.investment_range_max !== undefined) profileData.investment_range_max = investorData.investment_range_max;
        if (investorData.bio) profileData.bio = investorData.bio;
        if (investorData.avatar_url !== undefined) profileData.avatar_url = investorData.avatar_url || null;

        console.log('Upserting investor profile:', { user_id: profile.id, profileData });
        
        // Use upsert to create if doesn't exist, update if it does
        const { data, error: upsertError } = await supabase
          .from('investor_profiles')
          .upsert(profileData, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        console.log('Upsert result:', { data, error: upsertError });

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          throw upsertError;
        }

        if (!data) {
          throw new Error('Failed to save profile. Please try again.');
        }
      }

      // Refresh the auth profile
      await refreshProfile();
      
      // Navigate back - the profile screen will refresh via useFocusEffect
      router.back();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView style={styles.content}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {profile?.role === 'startup' ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Company Logo</Text>
                <View style={styles.logoSection}>
                  <View style={styles.logoContainer}>
                    {startupData.logo_url ? (
                      <>
                        <Image
                          source={{ uri: startupData.logo_url }}
                          style={styles.logoImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeLogoButton}
                          onPress={removeLogo}>
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoPlaceholderText}>
                          {startupData.company_name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadLogoButton, uploadingLogo && styles.uploadLogoButtonDisabled]}
                    onPress={pickLogo}
                    disabled={uploadingLogo}>
                    <Upload size={16} color={colors.primary} />
                    <Text style={styles.uploadLogoButtonText}>
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Company Name *</Text>
                <TextInput
                  style={styles.input}
                  value={startupData.company_name || ''}
                  onChangeText={(text) =>
                    setStartupData({ ...startupData, company_name: text })
                  }
                  placeholder="Enter company name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Sector *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.pills}>
                    {sectors.map((sector) => (
                      <TouchableOpacity
                        key={sector}
                        style={[
                          styles.pill,
                          startupData.sector === sector && styles.pillSelected,
                        ]}
                        onPress={() =>
                          setStartupData({ ...startupData, sector })
                        }>
                        <Text
                          style={[
                            styles.pillText,
                            startupData.sector === sector &&
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
                <Text style={styles.label}>Location *</Text>
                <TextInput
                  style={styles.input}
                  value={startupData.location || ''}
                  onChangeText={(text) =>
                    setStartupData({ ...startupData, location: text })
                  }
                  placeholder="City, Country"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Stage *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.pills}>
                    {stages.map((stage) => (
                      <TouchableOpacity
                        key={stage}
                        style={[
                          styles.pill,
                          startupData.stage === stage && styles.pillSelected,
                        ]}
                        onPress={() => setStartupData({ ...startupData, stage })}>
                        <Text
                          style={[
                            styles.pillText,
                            startupData.stage === stage && styles.pillTextSelected,
                          ]}>
                          {stage}
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
                  value={startupData.funding_goal?.toString() || ''}
                  onChangeText={(text) =>
                    setStartupData({
                      ...startupData,
                      funding_goal: parseFloat(text) || 0,
                    })
                  }
                  placeholder="e.g., 500000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={startupData.description || ''}
                  onChangeText={(text) =>
                    setStartupData({ ...startupData, description: text })
                  }
                  placeholder="Tell us about your company..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={startupData.website || ''}
                  onChangeText={(text) =>
                    setStartupData({ ...startupData, website: text })
                  }
                  placeholder="https://example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Pitch Deck Section */}
              <View style={styles.field}>
                <Text style={styles.label}>Pitch Deck</Text>
                {startupData.pitch_deck_url ? (
                  <View style={styles.pitchDeckContainer}>
                    <View style={styles.pitchDeckInfo}>
                      <FileText size={20} color={colors.primary} />
                      <Text style={styles.pitchDeckText} numberOfLines={1}>
                        Pitch Deck Uploaded
                      </Text>
                    </View>
                    <View style={styles.pitchDeckActions}>
                      <TouchableOpacity
                        style={styles.pitchDeckButton}
                        onPress={() => {
                          if (startupData.pitch_deck_url) {
                            Linking.openURL(startupData.pitch_deck_url);
                          }
                        }}>
                        <Text style={styles.pitchDeckButtonText}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pitchDeckButton, styles.pitchDeckButtonRemove]}
                        onPress={removePitchDeck}>
                        <X size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadPitchDeckButton, uploadingPitchDeck && styles.uploadPitchDeckButtonDisabled]}
                    onPress={pickPitchDeck}
                    disabled={uploadingPitchDeck}>
                    {uploadingPitchDeck ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Upload size={20} color={colors.primary} />
                        <Text style={styles.uploadPitchDeckButtonText}>
                          Upload Pitch Deck (PDF, PPT)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Team Size</Text>
                  <TextInput
                    style={styles.input}
                    value={startupData.team_size?.toString() || ''}
                    onChangeText={(text) =>
                      setStartupData({
                        ...startupData,
                        team_size: parseInt(text) || undefined,
                      })
                    }
                    placeholder="e.g., 5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Founded Year</Text>
                  <TextInput
                    style={styles.input}
                    value={startupData.founded_year?.toString() || ''}
                    onChangeText={(text) =>
                      setStartupData({
                        ...startupData,
                        founded_year: parseInt(text) || undefined,
                      })
                    }
                    placeholder="e.g., 2023"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Founders Section */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeaderText}>Founders</Text>
              {founders.map((founder, index) => (
                <View key={index} style={styles.founderCard}>
                  <View style={styles.founderHeader}>
                    <Text style={styles.founderNumber}>Founder {index + 1}</Text>
                    {founders.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeFounderButton}
                        onPress={() => removeFounder(index)}>
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.founderPhotoSection}>
                    <TouchableOpacity
                      style={styles.founderPhotoContainer}
                      onPress={() => pickFounderPhoto(index)}>
                      {founder.photo_url ? (
                        <Image
                          source={{ uri: founder.photo_url }}
                          style={styles.founderPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.founderPhotoPlaceholder}>
                          <Text style={styles.founderPhotoPlaceholderText}>
                            {founder.name?.charAt(0).toUpperCase() || '+'}
                          </Text>
                        </View>
                      )}
                      {uploadingFounderPhoto === index && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.founderPhotoLabel}>Tap to add photo</Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={founder.name || ''}
                      onChangeText={(text) => updateFounder(index, 'name', text)}
                      placeholder="Founder name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Previous Experience</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={founder.previous_experience || ''}
                      onChangeText={(text) => updateFounder(index, 'previous_experience', text)}
                      placeholder="Previous companies, roles, achievements..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Key Roles</Text>
                    <TextInput
                      style={styles.input}
                      value={founder.key_roles || ''}
                      onChangeText={(text) => updateFounder(index, 'key_roles', text)}
                      placeholder="e.g., CEO, CTO, Product Lead"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.addFounderButton}
                onPress={addFounder}>
                <Plus size={20} color={colors.primary} />
                <Text style={styles.addFounderButtonText}>Add Founder</Text>
              </TouchableOpacity>

              {/* Business Metrics Section */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeaderText}>Business Metrics</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Monthly Recurring Revenue (MRR) - USD</Text>
                <TextInput
                  style={styles.input}
                  value={startupData.monthly_recurring_revenue?.toString() || ''}
                  onChangeText={(text) =>
                    setStartupData({
                      ...startupData,
                      monthly_recurring_revenue: parseFloat(text) || undefined,
                    })
                  }
                  placeholder="e.g., 50000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Growth Percentage (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={startupData.growth_percentage?.toString() || ''}
                    onChangeText={(text) =>
                      setStartupData({
                        ...startupData,
                        growth_percentage: parseFloat(text) || undefined,
                      })
                    }
                    placeholder="e.g., 25"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Growth Period (months)</Text>
                  <TextInput
                    style={styles.input}
                    value={startupData.growth_period_months?.toString() || ''}
                    onChangeText={(text) => {
                      const months = parseInt(text);
                      if (months >= 6 && months <= 12) {
                        setStartupData({
                          ...startupData,
                          growth_period_months: months,
                        });
                      } else if (text === '') {
                        setStartupData({
                          ...startupData,
                          growth_period_months: undefined,
                        });
                      }
                    }}
                    placeholder="6-12"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Important Partnerships</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={startupData.important_partnerships || ''}
                  onChangeText={(text) =>
                    setStartupData({ ...startupData, important_partnerships: text })
                  }
                  placeholder="List key partnerships, clients, or strategic alliances..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Investment Details Section */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeaderText}>Investment Details</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Amount Needed (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={startupData.funding_goal?.toString() || ''}
                  onChangeText={(text) =>
                    setStartupData({
                      ...startupData,
                      funding_goal: parseFloat(text) || 0,
                    })
                  }
                  placeholder="e.g., 500000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Equity Offered (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={startupData.equity_offered?.toString() || ''}
                    onChangeText={(text) => {
                      const equity = parseFloat(text);
                      if (equity >= 0 && equity <= 100) {
                        setStartupData({
                          ...startupData,
                          equity_offered: equity,
                        });
                      } else if (text === '') {
                        setStartupData({
                          ...startupData,
                          equity_offered: undefined,
                        });
                      }
                    }}
                    placeholder="e.g., 20"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Company Valuation (Pre-money) - USD</Text>
                  <TextInput
                    style={styles.input}
                    value={startupData.company_valuation_pre_money?.toString() || ''}
                    onChangeText={(text) =>
                      setStartupData({
                        ...startupData,
                        company_valuation_pre_money: parseFloat(text) || undefined,
                      })
                    }
                    placeholder="e.g., 2000000"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Minimum Investment (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={startupData.minimum_investment?.toString() || ''}
                  onChangeText={(text) =>
                    setStartupData({
                      ...startupData,
                      minimum_investment: parseFloat(text) || undefined,
                    })
                  }
                  placeholder="e.g., 25000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Profile Picture</Text>
                <View style={styles.logoSection}>
                  <View style={styles.logoContainer}>
                    {investorData.avatar_url ? (
                      <>
                        <Image
                          source={{ uri: investorData.avatar_url }}
                          style={styles.logoImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeLogoButton}
                          onPress={removeLogo}>
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoPlaceholderText}>
                          {investorData.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadLogoButton, uploadingLogo && styles.uploadLogoButtonDisabled]}
                    onPress={pickLogo}
                    disabled={uploadingLogo}>
                    <Upload size={16} color={colors.primary} />
                    <Text style={styles.uploadLogoButtonText}>
                      {uploadingLogo ? 'Uploading...' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={investorData.name || ''}
                  onChangeText={(text) =>
                    setInvestorData({ ...investorData, name: text })
                  }
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Company / Fund</Text>
                <TextInput
                  style={styles.input}
                  value={investorData.company || ''}
                  onChangeText={(text) =>
                    setInvestorData({ ...investorData, company: text })
                  }
                  placeholder="Enter company name"
                  placeholderTextColor={colors.textSecondary}
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
                          investorData.investor_type === type &&
                            styles.pillSelected,
                        ]}
                        onPress={() =>
                          setInvestorData({ ...investorData, investor_type: type })
                        }>
                        <Text
                          style={[
                            styles.pillText,
                            investorData.investor_type === type &&
                              styles.pillTextSelected,
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
                  value={investorData.location || ''}
                  onChangeText={(text) =>
                    setInvestorData({ ...investorData, location: text })
                  }
                  placeholder="City, Country"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Min Investment</Text>
                  <TextInput
                    style={styles.input}
                    value={investorData.investment_range_min?.toString() || ''}
                    onChangeText={(text) =>
                      setInvestorData({
                        ...investorData,
                        investment_range_min: parseFloat(text) || undefined,
                      })
                    }
                    placeholder="50000"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>Max Investment</Text>
                  <TextInput
                    style={styles.input}
                    value={investorData.investment_range_max?.toString() || ''}
                    onChangeText={(text) =>
                      setInvestorData({
                        ...investorData,
                        investment_range_max: parseFloat(text) || undefined,
                      })
                    }
                    placeholder="500000"
                    placeholderTextColor={colors.textSecondary}
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
                  value={investorData.bio || ''}
                  onChangeText={(text) =>
                    setInvestorData({ ...investorData, bio: text })
                  }
                  placeholder="Tell startups about yourself..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    field: {
      marginBottom: 24,
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
    saveButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 48,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
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
      marginBottom: 16,
    },
    logoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    logoPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoPlaceholderText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '700',
    },
    removeLogoButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: colors.error,
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadLogoButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.primary}15`,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 12,
    },
    uploadLogoButtonDisabled: {
      opacity: 0.5,
    },
    uploadLogoButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    pitchDeckContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pitchDeckInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginLeft: 12,
    },
    pitchDeckText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
      flex: 1,
    },
    pitchDeckActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pitchDeckButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: `${colors.primary}15`,
      borderRadius: 8,
    },
    pitchDeckButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    pitchDeckButtonRemove: {
      backgroundColor: 'transparent',
      padding: 4,
    },
    uploadPitchDeckButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.primary}15`,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 12,
      borderStyle: 'dashed',
    },
    uploadPitchDeckButtonDisabled: {
      opacity: 0.5,
    },
    uploadPitchDeckButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 24,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    founderCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    founderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    founderNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    removeFounderButton: {
      padding: 4,
    },
    founderPhotoSection: {
      alignItems: 'center',
      marginBottom: 16,
    },
    founderPhotoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 8,
      position: 'relative',
    },
    founderPhoto: {
      width: '100%',
      height: '100%',
    },
    founderPhotoPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    founderPhotoPlaceholderText: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    founderPhotoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    addFounderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.primary}15`,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    addFounderButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
