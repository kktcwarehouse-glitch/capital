import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Search, ListFilter as Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { StartupProfile } from '@/types';
import { StartupCard } from '@/components/StartupCard';
import { StartupImageCard } from '@/components/StartupImageCard';
import { useAuth } from '@/lib/auth-context';
import { FILTER_SECTORS } from '@/constants/Sectors';

const sectors = FILTER_SECTORS;
const stages = ['All', 'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [startups, setStartups] = useState<StartupProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStartups();
  }, [selectedSector, selectedStage, user]);

  const fetchStartups = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('startup_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedSector !== 'All') {
        query = query.eq('sector', selectedSector);
      }

      if (selectedStage !== 'All') {
        query = query.eq('stage', selectedStage);
      }

      if (profile?.role === 'startup' && user) {
        query = query.neq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching startups:', error);
      }

      if (data) {
        // Debug: Log featured startups
        const featured = data.filter(s => s.is_featured);
        if (featured.length > 0) {
          console.log('[Discover] Featured startups found:', featured.map(s => s.company_name));
        }
        console.log('[Discover] Total startups:', data.length, 'Featured:', featured.length);
        setStartups(data);
      }
    } catch (error) {
      console.error('Error fetching startups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStartups = startups.filter((startup) =>
    startup.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    startup.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}>
          <Filter size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

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

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sector</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterPills}>
                {sectors.map((sector) => (
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterPills}>
                {stages.map((stage) => (
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.results}>
          {filteredStartups.length > 0 ? (
            <View style={styles.resultsList}>
              {filteredStartups.map((startup) => (
                profile?.role === 'investor' ? (
                  <StartupImageCard key={startup.id} startup={startup} />
                ) : (
                  <StartupCard key={startup.id} startup={startup} />
                )
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No startups found</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    filterButton: {
      padding: 8,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginHorizontal: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginLeft: 8,
    },
    filtersContainer: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      gap: 16,
    },
    filterSection: {
      gap: 8,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    filterPills: {
      flexDirection: 'row',
      gap: 8,
    },
    filterPill: {
      backgroundColor: colors.card,
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    results: {
      flex: 1,
    },
    resultsList: {
      padding: 24,
      gap: 12,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
  });
}
