import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Car, MessageCircle, History as HistoryIcon } from 'lucide-react-native';
import { useDiagnosticSessions } from '@/hooks/useDiagnosticSessions';
import { Database } from '@/lib/database.types';

type DiagnosticSession = Database['public']['Tables']['diagnostic_sessions']['Row'];

export default function HistoryScreen() {
  const { sessions, loading } = useDiagnosticSessions();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return '#68D391';
      case 'pending': return '#F6AD55';
      case 'in-progress': return '#A7C5BD';
      default: return '#A0AEC0';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#F56565';
      case 'medium': return '#F6AD55';
      case 'low': return '#68D391';
      default: return '#A0AEC0';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={16} color="#68D391" />;
      case 'pending':
        return <Clock size={16} color="#F6AD55" />;
      case 'in-progress':
        return <MessageCircle size={16} color="#A7C5BD" />;
      default:
        return <AlertTriangle size={16} color="#A0AEC0" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved': return 'Resolved';
      case 'pending': return 'New';
      case 'in-progress': return 'Active';
      default: return status;
    }
  };

  const renderSession = ({ item }: { item: DiagnosticSession }) => (
    <TouchableOpacity style={styles.sessionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.statusContainer}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Calendar size={12} color="#000000" />
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.issueTitle} numberOfLines={2}>
        {item.issue_description}
      </Text>
      
      {item.recommendation && (
        <View style={styles.recommendation}>
          <Text style={styles.recommendationText} numberOfLines={2}>
            💡 {item.recommendation}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
          <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.viewButton}>
          <MessageCircle size={14} color="#A7C5BD" />
          <Text style={styles.viewButtonText}>View Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Car size={32} color="#A7C5BD" />
          <Text style={styles.loadingText}>Loading your diagnostic history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <HistoryIcon size={20} color="#000000" />
            </View>
            <Text style={styles.headerTitle}>History</Text>
          </View>
          <View style={styles.sessionCount}>
            <Text style={styles.sessionCountText}>{sessions.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Car size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No diagnostic sessions yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation with AI Mechanic to begin tracking your vehicle's diagnostic history
            </Text>
            <View style={styles.emptyFeatures}>
              <Text style={styles.featureText}>• AI-powered diagnostics</Text>
              <Text style={styles.featureText}>• Voice & image analysis</Text>
              <Text style={styles.featureText}>• Professional recommendations</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  sessionCount: {
    backgroundColor: '#A7C5BD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sessionCountText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120, // Account for tab bar height
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#000000',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    lineHeight: 22,
  },
  recommendation: {
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 197, 189, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 197, 189, 0.3)',
  },
  viewButtonText: {
    color: '#A7C5BD',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyFeatures: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
});