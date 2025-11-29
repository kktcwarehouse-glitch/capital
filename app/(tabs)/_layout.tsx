import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Hop as Home, Search, MessageCircle, User } from 'lucide-react-native';
import { useColorScheme, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchUnread = async () => {
      if (!user) {
        if (isMounted) {
          setUnreadCount(0);
        }
        return;
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (isMounted) {
        setUnreadCount(count || 0);
      }
    };

    fetchUnread();

    if (!user) {
      return () => {
        isMounted = false;
      };
    }

    const channel = supabase
      .channel(`messages-tab-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const MessagesIcon = ({ color, size }: { color: string; size: number }) => (
    <View style={{ position: 'relative' }}>
      <MessageCircle size={size} color={color} />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary,
            borderWidth: 1,
            borderColor: colors.background,
          }}
        />
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ size, color }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ size, color }) => <MessagesIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
