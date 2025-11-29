import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { RefreshCw, Eye, MessageCircle, Heart, Users, Target, DollarSign, BarChart3, Search, Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { StartupCard } from '@/components/StartupCard';
import { StartupImageCard } from '@/components/StartupImageCard';
import { StartupProfile } from '@/types';
import { TextInput } from 'react-native';
import { FILTER_SECTORS } from '@/constants/Sectors';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics for startups
  const [analytics, setAnalytics] = useState({ views: 0, messages: 0, favorites: 0 });
  
  // Investor insights
  const [investorSectors, setInvestorSectors] = useState<{ sector: string; count: number }[]>([]);
  const [totalInvestors, setTotalInvestors] = useState(0);
  const [avgInvestmentRange, setAvgInvestmentRange] = useState({ min: 0, max: 0 });
  const [investorTypes, setInvestorTypes] = useState<{ type: string; count: number }[]>([]);
  
  // For investors - show startups
  const [startups, setStartups] = useState<StartupProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch analytics for startups
      if (profile?.role === 'startup' && user) {
        await fetchStartupAnalytics();
      }

      // Fetch investor insights
      await fetchInvestorInsights();

      // Fetch startups for investors and admins
      if (profile?.role === 'investor' || profile?.role === 'admin' || profile?.is_admin) {
        await fetchStartups();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'investor' && (selectedSector !== 'All' || selectedStage !== 'All')) {
      fetchStartups();
    }
  }, [selectedSector, selectedStage]);

  const fetchStartups = async () => {
    try {
      let query = supabase
        .from('startup_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedSector !== 'All') {
        query = query.eq('sector', selectedSector);
      }

      if (selectedStage !== 'All') {
        query = query.eq('stage', selectedStage);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching startups:', error);
        return;
      }

      if (data) {
        // Debug: Log featured startups
        const featured = data.filter(s => s.is_featured);
        if (featured.length > 0) {
          console.log('[Home] Featured startups found:', featured.map(s => s.company_name));
        }
        console.log('[Home] Total startups:', data.length, 'Featured:', featured.length);
        setStartups(data);
      }
    } catch (error) {
      console.error('Error fetching startups:', error);
    }
  };

  const fetchStartupAnalytics = async () => {
    if (!user || !profile) return;

    try {
      // Get user's startup profile
      const { data: startupProfile } = await supabase
        .from('startup_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!startupProfile) return;

      const [viewsResult, messagesResult, favoritesResult] = await Promise.all([
        supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('startup_id', startupProfile.id),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id),
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('startup_id', startupProfile.id),
      ]);

      setAnalytics({
        views: viewsResult.count || 0,
        messages: messagesResult.count || 0,
        favorites: favoritesResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchInvestorInsights = async () => {
    try {
      // Fetch all investor profiles
      const { data: investors, error } = await supabase
        .from('investor_profiles')
        .select('*');

      if (error) {
        console.error('Error fetching investors:', error);
        return;
      }

      if (!investors || investors.length === 0) {
        setTotalInvestors(0);
        setInvestorSectors([]);
        setInvestorTypes([]);
        return;
      }

      setTotalInvestors(investors.length);

      // Calculate most popular sectors among investors
      const sectorCounts: { [key: string]: number } = {};
      investors.forEach((investor) => {
        if (investor.sectors_of_interest && Array.isArray(investor.sectors_of_interest)) {
          investor.sectors_of_interest.forEach((sector: string) => {
            sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
          });
        }
      });

      const sortedInvestorSectors = Object.entries(sectorCounts)
        .map(([sector, count]) => ({ sector, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setInvestorSectors(sortedInvestorSectors);

      // Calculate investor types distribution
      const typeCounts: { [key: string]: number } = {};
      investors.forEach((investor) => {
        const type = investor.investor_type || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const sortedTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count: count as number }))
        .sort((a, b) => b.count - a.count);

      setInvestorTypes(sortedTypes);

      // Calculate average investment range
      const investorsWithRange = investors.filter(
        (inv) => inv.investment_range_min && inv.investment_range_max
      );

      if (investorsWithRange.length > 0) {
        const avgMin = investorsWithRange.reduce((sum, inv) => sum + (inv.investment_range_min || 0), 0) / investorsWithRange.length;
        const avgMax = investorsWithRange.reduce((sum, inv) => sum + (inv.investment_range_max || 0), 0) / investorsWithRange.length;
        setAvgInvestmentRange({ min: avgMin, max: avgMax });
      }
    } catch (error) {
      console.error('Error fetching investor insights:', error);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.logo}>FundLink</Text>
              <Text style={styles.tagline}>
                {profile?.role === 'startup' 
                  ? 'Track your performance and understand investor trends'
                  : profile?.role === 'admin' || profile?.is_admin
                  ? 'Manage profiles and featured listings'
                  : 'Discover promising startups and investment opportunities'}
              </Text>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <RefreshCw size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filters for Investors */}
        {profile?.role === 'investor' && (
          <View style={styles.searchSection}>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Search size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search startups..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={styles.filterToggleButton}
                onPress={() => setShowFilters(!showFilters)}>
                <Filter size={20} color={showFilters ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showFilters && (
              <View style={styles.filtersContainer}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Sector</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    <View style={styles.filterPills}>
                      {FILTER_SECTORS.map((sector) => (
                        <TouchableOpacity
                          key={sector}
                          style={[
                            styles.filterPill,
                            selectedSector === sector && styles.filterPillActive,
                          ]}
                          onPress={() => setSelectedSector(sector)}>
                          <Text
                            style={[
                              styles.filterPillText,
                              selectedSector === sector && styles.filterPillTextActive,
                            ]}>
                            {sector}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Stage</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    <View style={styles.filterPills}>
                      {['All', 'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'].map((stage) => (
                        <TouchableOpacity
                          key={stage}
                          style={[
                            styles.filterPill,
                            selectedStage === stage && styles.filterPillActive,
                          ]}
                          onPress={() => setSelectedStage(stage)}>
                          <Text
                            style={[
                              styles.filterPillText,
                              selectedStage === stage && styles.filterPillTextActive,
                            ]}>
                            {stage}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Startups List for Investors */}
        {profile?.role === 'investor' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Target size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Featured Startups</Text>
                <Text style={styles.sectionSubtitle}>Discover investment opportunities</Text>
              </View>
            </View>
            {startups.filter((startup) =>
              searchQuery === '' ||
              startup.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              startup.description.toLowerCase().includes(searchQuery.toLowerCase())
            ).length > 0 ? (
              <View style={styles.startupsList}>
                {startups
                  .filter((startup) =>
                    searchQuery === '' ||
                    startup.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    startup.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((startup) => (
                    <StartupImageCard key={startup.id} startup={startup} />
                  ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {searchQuery || selectedSector !== 'All' || selectedStage !== 'All'
                    ? 'No startups match your filters'
                    : 'No startups available yet'}
                </Text>
              </View>
            )}
          </View>
        )}


        {/* Analytics for Startups */}
        {profile?.role === 'startup' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <BarChart3 size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Performance Dashboard</Text>
                <Text style={styles.sectionSubtitle}>Track your engagement metrics</Text>
              </View>
            </View>
            <View style={styles.dashboardContainer}>
              <View style={styles.analyticsCard}>
                <View style={styles.analyticsCardHeader}>
                  <View style={[styles.analyticsIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                    <Eye size={24} color={colors.primary} />
                  </View>
                  <View style={styles.analyticsCardHeaderText}>
                    <Text style={styles.analyticsValue}>{analytics.views}</Text>
                    <Text style={styles.analyticsLabel}>Profile Views</Text>
                  </View>
                </View>
                <Text style={styles.analyticsDescription}>Investors viewing your profile</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <View style={styles.analyticsCardHeader}>
                  <View style={[styles.analyticsIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                    <Heart size={24} color={colors.primary} />
                  </View>
                  <View style={styles.analyticsCardHeaderText}>
                    <Text style={styles.analyticsValue}>{analytics.favorites}</Text>
                    <Text style={styles.analyticsLabel}>Favorites</Text>
                  </View>
                </View>
                <Text style={styles.analyticsDescription}>Saved by investors</Text>
              </View>
            </View>
          </View>
        )}

        {/* Investor Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Target size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Market Intelligence</Text>
              <Text style={styles.sectionSubtitle}>Understand investor behavior and trends</Text>
            </View>
          </View>
          
          {totalInvestors > 0 ? (
            <>
              <View style={styles.insightCard}>
                <Users size={20} color={colors.primary} />
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Total Active Investors</Text>
                  <Text style={styles.insightValue}>{totalInvestors}</Text>
                </View>
              </View>

              {avgInvestmentRange.min > 0 && (
                <View style={styles.insightCard}>
                  <DollarSign size={20} color={colors.primary} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightLabel}>Average Investment Range</Text>
                    <Text style={styles.insightValue}>
                      ${(avgInvestmentRange.min / 1000).toFixed(0)}K - ${(avgInvestmentRange.max / 1000).toFixed(0)}K
                    </Text>
                  </View>
                </View>
              )}

              {investorSectors.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSubtitle}>Most Sought-After Sectors</Text>
                  <View style={styles.insightList}>
                    {investorSectors.map(({ sector, count }, index) => (
                      <View key={sector} style={styles.insightItem}>
                        <View style={styles.insightRank}>
                          <Text style={styles.rankNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.insightItemContent}>
                          <Text style={styles.insightItemName}>{sector}</Text>
                          <Text style={styles.insightItemCount}>{count} investors interested</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {investorTypes.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSubtitle}>Investor Types</Text>
                  <View style={styles.typeGrid}>
                    {investorTypes.map(({ type, count }) => (
                      <View key={type} style={styles.typeCard}>
                        <Text style={styles.typeName}>{type}</Text>
                        <Text style={styles.typeCount}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No investor data available yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    header: {
      padding: 24,
      paddingBottom: 16,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerTextContainer: {
      flex: 1,
      paddingRight: 16,
    },
    logo: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 6,
    },
    refreshButton: {
      padding: 8,
    },
    tagline: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    searchSection: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    filterToggleButton: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filtersContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    filterSection: {
      gap: 12,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    filterScroll: {
      marginHorizontal: -4,
    },
    filterPills: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 4,
    },
    filterPill: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterPillText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    filterPillTextActive: {
      color: '#FFFFFF',
    },
    startupsList: {
      gap: 16,
    },
    section: {
      marginBottom: 24,
      paddingHorizontal: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20,
      gap: 12,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '400',
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    dashboardContainer: {
      gap: 12,
    },
    analyticsCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    analyticsCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 12,
    },
    analyticsCardHeaderText: {
      flex: 1,
    },
    analyticsIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    analyticsValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 32,
    },
    analyticsLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    analyticsDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    insightContent: {
      flex: 1,
    },
    insightLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    insightValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    insightSection: {
      marginTop: 16,
    },
    insightSubtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    insightList: {
      gap: 8,
    },
    insightItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
      marginBottom: 8,
    },
    insightRank: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rankNumber: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    insightItemContent: {
      flex: 1,
    },
    insightItemName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    insightItemCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: '30%',
      alignItems: 'center',
      gap: 6,
    },
    typeName: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    typeCount: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
  });
}
