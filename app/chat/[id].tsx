import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, ArrowLeft, Image as ImageIcon, Video as VideoIcon, X, FileText, Check, CheckCheck } from 'lucide-react-native';
import { Message, MessageAttachmentType } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList<Message>>(null);

  type PendingAttachment = {
    uri: string;
    type: MessageAttachmentType;
    fileName: string;
    mimeType?: string;
    size?: number | null;
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!user || !id) return;

    fetchMessages();
    markAsRead();
    const unsubscribe = subscribeToMessages();

    return () => {
      unsubscribe();
    };
  }, [user?.id, id]);

  // Fallback polling in case realtime is not available or misconfigured
  useEffect(() => {
    if (!user || !id) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000); // every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, id]);

  const fetchMessages = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const markAsRead = async () => {
    if (!user || !id) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', id)
      .eq('recipient_id', user.id)
      .eq('read', false);
  };

  const handlePickMedia = async (kind: 'image' | 'video' | 'document') => {
    if (editingMessage) {
      Alert.alert('Finish editing', 'Send or cancel your edit before adding media.');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert('Unavailable', 'Media upload is only available in a native build.');
      return;
    }

    if (kind === 'document') {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPendingAttachment({
          uri: asset.uri,
          type: 'document',
          fileName: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        });
      }
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to send media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? ['images'] : ['videos'],
      allowsEditing: kind === 'image',
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingAttachment({
        uri: asset.uri,
        type: kind,
        fileName: asset.fileName || (kind === 'image' ? 'photo.jpg' : 'video.mp4'),
        mimeType: asset.mimeType || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
        size: asset.fileSize,
      });
    }
  };

  const removePendingAttachment = () => {
    setPendingAttachment(null);
  };

  const startEditingMessage = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setPendingAttachment(null);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const deleteMessage = async (message: Message) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id)
        .eq('sender_id', user.id);

      if (error) {
        throw error;
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      if (editingMessage?.id === message.id) {
        resetComposer();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Delete failed', 'Unable to delete this message.');
    }
  };

  const handleMessageLongPress = (message: Message) => {
    if (message.sender_id !== user?.id) return;

    Alert.alert('Message options', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit',
        onPress: () => startEditingMessage(message),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMessage(message),
      },
    ]);
  };

  const openAttachment = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening attachment:', error);
      Alert.alert('Error', 'Could not open this attachment.');
    }
  };

  const isRelevantMessage = (message: Message) => {
    if (!user || !id) return false;
    return (
      (message.sender_id === user.id && message.recipient_id === id) ||
      (message.sender_id === id && message.recipient_id === user.id)
    );
  };

  const subscribeToMessages = () => {
    if (!user || !id) {
      return () => {};
    }

    const channel = supabase
      .channel(`chat-${user.id}-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (isRelevantMessage(newMsg)) {
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.sender_id === id) {
              markAsRead();
            }
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (isRelevantMessage(updatedMsg)) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const deletedMsg = payload.old as Message;
          if (deletedMsg?.id && isRelevantMessage(deletedMsg)) {
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedMsg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const resetComposer = () => {
    setNewMessage('');
    setPendingAttachment(null);
    setEditingMessage(null);
  };

  const uploadAttachment = async (attachment: PendingAttachment) => {
    if (!user) return null;

    setUploadingAttachment(true);
    try {
      const response = await fetch(attachment.uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      const safeFileName = attachment.fileName.replace(/\s+/g, '-');
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, fileBytes, {
          contentType: attachment.mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Missing public URL for attachment');
      }

      return {
        attachment_url: urlData.publicUrl,
        attachment_type: attachment.type,
        attachment_metadata: {
          file_name: attachment.fileName,
          file_size: attachment.size ?? fileBytes.byteLength,
          mime_type: attachment.mimeType,
        },
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      Alert.alert('Upload failed', 'Could not upload the attachment. Please try again.');
      return null;
    } finally {
      setUploadingAttachment(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !id || sending) return;

    const trimmedMessage = newMessage.trim();
    const hasAttachment = Boolean(pendingAttachment);
    const isEditing = Boolean(editingMessage);

    if (!trimmedMessage && !hasAttachment) {
      return;
    }

    if (isEditing && !trimmedMessage) {
      return;
    }

    setSending(true);

    if (isEditing && editingMessage) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ content: trimmedMessage })
          .eq('id', editingMessage.id)
          .eq('sender_id', user.id);

        if (error) {
          throw error;
        }

        setMessages((prev) =>
          prev.map((msg) => (msg.id === editingMessage.id ? { ...msg, content: trimmedMessage } : msg))
        );
        resetComposer();
      } catch (error) {
        console.error('Error editing message:', error);
        Alert.alert('Edit failed', 'Unable to update the message. Please try again.');
      } finally {
        setSending(false);
      }
      return;
    }

    let attachmentPayload: Partial<Message> | null = null;

    if (pendingAttachment) {
      attachmentPayload = await uploadAttachment(pendingAttachment);
      if (!attachmentPayload) {
        setSending(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: id,
          content: trimmedMessage,
          read: false,
          attachment_url: attachmentPayload?.attachment_url ?? null,
          attachment_type: attachmentPayload?.attachment_type ?? null,
          attachment_metadata: attachmentPayload?.attachment_metadata ?? null,
        })
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setMessages((prev) => [...prev, data]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
        resetComposer();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Message failed', 'We could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    const showAttachment = item.attachment_type && item.attachment_url;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}>
        <TouchableOpacity
          activeOpacity={isMe ? 0.7 : 1}
          onLongPress={() => handleMessageLongPress(item)}
          disabled={!isMe}>
          <View
            style={[
              styles.messageBubble,
              isMe ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}>
            {showAttachment && item.attachment_type === 'image' && item.attachment_url && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openAttachment(item.attachment_url)}>
                <Image source={{ uri: item.attachment_url }} style={styles.imageAttachment} />
              </TouchableOpacity>
            )}
            {showAttachment && item.attachment_type === 'video' && item.attachment_url && (
              <TouchableOpacity
                style={styles.videoAttachment}
                activeOpacity={0.8}
                onPress={() => openAttachment(item.attachment_url)}>
                <VideoIcon size={18} color={isMe ? '#FFFFFF' : colors.primary} />
                <Text
                  style={[
                    styles.videoAttachmentText,
                    isMe ? styles.myMessageText : styles.otherMessageText,
                  ]}>
                  Tap to view video
                </Text>
              </TouchableOpacity>
            )}
            {showAttachment && item.attachment_type === 'document' && item.attachment_url && (
              <TouchableOpacity
                style={styles.documentAttachment}
                activeOpacity={0.8}
                onPress={() => openAttachment(item.attachment_url)}>
                <FileText size={18} color={isMe ? '#FFFFFF' : colors.primary} />
                <Text
                  style={[
                    styles.documentAttachmentText,
                    isMe ? styles.myMessageText : styles.otherMessageText,
                  ]}
                  numberOfLines={1}>
                  {item.attachment_metadata?.file_name || 'Document'}
                </Text>
              </TouchableOpacity>
            )}
            {item.content ? (
              <Text
                style={[
                  styles.messageText,
                  isMe ? styles.myMessageText : styles.otherMessageText,
                ]}>
                {item.content}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMe && (
            <View style={styles.readReceipt}>
              {item.read ? (
                <CheckCheck size={14} color={colors.primary} />
              ) : (
                <Check size={14} color={colors.textSecondary} />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const canSend = editingMessage ? Boolean(newMessage.trim()) : Boolean(newMessage.trim() || pendingAttachment);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name || 'Chat'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.composerContainer}>
          {editingMessage && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingText}>Editing message</Text>
              <TouchableOpacity onPress={cancelEditing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {pendingAttachment && (
            <View style={styles.pendingAttachment}>
              {pendingAttachment.type === 'image' ? (
                <Image
                  source={{ uri: pendingAttachment.uri }}
                  style={styles.pendingAttachmentImage}
                />
              ) : pendingAttachment.type === 'video' ? (
                <View style={styles.pendingAttachmentVideo}>
                  <VideoIcon size={18} color={colors.primary} />
                  <Text style={styles.pendingAttachmentVideoText}>Video attached</Text>
                </View>
              ) : (
                <View style={styles.pendingAttachmentVideo}>
                  <FileText size={18} color={colors.primary} />
                  <Text style={styles.pendingAttachmentVideoText} numberOfLines={1}>
                    {pendingAttachment.fileName}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeAttachmentButton}
                onPress={removePendingAttachment}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {uploadingAttachment && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.uploadingText}>Uploading attachment...</Text>
            </View>
          )}

          <View style={styles.composerRow}>
            <View style={styles.attachButtons}>
              <TouchableOpacity
                style={[
                  styles.attachmentButton,
                  (uploadingAttachment || sending) && styles.attachmentButtonDisabled,
                ]}
                onPress={() => handlePickMedia('image')}
                disabled={uploadingAttachment || sending}>
                <ImageIcon size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.attachmentButton,
                  (uploadingAttachment || sending) && styles.attachmentButtonDisabled,
                ]}
                onPress={() => handlePickMedia('video')}
                disabled={uploadingAttachment || sending}>
                <VideoIcon size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.attachmentButton,
                  (uploadingAttachment || sending) && styles.attachmentButtonDisabled,
                ]}
                onPress={() => handlePickMedia('document')}
                disabled={uploadingAttachment || sending}>
                <FileText size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
              editable={!uploadingAttachment}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!canSend || sending || uploadingAttachment) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!canSend || sending || uploadingAttachment}>
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
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
    messagesList: {
      padding: 16,
      paddingBottom: 80,
    },
    messageContainer: {
      marginBottom: 16,
      maxWidth: '75%',
    },
    myMessageContainer: {
      alignSelf: 'flex-end',
      alignItems: 'flex-end',
    },
    otherMessageContainer: {
      alignSelf: 'flex-start',
      alignItems: 'flex-start',
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
      marginBottom: 4,
      gap: 8,
    },
    myMessageBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    myMessageText: {
      color: '#FFFFFF',
    },
    otherMessageText: {
      color: colors.text,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    messageTime: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    readReceipt: {
      marginLeft: 4,
    },
    imageAttachment: {
      width: 220,
      height: 220,
      borderRadius: 16,
    },
    videoAttachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: `${colors.primary}20`,
    },
    videoAttachmentText: {
      fontSize: 14,
    },
    documentAttachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: `${colors.primary}20`,
      maxWidth: 200,
    },
    documentAttachmentText: {
      fontSize: 14,
      flex: 1,
    },
    composerContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      gap: 8,
    },
    editingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    editingText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    pendingAttachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pendingAttachmentImage: {
      width: 72,
      height: 72,
      borderRadius: 12,
    },
    pendingAttachmentVideo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pendingAttachmentVideoText: {
      fontSize: 14,
      color: colors.text,
    },
    removeAttachmentButton: {
      marginLeft: 'auto',
      backgroundColor: colors.background,
      borderRadius: 999,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    uploadingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    uploadingText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    attachButtons: {
      flexDirection: 'column',
      gap: 8,
    },
    attachmentButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    attachmentButtonDisabled: {
      opacity: 0.4,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendButton: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });
}
