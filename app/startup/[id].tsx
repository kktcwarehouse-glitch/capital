import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StartupProfile, StartupMedia } from '@/types';
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  Users,
  Calendar,
  MessageCircle,
  Heart,
  Globe,
  FileText,
  X,
  DollarSign,
  Percent,
  Briefcase,
  Handshake,
} from 'lucide-react-native';
import { Video as VideoPlayer, ResizeMode } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';

export default function StartupDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [media, setMedia] = useState<StartupMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchStartup();
      checkFavorite();
      recordView();
    }
  }, [id]);

  const fetchStartup = async () => {
    const { data, error } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      setStartup(data);
      fetchMedia(id);
    }
    setLoading(false);
  };

  const fetchMedia = async (startupId: string) => {
    const { data } = await supabase
      .from('startup_media')
      .select('*')
      .eq('startup_id', startupId)
      .order('display_order', { ascending: true });

    if (data) {
      setMedia(data);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('startup_id', id)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const recordView = async () => {
    if (!user || !id || profile?.role === 'startup') return;

    // Try to insert, ignore if already exists (due to unique constraint)
    await supabase.from('profile_views').insert({
      startup_id: id,
      viewer_id: user.id,
    }).select();
    // Errors are expected and fine - it means they already viewed this profile
  };

  const toggleFavorite = async () => {
    if (!user) return;

    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('startup_id', id);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({
        user_id: user.id,
        startup_id: id,
      });
      setIsFavorite(true);
    }
  };

  const handleContact = async () => {
    if (!startup) return;

    const { data: existingConversation } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user?.id},recipient_id.eq.${startup.user_id}),and(sender_id.eq.${startup.user_id},recipient_id.eq.${user?.id})`
      )
      .limit(1)
      .maybeSingle();

    if (existingConversation || !existingConversation) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: startup.user_id, name: startup.company_name },
      });
    }
  };

  const formatFunding = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const openDocument = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (error) {
      console.error('Error opening document:', error);
      // Fallback to Linking if WebBrowser fails
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      } catch (linkError) {
        Alert.alert('Error', 'Failed to open document');
      }
    }
  };

  const openImage = (url: string) => {
    setSelectedImage(url);
  };

  const openVideo = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (error) {
      console.error('Error opening video:', error);
      // Fallback: open in modal
      setSelectedVideo(url);
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

  if (!startup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Startup not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedImage(null)}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal
        visible={selectedVideo !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedVideo(null)}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedVideo && (
            <VideoPlayer
              source={{ uri: selectedVideo }}
              style={styles.modalVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          )}
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        {profile?.role === 'investor' && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={toggleFavorite}>
            <Heart
              size={24}
              color={isFavorite ? colors.error : colors.text}
              fill={isFavorite ? colors.error : 'transparent'}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView>
        <View style={styles.content}>
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

          <Text style={styles.companyName}>{startup.company_name}</Text>

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{startup.sector}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{startup.stage}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{startup.location}</Text>
          </View>

          {startup.funding_goal > 0 && (
            <View style={styles.fundingCard}>
              <TrendingUp size={24} color={colors.primary} />
              <View style={styles.fundingInfo}>
                <Text style={styles.fundingLabel}>Funding Goal</Text>
                <Text style={styles.fundingAmount}>
                  {formatFunding(startup.funding_goal)}
                </Text>
              </View>
            </View>
          )}

          {/* Images and Videos Row */}
          {(media.filter(m => m.media_type === 'image').length > 0 || 
            media.filter(m => m.media_type === 'video').length > 0) && (
            <View style={styles.mediaSection}>
              <Text style={styles.sectionTitle}>Media</Text>
              <FlatList
                data={media.filter(m => m.media_type === 'image' || m.media_type === 'video')}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.mediaScrollContent}
                renderItem={({ item }) => {
                  if (item.media_type === 'image') {
                    return (
                      <TouchableOpacity
                        style={styles.mediaItem}
                        onPress={() => openImage(item.file_url)}>
                        <Image
                          source={{ uri: item.file_url }}
                          style={styles.mediaThumbnail}
                          resizeMode="cover"
                        />
                        <View style={styles.mediaLabel}>
                          <Text style={styles.mediaLabelText} numberOfLines={1}>
                            {item.file_name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  } else {
                    return (
                      <TouchableOpacity
                        style={styles.mediaItem}
                        onPress={() => openVideo(item.file_url)}>
                        <View style={[styles.mediaThumbnail, styles.videoThumbnail]}>
                          <VideoPlayer
                            source={{ uri: item.file_url }}
                            style={styles.mediaVideo}
                            useNativeControls={false}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                          />
                          <View style={styles.playButtonOverlay}>
                            <View style={styles.playButton}>
                              <Text style={styles.playButtonText}>▶</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.mediaLabel}>
                          <Text style={styles.mediaLabelText} numberOfLines={1}>
                            {item.file_name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                }}
                keyExtractor={(item) => item.id}
              />
            </View>
          )}

          {/* Pitch Deck Section */}
          {startup.pitch_deck_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pitch Deck</Text>
              <TouchableOpacity
                style={styles.pitchDeckCard}
                onPress={() => openDocument(startup.pitch_deck_url!)}>
                <FileText size={24} color={colors.primary} />
                <View style={styles.pitchDeckInfo}>
                  <Text style={styles.pitchDeckTitle}>View Pitch Deck</Text>
                  <Text style={styles.pitchDeckSubtitle}>PDF Presentation</Text>
                </View>
                <Globe size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Documents Section */}
          {media.filter(m => m.media_type === 'document').length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <View style={styles.documentsContainer}>
                {media.filter(m => m.media_type === 'document').map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.documentCard}
                    onPress={() => openDocument(item.file_url)}>
                    <FileText size={24} color={colors.primary} />
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {item.file_name}
                      </Text>
                      {item.file_size && (
                        <Text style={styles.documentSize}>
                          {(item.file_size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>
              {startup.description || 'No description available'}
            </Text>
          </View>

          {(startup.team_size || startup.founded_year || startup.website) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailsCard}>
                {startup.team_size && (
                  <View style={styles.detailRow}>
                    <Users size={18} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Team Size</Text>
                    <Text style={styles.detailValue}>{startup.team_size}</Text>
                  </View>
                )}
                {startup.founded_year && (
                  <View style={styles.detailRow}>
                    <Calendar size={18} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Founded</Text>
                    <Text style={styles.detailValue}>
                      {startup.founded_year}
                    </Text>
                  </View>
                )}
                {startup.website && (
                  <View style={styles.detailRow}>
                    <Globe size={18} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Website</Text>
                    <Text
                      style={[styles.detailValue, styles.link]}
                      numberOfLines={1}>
                      {startup.website}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Founders Section */}
          {startup.founders && Array.isArray(startup.founders) && startup.founders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Founders</Text>
              <View style={styles.foundersContainer}>
                {startup.founders.map((founder, index) => (
                  <View key={index} style={styles.founderCard}>
                    <View style={styles.founderPhotoContainer}>
                      {founder.photo_url ? (
                        <Image
                          source={{ uri: founder.photo_url }}
                          style={styles.founderPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.founderPhotoPlaceholder}>
                          <Text style={styles.founderPhotoPlaceholderText}>
                            {founder.name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.founderName}>{founder.name}</Text>
                    {founder.key_roles && (
                      <Text style={styles.founderRoles}>{founder.key_roles}</Text>
                    )}
                    {founder.previous_experience && (
                      <Text style={styles.founderExperience} numberOfLines={3}>
                        {founder.previous_experience}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Business Metrics Section */}
          {(startup.monthly_recurring_revenue || startup.growth_percentage || startup.important_partnerships) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Metrics</Text>
              <View style={styles.metricsCard}>
                {startup.monthly_recurring_revenue && (
                  <View style={styles.metricRow}>
                    <DollarSign size={20} color={colors.primary} />
                    <View style={styles.metricContent}>
                      <Text style={styles.metricLabel}>Monthly Recurring Revenue (MRR)</Text>
                      <Text style={styles.metricValue}>
                        ${(startup.monthly_recurring_revenue / 1000).toFixed(0)}K
                      </Text>
                    </View>
                  </View>
                )}
                {startup.growth_percentage && startup.growth_period_months && (
                  <View style={styles.metricRow}>
                    <TrendingUp size={20} color={colors.primary} />
                    <View style={styles.metricContent}>
                      <Text style={styles.metricLabel}>Growth</Text>
                      <Text style={styles.metricValue}>
                        {startup.growth_percentage}% over {startup.growth_period_months} months
                      </Text>
                    </View>
                  </View>
                )}
                {startup.important_partnerships && (
                  <View style={styles.metricRow}>
                    <Handshake size={20} color={colors.primary} />
                    <View style={styles.metricContent}>
                      <Text style={styles.metricLabel}>Important Partnerships</Text>
                      <Text style={styles.metricValue}>{startup.important_partnerships}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Investment Details Section */}
          {(startup.equity_offered || startup.company_valuation_pre_money || startup.minimum_investment) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Investment Details</Text>
              <View style={styles.investmentCard}>
                {startup.funding_goal > 0 && (
                  <View style={styles.investmentRow}>
                    <DollarSign size={20} color={colors.primary} />
                    <View style={styles.investmentContent}>
                      <Text style={styles.investmentLabel}>Amount Needed</Text>
                      <Text style={styles.investmentValue}>
                        {formatFunding(startup.funding_goal)}
                      </Text>
                    </View>
                  </View>
                )}
                {startup.equity_offered && (
                  <View style={styles.investmentRow}>
                    <Percent size={20} color={colors.primary} />
                    <View style={styles.investmentContent}>
                      <Text style={styles.investmentLabel}>Equity Offered</Text>
                      <Text style={styles.investmentValue}>{startup.equity_offered}%</Text>
                    </View>
                  </View>
                )}
                {startup.company_valuation_pre_money && (
                  <View style={styles.investmentRow}>
                    <Briefcase size={20} color={colors.primary} />
                    <View style={styles.investmentContent}>
                      <Text style={styles.investmentLabel}>Company Valuation (Pre-money)</Text>
                      <Text style={styles.investmentValue}>
                        {formatFunding(startup.company_valuation_pre_money)}
                      </Text>
                    </View>
                  </View>
                )}
                {startup.minimum_investment && (
                  <View style={styles.investmentRow}>
                    <DollarSign size={20} color={colors.primary} />
                    <View style={styles.investmentContent}>
                      <Text style={styles.investmentLabel}>Minimum Investment</Text>
                      <Text style={styles.investmentValue}>
                        {formatFunding(startup.minimum_investment)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {profile?.role === 'investor' && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContact}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Startup</Text>
            </TouchableOpacity>
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
    },
    backButton: {
      padding: 8,
    },
    favoriteButton: {
      padding: 8,
    },
    content: {
      padding: 24,
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      alignSelf: 'center',
      overflow: 'hidden',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    logoText: {
      color: '#FFFFFF',
      fontSize: 36,
      fontWeight: '700',
    },
    companyName: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    tags: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    tag: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    tagText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 24,
    },
    metaText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    fundingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 12,
    },
    fundingInfo: {
      flex: 1,
    },
    fundingLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    fundingAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    detailsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailLabel: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    link: {
      color: colors.primary,
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      gap: 8,
      marginTop: 16,
    },
    contactButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    mediaSection: {
      marginBottom: 24,
    },
    mediaScrollContent: {
      paddingRight: 24,
    },
    mediaItem: {
      width: 200,
      marginRight: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    mediaThumbnail: {
      width: '100%',
      height: 150,
      backgroundColor: colors.background,
    },
    videoThumbnail: {
      backgroundColor: colors.card,
    },
    documentThumbnail: {
      backgroundColor: `${colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mediaVideo: {
      width: '100%',
      height: '100%',
    },
    mediaLabel: {
      padding: 12,
    },
    mediaLabelText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    mediaSizeText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    documentsContainer: {
      gap: 12,
    },
    pitchDeckCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      marginBottom: 12,
    },
    pitchDeckInfo: {
      flex: 1,
    },
    pitchDeckTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    pitchDeckSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    documentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    documentInfo: {
      flex: 1,
    },
    documentName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    documentSize: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 20,
      padding: 10,
    },
    modalImage: {
      width: '95%',
      height: '80%',
    },
    modalVideo: {
      width: '95%',
      height: '80%',
    },
    foundersContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    founderCard: {
      width: '47%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    founderPhotoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 12,
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
    founderName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    founderRoles: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    founderExperience: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
    },
    metricsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    metricContent: {
      flex: 1,
    },
    metricLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    investmentCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    investmentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    investmentContent: {
      flex: 1,
    },
    investmentLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    investmentValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    playButtonOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButtonText: {
      fontSize: 24,
      color: colors.primary,
      marginLeft: 4,
    },
  });
}
