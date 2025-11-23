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
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { ArrowLeft, Upload, Trash2, Image as ImageIcon, Video, FileText } from 'lucide-react-native';
import { StartupProfile, StartupMedia } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

type PickerMediaKind = 'image' | 'video';

const getPickerMediaTypes = (kind: PickerMediaKind): ImagePicker.ImagePickerOptions['mediaTypes'] => {
  const nextGenMediaTypes: ImagePicker.MediaType[] = kind === 'image' ? ['images'] : ['videos'];

  // Expo SDK 49+ accepts arrays of MediaType strings (preferred, no warnings).
  if (Array.isArray(nextGenMediaTypes)) {
    return nextGenMediaTypes;
  }

  // Fallback for very old Expo SDKs that still rely on MediaTypeOptions.
  return kind === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos;
};

export default function ManageMediaScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user } = useAuth();
  const [startupProfile, setStartupProfile] = useState<StartupProfile | null>(null);
  const [media, setMedia] = useState<StartupMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStartupProfile();
  }, []);

  const fetchStartupProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setStartupProfile(data);
      fetchMedia(data.id);
    } else {
      setLoading(false);
    }
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
    setLoading(false);
  };

  const pickImage = async () => {
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
      mediaTypes: getPickerMediaTypes('image'),
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadMedia({
        uri: asset.uri,
        type: 'image',
        fileName: asset.fileName || 'image.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const pickVideo = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Video upload is not available in web preview. Please use a mobile device or development build.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: getPickerMediaTypes('video'),
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadMedia({
        uri: asset.uri,
        type: 'video',
        fileName: asset.fileName || 'video.mp4',
        mimeType: asset.mimeType || 'video/mp4',
        size: asset.fileSize,
      });
    }
  };

  const pickDocument = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Document upload is not available in web preview. Please use a mobile device or development build.');
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadMedia({
        uri: asset.uri,
        type: 'document',
        fileName: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      });
    }
  };

  const uploadMedia = async ({
    uri,
    type,
    fileName,
    mimeType,
    size,
  }: {
    uri: string;
    type: 'image' | 'video' | 'document';
    fileName: string;
    mimeType?: string;
    size?: number | null;
  }) => {
    if (!startupProfile) return;

    setUploading(true);

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      const bucketName = type === 'image' ? 'startup-images' : type === 'video' ? 'startup-videos' : 'startup-documents';
      const filePath = `${user!.id}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBytes, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload file');
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('startup_media')
        .insert({
          startup_id: startupProfile.id,
          media_type: type,
          file_url: urlData.publicUrl,
          file_name: fileName,
          file_size: size ?? fileBytes.byteLength,
          mime_type: mimeType || 'application/octet-stream',
          display_order: media.length,
          is_primary: media.length === 0 && type === 'image',
        });

      if (dbError) {
        console.error('Database error:', dbError);
        Alert.alert('Error', 'Failed to save media information');
      } else {
        fetchMedia(startupProfile.id);
        Alert.alert('Success', 'Media uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (mediaItem: StartupMedia) => {
    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!startupProfile) {
              return;
            }
            const { error } = await supabase
              .from('startup_media')
              .delete()
              .eq('id', mediaItem.id);

            if (!error && startupProfile) {
              fetchMedia(startupProfile.id);
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Manage Media</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Upload Media</Text>

          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={pickImage}
              disabled={uploading}>
              <ImageIcon size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={pickVideo}
              disabled={uploading}>
              <Video size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={pickDocument}
              disabled={uploading}>
              <FileText size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>

        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>Uploaded Media ({media.length})</Text>

          {media.length === 0 ? (
            <View style={styles.emptyState}>
              <Upload size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No media uploaded yet</Text>
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {media.map((item) => (
                <View key={item.id} style={styles.mediaCard}>
                  {item.media_type === 'image' && (
                    <Image source={{ uri: item.file_url }} style={styles.mediaImage} />
                  )}
                  {item.media_type === 'video' && (
                    <View style={[styles.mediaImage, styles.videoPlaceholder]}>
                      <Video size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  {item.media_type === 'document' && (
                    <View style={[styles.mediaImage, styles.documentPlaceholder]}>
                      <FileText size={32} color={colors.textSecondary} />
                    </View>
                  )}

                  <View style={styles.mediaInfo}>
                    <Text style={styles.mediaName} numberOfLines={1}>
                      {item.file_name}
                    </Text>
                    <View style={styles.mediaActions}>
                      {item.media_type === 'image' && !item.is_primary && startupProfile && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={async () => {
                            // Set as primary
                            if (!startupProfile) return;
                            await supabase
                              .from('startup_media')
                              .update({ is_primary: false })
                              .eq('startup_id', startupProfile.id)
                              .eq('is_primary', true);
                            
                            await supabase
                              .from('startup_media')
                              .update({ is_primary: true })
                              .eq('id', item.id);
                            
                            fetchMedia(startupProfile.id);
                          }}>
                          <Text style={styles.actionButtonText}>Set Primary</Text>
                        </TouchableOpacity>
                      )}
                      {item.is_primary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteMedia(item)}>
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
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
    uploadSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    uploadButtons: {
      gap: 12,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    uploadButtonDisabled: {
      opacity: 0.5,
    },
    uploadButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    uploadingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      padding: 12,
      backgroundColor: `${colors.primary}15`,
      borderRadius: 8,
    },
    uploadingText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    mediaSection: {
      marginBottom: 24,
    },
    emptyState: {
      alignItems: 'center',
      padding: 48,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
    },
    mediaGrid: {
      gap: 16,
    },
    mediaCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    mediaImage: {
      width: '100%',
      height: 200,
      backgroundColor: colors.background,
    },
    videoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    documentPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    mediaInfo: {
      padding: 12,
      gap: 8,
    },
    mediaActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: `${colors.primary}15`,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    mediaName: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    primaryBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginLeft: 8,
    },
    primaryBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
    },
    deleteButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.card,
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
