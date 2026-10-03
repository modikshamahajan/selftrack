import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Feather as Icon } from '@expo/vector-icons';
import api from '../services/api';
import { Colors } from '../theme/colors';

type Nav = StackNavigationProp<RootStackParamList, 'AdminDashboard'>;
interface Props { navigation: Nav; }

interface UserDetail {
  id: string;
  name: string;
  email: string;
  total_xp: number;
  level: number;
  streak_count: number;
  created_at: string;
}

interface DashboardStats {
  total_users: number;
  total_habits: number;
  total_health_metrics: number;
  total_journal_entries: number;
  total_downloads: number;
  recent_users: UserDetail[];
}

const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('@admin_token');
      if (!token) {
        navigation.replace('AdminLogin');
        return;
      }
      const { data } = await api.get('/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(data);
    } catch (error) {
      console.log('Error fetching admin dashboard', error);
      navigation.replace('AdminLogin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@admin_token');
    navigation.replace('Splash');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderUserItem = ({ item }: { item: UserDetail }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.userStats}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Lvl {item.level}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#FFF4E5' }]}>
          <Text style={[styles.badgeText, { color: '#E65100' }]}>🔥 {item.streak_count}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Icon name="log-out" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard title="Total Users" value={stats?.total_users || 0} icon="users" color="#4285F4" />
          <StatCard title="App Downloads" value={stats?.total_downloads || 0} icon="download" color="#0F9D58" />
          <StatCard title="Habits Tracked" value={stats?.total_habits || 0} icon="check-circle" color="#F4B400" />
          <StatCard title="Health Metrics" value={stats?.total_health_metrics || 0} icon="heart" color="#DB4437" />
          <StatCard title="Journal Entries" value={stats?.total_journal_entries || 0} icon="book" color="#673AB7" />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Users</Text>
        {stats?.recent_users?.map((user) => (
          <View key={user.id}>{renderUserItem({ item: user })}</View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logoutBtn: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  userStats: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
});

export default AdminDashboardScreen;
