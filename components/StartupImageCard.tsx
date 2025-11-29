import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { Colors } from '@/constants/Colors';
import { StartupProfile, StartupMedia } from '@/types';
import { MapPin, TrendingUp, Eye, Heart, Building2, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Props = {
  startup: StartupProfile;
  onPress?: () => void;
  showStats?: boolean;
};

export function StartupImageCard({ startup, onPress, showStats = true }: Props) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);
  const router = useRouter();

  const [stats, setStats] = useState({ views: 0, likes: 0 });
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);

  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
    fetchPrimaryImage();
  }, [startup.id, showStats]);

  const fetchStats = async () => {
    try {
      const [viewsResult, likesResult] = await Promise.all([
        supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('startup_id', startup.id),
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('startup_id', startup.id),
      ]);

      setStats({
        views: viewsResult.count || 0,
        likes: likesResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPrimaryImage = async () => {
    try {
      const { data } = await supabase
        .from('startup_media')
        .select('file_url')
        .eq('startup_id', startup.id)
        .eq('media_type', 'image')
        .eq('is_primary', true)
        .maybeSingle();

      if (data) {
        setPrimaryImage(data.file_url);
      } else {
        // Get first image if no primary
        const { data: firstImage } = await supabase
          .from('startup_media')
          .select('file_url')
          .eq('startup_id', startup.id)
          .eq('media_type', 'image')
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstImage) {
          setPrimaryImage(firstImage.file_url);
        }
      }
    } catch (error) {
      console.error('Error fetching image:', error);
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
      console.log(`[StartupImageCard] ${startup.company_name} is featured:`, startup.is_featured);
    }
  }, [startup.is_featured, startup.company_name]);

  return (
    <TouchableOpacity style={[styles.card, isFeatured && styles.featuredCard]} onPress={handlePress} activeOpacity={0.9}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Building2 size={48} color={colors.textSecondary} />
          </View>
        )}
        {isFeatured && (
          <View style={styles.featuredBadge}>
            <Star size={16} color="#FFD700" fill="#FFD700" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}
        {showStats && (
          <View style={styles.statsOverlay}>
            <View style={styles.statBadge}>
              <Heart size={14} color="#FFFFFF" />
              <Text style={styles.statBadgeText}>{stats.likes}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName} numberOfLines={1}>
              {startup.company_name}
            </Text>
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={styles.location} numberOfLines={1}>
                {startup.location}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {startup.description || 'No description available'}
        </Text>

        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{startup.sector}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{startup.stage}</Text>
          </View>
          {startup.funding_goal > 0 && (
            <View style={[styles.tag, styles.fundingTag]}>
              <TrendingUp size={10} color={colors.primary} />
              <Text style={styles.fundingText}>
                {formatFunding(startup.funding_goal)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    featuredCard: {
      borderColor: '#FFD700',
      borderWidth: 3,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 12,
    },
    imageContainer: {
      width: '100%',
      height: 240,
      position: 'relative',
      backgroundColor: colors.background,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderImage: {
      width: '100%',
      height: '100%',
      backgroundColor: `${colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featuredBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
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
      fontSize: 12,
      fontWeight: '700',
    },
    statsOverlay: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      gap: 8,
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 4,
      backdropFilter: 'blur(10px)',
    },
    statBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    infoContainer: {
      padding: 16,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flex: 1,
    },
    companyName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    location: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
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
      fontWeight: '600',
      color: colors.text,
    },
    fundingTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    fundingText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
  });
}




















