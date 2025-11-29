import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { StartupProfile, InvestorProfile, StartupMedia } from '@/types';
import { LogOut, CreditCard as Edit, User, Building2, TrendingUp, Image as ImageIcon, Video, FileText, Play, Shield } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image, FlatList, Dimensions } from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user, profile, signOut, isAdmin } = useAuth();
  const [roleProfile, setRoleProfile] = useState<StartupProfile | InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<StartupMedia[]>([]);

  useEffect(() => {
    fetchRoleProfile();
  }, [profile]);

  useFocusEffect(
    React.useCallback(() => {
      // Always refetch when screen comes into focus to get latest data
      fetchRoleProfile();
    }, [profile?.id])
  );


  const fetchRoleProfile = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // Admins don't have role-specific profiles
    if (profile.role === 'admin' || profile.is_admin) {
      setLoading(false);
      setRoleProfile(null);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching role profile:', { role: profile.role, user_id: profile.id });
      
      if (profile.role === 'startup') {
        const { data, error } = await supabase
          .from('startup_profiles')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        console.log('Startup profile result:', { data, error: error?.message });

        if (error) {
          console.error('Error fetching startup profile:', error);
          setRoleProfile(null);
        } else if (data) {
          setRoleProfile(data as StartupProfile);
          // Fetch media for startup
          fetchStartupMedia(data.id);
        } else {
          console.log('No startup profile found for user');
          setRoleProfile(null);
        }
      } else if (profile.role === 'investor') {
        const { data, error } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        console.log('Investor profile result:', { data, error: error?.message });

        if (error) {
          console.error('Error fetching investor profile:', error);
          setRoleProfile(null);
        } else if (data) {
          setRoleProfile(data as InvestorProfile);
        } else {
          console.log('No investor profile found for user');
          setRoleProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setRoleProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStartupMedia = async (startupId: string) => {
    try {
      const { data } = await supabase
        .from('startup_media')
        .select('*')
        .eq('startup_id', startupId)
        .order('display_order', { ascending: true })
        .limit(6);

      if (data) {
        setMedia(data);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
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
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={fetchRoleProfile}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/settings/edit-profile')}>
              <Edit size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {roleProfile && profile?.role === 'startup' && (roleProfile as StartupProfile).logo_url ? (
              <Image
                source={{ uri: (roleProfile as StartupProfile).logo_url! }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : roleProfile && profile?.role === 'investor' && (roleProfile as InvestorProfile).avatar_url ? (
              <Image
                source={{ uri: (roleProfile as InvestorProfile).avatar_url! }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {roleProfile
                  ? profile?.role === 'startup'
                    ? (roleProfile as StartupProfile).company_name?.charAt(0).toUpperCase() || '?'
                    : (roleProfile as InvestorProfile).name?.charAt(0).toUpperCase() || '?'
                  : '?'}
              </Text>
            )}
          </View>

          <Text style={styles.name}>
            {roleProfile
              ? profile?.role === 'startup'
                ? (roleProfile as StartupProfile).company_name
                : (roleProfile as InvestorProfile).name
              : profile?.role === 'admin' || profile?.is_admin
              ? 'Admin'
              : 'User'}
          </Text>

          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {profile?.role === 'startup' ? 'Startup' : profile?.role === 'investor' ? 'Investor' : 'Admin'}
            </Text>
          </View>

          {!roleProfile && (
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push('/settings/edit-profile')}>
              <Text style={styles.setupButtonText}>
                Complete Your Profile Setup
              </Text>
            </TouchableOpacity>
          )}

          {roleProfile && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/settings/edit-profile')}>
              <Edit size={18} color={colors.primary} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>


        {roleProfile && profile?.role === 'startup' && (
          <>
            {/* Media Gallery */}
            {media.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderWithButton}>
                  <Text style={styles.sectionTitle}>Media Gallery</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/settings/manage-media')}
                    style={styles.viewAllButton}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.mediaGrid}>
                  {media.slice(0, 6).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.mediaThumbnail}
                      onPress={() => router.push('/settings/manage-media')}>
                      {item.media_type === 'image' && (
                        <Image
                          source={{ uri: item.file_url }}
                          style={styles.mediaThumbnailImage}
                          resizeMode="cover"
                        />
                      )}
                      {item.media_type === 'video' && (
                        <View style={styles.mediaThumbnailPlaceholder}>
                          <Video size={24} color={colors.primary} />
                        </View>
                      )}
                      {item.media_type === 'document' && (
                        <View style={styles.mediaThumbnailPlaceholder}>
                          <FileText size={24} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Info</Text>
              <View style={styles.infoCard}>
                <InfoRow
                  label="Sector"
                  value={(roleProfile as StartupProfile).sector}
                  colors={colors}
                />
                <InfoRow
                  label="Stage"
                  value={(roleProfile as StartupProfile).stage}
                  colors={colors}
                />
                <InfoRow
                  label="Location"
                  value={(roleProfile as StartupProfile).location}
                  colors={colors}
                />
                {(roleProfile as StartupProfile).funding_goal > 0 && (
                  <InfoRow
                    label="Funding Goal"
                    value={`$${((roleProfile as StartupProfile).funding_goal / 1000).toFixed(0)}K`}
                    colors={colors}
                  />
                )}
              </View>
            </View>
          </>
        )}

        {roleProfile && profile?.role === 'investor' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investor Info</Text>
            <View style={styles.infoCard}>
              <InfoRow
                label="Type"
                value={(roleProfile as InvestorProfile).investor_type}
                colors={colors}
              />
              <InfoRow
                label="Location"
                value={(roleProfile as InvestorProfile).location}
                colors={colors}
              />
              {(roleProfile as InvestorProfile).company && (
                <InfoRow
                  label="Company"
                  value={(roleProfile as InvestorProfile).company!}
                  colors={colors}
                />
              )}
            </View>
          </View>
        )}

        {profile?.role === 'startup' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => router.push('/settings/manage-media')}>
              <ImageIcon size={20} color={colors.primary} />
              <Text style={styles.mediaButtonText}>Manage Media</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin/dashboard')}>
              <Shield size={20} color={colors.primary} />
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}>
            <LogOut size={20} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{value}</Text>
    </View>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      paddingBottom: 16,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    refreshText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    iconButton: {
      padding: 8,
    },
    profileCard: {
      backgroundColor: colors.card,
      marginHorizontal: 24,
      marginBottom: 24,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
    },
    name: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    section: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.error}15`,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
    },
    mediaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.primary}15`,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    mediaButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    setupButton: {
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    setupButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    editProfileButton: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    editProfileButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    sectionHeaderWithButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    viewAllButton: {
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    mediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mediaThumbnail: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mediaThumbnailImage: {
      width: '100%',
      height: '100%',
    },
    mediaThumbnailPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: `${colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adminButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${colors.primary}15`,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    adminButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
