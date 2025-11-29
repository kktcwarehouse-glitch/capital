import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { StartupProfile, InvestorProfile, Message } from '@/types';
import { router } from 'expo-router';
import { MessageCircle, User } from 'lucide-react-native';

type Conversation = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(colors);

  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchConversations();
    const unsubscribe = subscribeToMessages();

    return () => {
      unsubscribe();
    };
  }, [user]);

  const getMessagePreview = (msg: Message) => {
    if (msg.content && msg.content.trim().length > 0) {
      return msg.content;
    }

    if (msg.attachment_type === 'image') {
      return '📷 Photo';
    }

    if (msg.attachment_type === 'video') {
      return '🎥 Video';
    }

    if (msg.attachment_type === 'document') {
      return '📄 Document';
    }

    return 'New message';
  };

  const fetchConversations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messageError) {
        throw messageError;
      }

      if (!messages) {
        setConversations([]);
        return;
      }

      const uniqueUserIds = Array.from(
        new Set(
          messages.map((msg) =>
            msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
          )
        )
      );

      const profileNames = new Map<string, string>();

      if (uniqueUserIds.length > 0) {
        const [startupResult, investorResult] = await Promise.all([
          supabase
            .from('startup_profiles')
            .select('user_id, company_name')
            .in('user_id', uniqueUserIds),
          supabase
            .from('investor_profiles')
            .select('user_id, name')
            .in('user_id', uniqueUserIds),
        ]);

        startupResult.data?.forEach((profile: Pick<StartupProfile, 'user_id' | 'company_name'>) => {
          profileNames.set(profile.user_id, profile.company_name);
        });

        investorResult.data?.forEach((profile: Pick<InvestorProfile, 'user_id' | 'name'>) => {
          if (!profileNames.has(profile.user_id)) {
            profileNames.set(profile.user_id, profile.name);
          }
        });
      }

      const conversationMap = new Map<string, Conversation>();

      for (const msg of messages as Message[]) {
        const otherUserId =
          msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            otherUserId,
            otherUserName: profileNames.get(otherUserId) || 'User',
            lastMessage: getMessagePreview(msg),
            lastMessageTime: msg.created_at,
            unreadCount: 0,
          });
        }

        if (msg.sender_id === otherUserId && msg.recipient_id === user.id && !msg.read) {
          conversationMap.get(otherUserId)!.unreadCount += 1;
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!user) {
      return () => {};
    }

    const channel = supabase
      .channel(`messages-feed-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() =>
        router.push({
          pathname: '/chat/[id]',
          params: { id: item.otherUserId, name: item.otherUserName },
        })
      }>
      <View style={styles.avatarContainer}>
        <User size={24} color={colors.primary} />
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.otherUserName}</Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <MessageCircle size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>
            Start connecting with startups or investors
          </Text>
        </View>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      padding: 24,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    list: {
      padding: 16,
    },
    conversationCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    conversationContent: {
      flex: 1,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    conversationName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    conversationTime: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lastMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    unreadMessage: {
      fontWeight: '600',
      color: colors.text,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      marginLeft: 8,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
