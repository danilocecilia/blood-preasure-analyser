import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { bloodPressureService, BloodPressureReading } from '../services/supabaseClient';

interface ReadingsListProps {
  onRefresh?: () => void;
}

export default function ReadingsList({ onRefresh }: ReadingsListProps) {
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingReading, setEditingReading] = useState<BloodPressureReading | null>(null);
  const [editForm, setEditForm] = useState({ systolic: '', diastolic: '', pulse: '', notes: '' });

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

  const openEditModal = (reading: BloodPressureReading) => {
    setEditingReading(reading);
    setEditForm({
      systolic: reading.systolic.toString(),
      diastolic: reading.diastolic.toString(),
      pulse: reading.pulse.toString(),
      notes: reading.notes || '',
    });
  };

  const saveEditedReading = async () => {
    if (!editingReading) return;
    
    try {
      const updatedReading = {
        ...editingReading,
        systolic: parseInt(editForm.systolic),
        diastolic: parseInt(editForm.diastolic),
        pulse: parseInt(editForm.pulse),
        notes: editForm.notes,
      };
      
      await bloodPressureService.updateReading(editingReading.id!, updatedReading);
      setEditingReading(null);
      await loadReadings();
      Alert.alert('Success', 'Reading updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update reading');
      console.error('Update reading error:', error);
    }
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
        
        {item.image_url && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setSelectedImage(item.image_url!)}
          >
            <Image source={{ uri: item.image_url }} style={styles.thumbnailImage} />
            <Text style={styles.imageText}>View Image</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteReading(item.id!)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
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
    <View style={styles.container}>
      <FlatList
        data={readings}
        renderItem={renderReading}
        keyExtractor={(item) => item.id!}
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
      
      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity 
            style={styles.imageModalContainer}
            onPress={() => setSelectedImage(null)}
          >
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        visible={editingReading !== null}
        transparent={true}
        onRequestClose={() => setEditingReading(null)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>Edit Reading</Text>
            
            <ScrollView style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Systolic</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.systolic}
                  onChangeText={(text) => setEditForm({...editForm, systolic: text})}
                  keyboardType="numeric"
                  placeholder="120"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Diastolic</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.diastolic}
                  onChangeText={(text) => setEditForm({...editForm, diastolic: text})}
                  keyboardType="numeric"
                  placeholder="80"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pulse</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.pulse}
                  onChangeText={(text) => setEditForm({...editForm, pulse: text})}
                  keyboardType="numeric"
                  placeholder="70"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={editForm.notes}
                  onChangeText={(text) => setEditForm({...editForm, notes: text})}
                  multiline
                  placeholder="Add notes..."
                />
              </View>
            </ScrollView>
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingReading(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveEditedReading}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  thumbnailImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  imageText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  editForm: {
    maxHeight: 300,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});