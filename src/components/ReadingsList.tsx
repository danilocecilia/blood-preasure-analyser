import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { bloodPressureService, BloodPressureReading } from '../services/supabaseClient';

interface ReadingsListProps {
  onRefresh?: () => void;
}

export default function ReadingsList({ onRefresh }: ReadingsListProps) {
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReadings = async () => {
    try {
      const data = await bloodPressureService.getAllReadings();
      setReadings(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load readings');
      console.error('Load readings error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReadings();
    onRefresh?.();
  };

  const deleteReading = async (id: string) => {
    Alert.alert(
      'Delete Reading',
      'Are you sure you want to delete this reading?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bloodPressureService.deleteReading(id);
              await loadReadings();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reading');
              console.error('Delete reading error:', error);
            }
          },
        },
      ]
    );
  };

  const getBloodPressureCategory = (systolic: number, diastolic: number) => {
    if (systolic < 120 && diastolic < 80) return { category: 'Normal', color: '#4CAF50' };
    if (systolic < 130 && diastolic < 80) return { category: 'Elevated', color: '#FF9800' };
    if (systolic < 140 || diastolic < 90) return { category: 'High Stage 1', color: '#F44336' };
    if (systolic < 180 || diastolic < 120) return { category: 'High Stage 2', color: '#D32F2F' };
    return { category: 'Crisis', color: '#B71C1C' };
  };

  useEffect(() => {
    loadReadings();
  }, []);

  const renderReading = ({ item }: { item: BloodPressureReading }) => {
    const { category, color } = getBloodPressureCategory(item.systolic, item.diastolic);
    const date = new Date(item.timestamp);

    return (
      <View style={styles.readingCard}>
        <View style={styles.readingHeader}>
          <View style={styles.readingValues}>
            <Text style={styles.pressureText}>
              {item.systolic}/{item.diastolic}
            </Text>
            <Text style={styles.pulseText}>♥ {item.pulse} bpm</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: color }]}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        </View>
        
        <Text style={styles.timestampText}>
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </Text>
        
        {item.notes && (
          <Text style={styles.notesText}>{item.notes}</Text>
        )}
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteReading(item.id!)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading readings...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={readings}
      renderItem={renderReading}
      keyExtractor={(item) => item.id!}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No readings yet</Text>
          <Text style={styles.emptySubtext}>Take a photo to get started</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  readingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  readingValues: {
    flex: 1,
  },
  pressureText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pulseText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timestampText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});