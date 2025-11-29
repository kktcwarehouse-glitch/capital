import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { Colors } from '@/constants/Colors';
import { StartupProfile } from '@/types';
import { MapPin, TrendingUp, Eye, Heart, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Props = {
  startup: StartupProfile;
  onPress?: () => void;
  showStats?: boolean;
};

export function StartupCard({ startup, onPress, showStats = true }: Props) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);
  const router = useRouter();

  const [stats, setStats] = useState({ views: 0, likes: 0 });

  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [startup.id, showStats]);

  const fetchStats = async () => {
    try {
      const { count: viewCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startup.id);

      const { count: likeCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startup.id);

      setStats({
        views: viewCount || 0,
        likes: likeCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/startup/${startup.id}`);
    }
  };

  const formatFunding = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const isFeatured = Boolean(startup.is_featured);
  
  // Debug logging
  useEffect(() => {
    if (startup.is_featured) {
      console.log(`[StartupCard] ${startup.company_name} is featured:`, startup.is_featured);
    }
  }, [startup.is_featured, startup.company_name]);

  return (
    <TouchableOpacity style={[styles.card, isFeatured && styles.featuredCard]} onPress={handlePress}>
      {isFeatured && (
        <View style={styles.featuredBadge}>
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {startup.logo_url ? (
            <Image
              source={{ uri: startup.logo_url }}
              style={styles.logoImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.logoText}>
              {startup.company_name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.companyName}>{startup.company_name}</Text>
          <View style={styles.meta}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.location}>{startup.location}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {startup.description || 'No description available'}
      </Text>

      <View style={styles.footer}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{startup.sector}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{startup.stage}</Text>
        </View>
        {startup.funding_goal > 0 && (
          <View style={[styles.tag, styles.fundingTag]}>
            <TrendingUp size={12} color={colors.primary} />
            <Text style={styles.fundingText}>
              {formatFunding(startup.funding_goal)}
            </Text>
          </View>
        )}
      </View>

      {showStats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Eye size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{stats.views}</Text>
          </View>
          <View style={styles.statItem}>
            <Heart size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{stats.likes}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      position: 'relative',
    },
    featuredCard: {
      borderColor: '#FFD700',
      borderWidth: 3,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 12,
      backgroundColor: colors.card,
    },
    featuredBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 215, 0, 0.9)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      zIndex: 10,
    },
    featuredBadgeText: {
      color: '#000000',
      fontSize: 11,
      fontWeight: '700',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    logoText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
    },
    info: {
      flex: 1,
      gap: 4,
    },
    companyName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    location: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    fundingTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderColor: colors.primary,
    },
    fundingText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });
}
