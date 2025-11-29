import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { StartupProfile, InvestorProfile } from '@/types';
import { Building2, User, Search, Star, StarOff, Shield, Trash2, Eye, X, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Modal, Alert } from 'react-native';

type TabType = 'startups' | 'investors';

export default function AdminDashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('startups');
  const [startups, setStartups] = useState<StartupProfile[]>([]);
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StartupProfile | InvestorProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/profile');
      return;
    }
    fetchData();
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'startups') {
        const { data, error } = await supabase
          .from('startup_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching startups:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          
          // Check if column doesn't exist
          if (error.message?.includes('column') && error.message?.includes('does not exist')) {
            Alert.alert(
              'Database Migration Required',
              'The is_featured column does not exist. Please run QUICK_FIX_FEATURED.sql in Supabase SQL Editor.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Error', `Failed to fetch startups: ${error.message}`);
          }
        } else {
          console.log('✅ Fetched startups:', data?.length, 'items');
          // Log featured status for debugging - check both true and truthy values
          const featured = data?.filter(s => s.is_featured === true || s.is_featured === 'true') || [];
          const featuredCount = featured.length;
          console.log('⭐ Featured startups:', featuredCount);
          if (featuredCount > 0) {
            console.log('Featured companies:', featured.map(s => `${s.company_name} (is_featured: ${s.is_featured})`));
          }
          // Ensure is_featured is boolean
          const normalizedData = data?.map(item => ({
            ...item,
            is_featured: item.is_featured === true || item.is_featured === 'true' || item.is_featured === 1
          })) || [];
          setStartups(normalizedData);
        }
      } else {
        const { data, error } = await supabase
          .from('investor_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching investors:', error);
          Alert.alert('Error', `Failed to fetch investors: ${error.message}`);
        } else {
          console.log('Fetched investors:', data?.length, 'items');
          setInvestors(data || []);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', `Failed to fetch data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (id: string, isFeatured: boolean, type: 'startup' | 'investor') => {
    setUpdating(id);
    try {
      const table = type === 'startup' ? 'startup_profiles' : 'investor_profiles';
      const newFeaturedStatus = !isFeatured;
      
      console.log(`Updating ${type} ${id}: is_featured = ${newFeaturedStatus}`);
      
      // First, verify the row exists and get current state
      const { data: existingData, error: fetchError } = await supabase
        .from(table)
        .select('id, is_featured')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching existing data:', fetchError);
        Alert.alert('Error', `Failed to verify record: ${fetchError.message}`);
        setUpdating(null);
        return;
      }
      
      console.log('Current state:', existingData);
      
      // Perform the update
      const { data, error } = await supabase
        .from(table)
        .update({ is_featured: newFeaturedStatus })
        .eq('id', id)
        .select()
        .single(); // Use single() instead of select() to get one row

      if (error) {
        console.error('Error updating featured status:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Check if column doesn't exist
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          Alert.alert(
            'Database Error',
            'The is_featured column does not exist. Please run QUICK_FIX_FEATURED.sql in Supabase SQL Editor.',
            [{ text: 'OK' }]
          );
        } else if (error.code === 'PGRST116') {
          // No rows returned - RLS might be blocking
          console.error('RLS Policy Issue: Update succeeded but select is blocked');
          // Try to verify by fetching again
          const { data: verifyData } = await supabase
            .from(table)
            .select('id, is_featured')
            .eq('id', id)
            .single();
          
          if (verifyData && verifyData.is_featured === newFeaturedStatus) {
            console.log('✅ Update verified via separate query');
            Alert.alert('Success', `Company ${newFeaturedStatus ? 'marked as' : 'removed from'} featured`);
            await fetchData();
            setUpdating(null);
            return;
          } else {
            Alert.alert('Error', 'Update may have failed due to RLS policies. Please check admin permissions.');
          }
        } else {
          Alert.alert('Error', `Failed to update featured status: ${error.message || 'Unknown error'}`);
        }
      } else {
        console.log('Successfully updated:', data);
        console.log('Updated record:', JSON.stringify(data, null, 2));
        
        // Verify the update worked
        if (data && data.is_featured === newFeaturedStatus) {
          console.log('✅ Update verified in response');
        } else {
          console.warn('⚠️ Update response does not match expected value');
          // Try fetching again to verify
          const { data: verifyData } = await supabase
            .from(table)
            .select('id, is_featured')
            .eq('id', id)
            .single();
          console.log('Verification fetch:', verifyData);
        }
        
        // Update selected item if it's the same
        if (selectedItem && selectedItem.id === id) {
          const updated = type === 'startup' 
            ? { ...selectedItem as StartupProfile, is_featured: newFeaturedStatus }
            : { ...selectedItem as InvestorProfile, is_featured: newFeaturedStatus };
          setSelectedItem(updated);
        }
        
        // Force refresh data
        await fetchData();
        
        // Show success message
        Alert.alert('Success', `Company ${newFeaturedStatus ? 'marked as' : 'removed from'} featured`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', `Failed to update featured status: ${error.message || 'Unknown error'}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = (id: string, name: string, type: 'startup' | 'investor') => {
    Alert.alert(
      'Delete Confirmation',
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(id);
            try {
              const table = type === 'startup' ? 'startup_profiles' : 'investor_profiles';
              const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

              if (error) {
                console.error('Error deleting:', error);
                Alert.alert('Error', 'Failed to delete. This may be due to related records.');
              } else {
                // Close modal if viewing deleted item
                if (selectedItem && selectedItem.id === id) {
                  setShowDetailModal(false);
                  setSelectedItem(null);
                }
                // Refresh data
                await fetchData();
              }
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Failed to delete');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (item: StartupProfile | InvestorProfile, type: 'startup' | 'investor') => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const filteredStartups = startups.filter((startup) =>
    startup.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    startup.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvestors = investors.filter((investor) =>
    investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Shield size={24} color={colors.primary} />
            <Text style={styles.title}>Admin Dashboard</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'startups' && styles.tabActive]}
            onPress={() => setActiveTab('startups')}>
            <Building2 size={18} color={activeTab === 'startups' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'startups' && styles.tabTextActive]}>
              Startups ({startups.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'investors' && styles.tabActive]}
            onPress={() => setActiveTab('investors')}>
            <User size={18} color={activeTab === 'investors' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'investors' && styles.tabTextActive]}>
              Investors ({investors.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {activeTab === 'startups' ? (
            <>
              {filteredStartups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No startups found</Text>
                </View>
              ) : (
                filteredStartups.map((startup) => (
                  <ProfileCard
                    key={startup.id}
                    type="startup"
                    startup={startup}
                    isFeatured={startup.is_featured || false}
                    onToggleFeatured={() => toggleFeatured(startup.id, startup.is_featured || false, 'startup')}
                    onViewDetails={() => handleViewDetails(startup, 'startup')}
                    onDelete={() => handleDelete(startup.id, startup.company_name, 'startup')}
                    updating={updating === startup.id}
                    deleting={deleting === startup.id}
                    colors={colors}
                  />
                ))
              )}
            </>
          ) : (
            <>
              {filteredInvestors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No investors found</Text>
                </View>
              ) : (
                filteredInvestors.map((investor) => (
                  <ProfileCard
                    key={investor.id}
                    type="investor"
                    investor={investor}
                    isFeatured={investor.is_featured || false}
                    onToggleFeatured={() => toggleFeatured(investor.id, investor.is_featured || false, 'investor')}
                    onViewDetails={() => handleViewDetails(investor, 'investor')}
                    onDelete={() => handleDelete(investor.id, investor.name, 'investor')}
                    updating={updating === investor.id}
                    deleting={deleting === investor.id}
                    colors={colors}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}>
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            type={activeTab === 'startups' ? 'startup' : 'investor'}
            isFeatured={(selectedItem as any).is_featured || false}
            onToggleFeatured={() => {
              if (activeTab === 'startups') {
                toggleFeatured(selectedItem.id, (selectedItem as StartupProfile).is_featured || false, 'startup');
              } else {
                toggleFeatured(selectedItem.id, (selectedItem as InvestorProfile).is_featured || false, 'investor');
              }
            }}
            onDelete={() => {
              if (activeTab === 'startups') {
                handleDelete(selectedItem.id, (selectedItem as StartupProfile).company_name, 'startup');
              } else {
                handleDelete(selectedItem.id, (selectedItem as InvestorProfile).name, 'investor');
              }
            }}
            onClose={() => setShowDetailModal(false)}
            updating={updating === selectedItem.id}
            deleting={deleting === selectedItem.id}
            colors={colors}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

type ProfileCardProps = {
  type: 'startup' | 'investor';
  startup?: StartupProfile;
  investor?: InvestorProfile;
  isFeatured: boolean;
  onToggleFeatured: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  updating: boolean;
  deleting: boolean;
  colors: typeof Colors.light;
};

function ProfileCard({ type, startup, investor, isFeatured, onToggleFeatured, onViewDetails, onDelete, updating, deleting, colors }: ProfileCardProps) {
  const styles = createStyles(colors);
  const name = type === 'startup' ? startup!.company_name : investor!.name;
  const subtitle = type === 'startup' 
    ? `${startup!.sector} • ${startup!.location}`
    : `${investor!.investor_type} • ${investor!.location}`;

  return (
    <TouchableOpacity 
      style={[styles.card, isFeatured && styles.featuredCard]}
      onPress={onViewDetails}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
            {isFeatured && (
              <View style={styles.featuredBadge}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}>
          <Eye size={18} color={colors.primary} />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>

        <View style={styles.featuredToggle}>
          <Text style={styles.featuredLabel}>Featured</Text>
          {updating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity
              style={styles.starButton}
              onPress={(e) => {
                e.stopPropagation();
                onToggleFeatured();
              }}
              disabled={updating}>
              {isFeatured ? (
                <Star size={20} color="#FFD700" fill="#FFD700" />
              ) : (
                <StarOff size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Trash2 size={18} color={colors.error} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      marginBottom: 16,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featuredCard: {
      borderColor: '#FFD700',
      borderWidth: 2,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    cardHeader: {
      marginBottom: 12,
    },
    cardInfo: {
      flex: 1,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    featuredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${'#FFD700'}20`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    featuredBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFD700',
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    featuredToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    featuredLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    starButton: {
      padding: 4,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: `${colors.primary}15`,
      borderRadius: 8,
    },
    viewButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    deleteButton: {
      padding: 8,
    },
  });
}

type DetailModalProps = {
  item: StartupProfile | InvestorProfile;
  type: 'startup' | 'investor';
  isFeatured: boolean;
  onToggleFeatured: () => void;
  onDelete: () => void;
  onClose: () => void;
  updating: boolean;
  deleting: boolean;
  colors: typeof Colors.light;
};

function DetailModal({ item, type, isFeatured, onToggleFeatured, onDelete, onClose, updating, deleting, colors }: DetailModalProps) {
  const styles = createDetailStyles(colors);
  const startup = type === 'startup' ? item as StartupProfile : null;
  const investor = type === 'investor' ? item as InvestorProfile : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'startup' ? 'Startup Details' : 'Investor Details'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {type === 'startup' && startup && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Information</Text>
              <View style={styles.infoCard}>
                <InfoRow label="Company Name" value={startup.company_name} colors={colors} />
                <InfoRow label="Sector" value={startup.sector} colors={colors} />
                <InfoRow label="Stage" value={startup.stage} colors={colors} />
                <InfoRow label="Location" value={startup.location} colors={colors} />
                {startup.funding_goal > 0 && (
                  <InfoRow 
                    label="Funding Goal" 
                    value={`$${(startup.funding_goal / 1000).toFixed(0)}K`} 
                    colors={colors} 
                  />
                )}
                {startup.team_size && (
                  <InfoRow label="Team Size" value={startup.team_size.toString()} colors={colors} />
                )}
                {startup.founded_year && (
                  <InfoRow label="Founded Year" value={startup.founded_year.toString()} colors={colors} />
                )}
                {startup.website && (
                  <InfoRow label="Website" value={startup.website} colors={colors} />
                )}
              </View>
            </View>

            {startup.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.descriptionText}>{startup.description}</Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <View style={styles.infoCard}>
                <InfoRow label="User ID" value={startup.user_id} colors={colors} />
                <InfoRow label="Profile ID" value={startup.id} colors={colors} />
                <InfoRow 
                  label="Created" 
                  value={new Date(startup.created_at).toLocaleDateString()} 
                  colors={colors} 
                />
                <InfoRow 
                  label="Updated" 
                  value={new Date(startup.updated_at).toLocaleDateString()} 
                  colors={colors} 
                />
              </View>
            </View>
          </>
        )}

        {type === 'investor' && investor && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Investor Information</Text>
              <View style={styles.infoCard}>
                <InfoRow label="Name" value={investor.name} colors={colors} />
                <InfoRow label="Type" value={investor.investor_type} colors={colors} />
                <InfoRow label="Location" value={investor.location} colors={colors} />
                {investor.company && (
                  <InfoRow label="Company" value={investor.company} colors={colors} />
                )}
                {investor.investment_range_min && investor.investment_range_max && (
                  <InfoRow 
                    label="Investment Range" 
                    value={`$${(investor.investment_range_min / 1000).toFixed(0)}K - $${(investor.investment_range_max / 1000).toFixed(0)}K`} 
                    colors={colors} 
                  />
                )}
                {investor.sectors_of_interest && investor.sectors_of_interest.length > 0 && (
                  <InfoRow 
                    label="Sectors of Interest" 
                    value={investor.sectors_of_interest.join(', ')} 
                    colors={colors} 
                  />
                )}
              </View>
            </View>

            {investor.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.descriptionText}>{investor.bio}</Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <View style={styles.infoCard}>
                <InfoRow label="User ID" value={investor.user_id} colors={colors} />
                <InfoRow label="Profile ID" value={investor.id} colors={colors} />
                <InfoRow 
                  label="Created" 
                  value={new Date(investor.created_at).toLocaleDateString()} 
                  colors={colors} 
                />
                <InfoRow 
                  label="Updated" 
                  value={new Date(investor.updated_at).toLocaleDateString()} 
                  colors={colors} 
                />
              </View>
            </View>
          </>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.featuredButton, isFeatured && styles.featuredButtonActive]}
            onPress={onToggleFeatured}
            disabled={updating}>
            {updating ? (
              <ActivityIndicator size="small" color={isFeatured ? "#FFD700" : colors.text} />
            ) : (
              <>
                {isFeatured ? (
                  <Star size={20} color="#FFD700" fill="#FFD700" />
                ) : (
                  <StarOff size={20} color={colors.text} />
                )}
                <Text style={[styles.actionButtonText, isFeatured && styles.featuredButtonText]}>
                  {isFeatured ? 'Remove Featured' : 'Make Featured'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={onDelete}
            disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Trash2 size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: typeof Colors.light }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 2, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function createDetailStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    headerRight: {
      width: 40,
      alignItems: 'flex-end',
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    descriptionText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    actionsSection: {
      padding: 16,
      gap: 12,
      paddingBottom: 32,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    featuredButton: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    featuredButtonActive: {
      borderColor: '#FFD700',
      backgroundColor: `${'#FFD700'}15`,
    },
    featuredButtonText: {
      color: '#FFD700',
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    deleteButton: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    deleteButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}

