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
  Animated,
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
  const [expandedReadings, setExpandedReadings] = useState<Set<string>>(new Set());
  const [deleteConfirmReading, setDeleteConfirmReading] = useState<BloodPressureReading | null>(null);
  const [editAnimation] = useState(new Animated.Value(0));
  const [deleteAnimation] = useState(new Animated.Value(0));

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

  const showDeleteConfirmation = (reading: BloodPressureReading) => {
    setDeleteConfirmReading(reading);
    Animated.spring(deleteAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hideDeleteConfirmation = () => {
    Animated.timing(deleteAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDeleteConfirmReading(null);
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmReading) return;
    
    try {
      await bloodPressureService.deleteReading(deleteConfirmReading.id!);
      hideDeleteConfirmation();
      await loadReadings();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete reading');
      console.error('Delete reading error:', error);
    }
  };

  const openEditModal = (reading: BloodPressureReading) => {
    setEditingReading(reading);
    setEditForm({
      systolic: reading.systolic.toString(),
      diastolic: reading.diastolic.toString(),
      pulse: reading.pulse.toString(),
      notes: reading.notes || '',
    });
    
    Animated.spring(editAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeEditModal = () => {
    Animated.timing(editAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setEditingReading(null);
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
      closeEditModal();
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

  const getTrendComparison = (currentReading: BloodPressureReading, index: number) => {
    if (index >= readings.length - 1) return null;
    
    const previousReading = readings[index + 1];
    const systolicDiff = currentReading.systolic - previousReading.systolic;
    const diastolicDiff = currentReading.diastolic - previousReading.diastolic;
    
    const getIcon = (diff: number) => {
      if (diff > 5) return '⬆️';
      if (diff < -5) return '⬇️';
      return '➡️';
    };
    
    const formatDiff = (diff: number) => {
      if (diff > 0) return `+${diff}`;
      return diff.toString();
    };
    
    return {
      systolic: { diff: systolicDiff, icon: getIcon(systolicDiff), text: formatDiff(systolicDiff) },
      diastolic: { diff: diastolicDiff, icon: getIcon(diastolicDiff), text: formatDiff(diastolicDiff) }
    };
  };

  const parseAnalysisNotes = (notes: string) => {
    if (!notes) return { summary: '', points: [] };
    
    // Split by common patterns and extract key points
    const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summary = sentences[0]?.trim() || '';
    
    const points = sentences.slice(1).map(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return null;
      
      // Assign icons based on content
      let icon = '📋';
      if (trimmed.toLowerCase().includes('normal') || trimmed.toLowerCase().includes('good')) icon = '✅';
      if (trimmed.toLowerCase().includes('high') || trimmed.toLowerCase().includes('elevated')) icon = '⚠️';
      if (trimmed.toLowerCase().includes('recommend') || trimmed.toLowerCase().includes('consider')) icon = '💡';
      if (trimmed.toLowerCase().includes('concern') || trimmed.toLowerCase().includes('monitor')) icon = '🩺';
      
      return { icon, text: trimmed };
    }).filter(Boolean);
    
    return { summary, points };
  };

  const toggleExpanded = (readingId: string) => {
    const newExpanded = new Set(expandedReadings);
    if (newExpanded.has(readingId)) {
      newExpanded.delete(readingId);
    } else {
      newExpanded.add(readingId);
    }
    setExpandedReadings(newExpanded);
  };

  useEffect(() => {
    loadReadings();
  }, []);

  const renderReading = ({ item, index }: { item: BloodPressureReading; index: number }) => {
    const { category, color } = getBloodPressureCategory(item.systolic, item.diastolic);
    const date = new Date(item.timestamp);
    const trend = getTrendComparison(item, index);
    const analysis = parseAnalysisNotes(item.notes || '');
    const isExpanded = expandedReadings.has(item.id!);

    return (
      <View style={styles.readingCard}>
        <View style={styles.readingHeader}>
          <View style={styles.readingValues}>
            <View style={styles.pressureRow}>
              <Text style={styles.pressureText}>
                {item.systolic}/{item.diastolic}
              </Text>
              {trend && (
                <View style={styles.trendContainer}>
                  <Text style={styles.trendText}>
                    {trend.systolic.icon} {trend.systolic.text}/{trend.diastolic.text}
                  </Text>
                  <Text style={styles.trendLabel}>vs last reading</Text>
                </View>
              )}
            </View>
            <Text style={styles.pulseText}>♥ {item.pulse} bpm</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: color }]}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        </View>
        
        <Text style={styles.timestampText}>
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </Text>
        
        {analysis.summary && (
          <View style={styles.analysisContainer}>
            <Text style={styles.analysisSummary}>💬 {analysis.summary}</Text>
            
            {analysis.points.length > 0 && (
              <TouchableOpacity 
                style={styles.expandButton}
                onPress={() => toggleExpanded(item.id!)}
              >
                <Text style={styles.expandButtonText}>
                  {isExpanded ? '🔽 Hide Details' : '🔼 View Analysis'}
                </Text>
              </TouchableOpacity>
            )}
            
            {isExpanded && analysis.points.length > 0 && (
              <View style={styles.analysisPoints}>
                {analysis.points.map((point, idx) => (
                  <View key={idx} style={styles.analysisPoint}>
                    <Text style={styles.pointIcon}>{point.icon}</Text>
                    <Text style={styles.pointText}>{point.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        {item.image_url && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setSelectedImage(item.image_url!)}
          >
            <Image source={{ uri: item.image_url }} style={styles.thumbnailImage} />
            <Text style={styles.imageText}>📷 View Original</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => showDeleteConfirmation(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
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
        onRequestClose={closeEditModal}
        animationType="none"
      >
        <View style={styles.editModalOverlay}>
          <Animated.View 
            style={[
              styles.editModalContainer,
              {
                transform: [
                  {
                    translateY: editAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                  {
                    scale: editAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
                opacity: editAnimation,
              }
            ]}
          >
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
                onPress={closeEditModal}
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
          </Animated.View>
        </View>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmReading !== null}
        transparent={true}
        onRequestClose={hideDeleteConfirmation}
        animationType="none"
      >
        <View style={styles.deleteModalOverlay}>
          <Animated.View 
            style={[
              styles.deleteModalContainer,
              {
                transform: [
                  {
                    translateY: deleteAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [200, 0],
                    }),
                  },
                ],
                opacity: deleteAnimation,
              }
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalIcon}>🗑️</Text>
              <Text style={styles.deleteModalTitle}>Delete Reading</Text>
            </View>
            
            {deleteConfirmReading && (
              <View style={styles.deleteModalContent}>
                <Text style={styles.deleteModalText}>
                  Are you sure you want to delete this reading?
                </Text>
                <View style={styles.deleteReadingPreview}>
                  <Text style={styles.deletePreviewText}>
                    📅 {new Date(deleteConfirmReading.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={styles.deletePreviewValues}>
                    {deleteConfirmReading.systolic}/{deleteConfirmReading.diastolic} mmHg
                  </Text>
                  <Text style={styles.deletePreviewPulse}>
                    ♥ {deleteConfirmReading.pulse} bpm
                  </Text>
                </View>
                <Text style={styles.deleteWarningText}>
                  ⚠️ This action cannot be undone
                </Text>
              </View>
            )}
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={hideDeleteConfirmation}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
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
  pressureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pressureText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  trendContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  trendLabel: {
    fontSize: 10,
    color: '#6c757d',
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
    marginBottom: 12,
  },
  analysisContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  analysisSummary: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  expandButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    marginBottom: 8,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  analysisPoints: {
    gap: 8,
  },
  analysisPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  pointIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  pointText: {
    fontSize: 13,
    color: '#495057',
    flex: 1,
    lineHeight: 18,
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  deleteModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  deleteModalContent: {
    marginBottom: 24,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  deleteReadingPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  deletePreviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  deletePreviewValues: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  deletePreviewPulse: {
    fontSize: 14,
    color: '#666',
  },
  deleteWarningText: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
    fontWeight: '500',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});