import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { bloodPressureService, BloodPressureReading } from '../services/supabaseClient';
import { getMockReadings, getReadingsByDateRange } from '../mockData/bloodPressureReadings';
const screenWidth = Dimensions.get('window').width;

type DateRange = '7d' | '15d' | '30d' | '3m' | '6m' | '1y';

interface DateRangeOption {
  label: string;
  value: DateRange;
  days: number;
  icon: string;
  color: string;
}

const dateRangeOptions: DateRangeOption[] = [
  { label: '7 Days', value: '7d', days: 7, icon: '📅', color: '#10b981' },
  { label: '15 Days', value: '15d', days: 15, icon: '📊', color: '#3b82f6' },
  { label: '30 Days', value: '30d', days: 30, icon: '📈', color: '#8b5cf6' },
  { label: '3 Months', value: '3m', days: 90, icon: '📉', color: '#f59e0b' },
  { label: '6 Months', value: '6m', days: 180, icon: '📋', color: '#ef4444' },
  { label: '1 Year', value: '1y', days: 365, icon: '🗓️', color: '#6b7280' },
];

export default function Dashboard() {
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange>('30d');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const loadReadings = async () => {
    setLoading(true);
    try {
      const selectedOption = dateRangeOptions.find(option => option.value === selectedRange);
      const daysBack = selectedOption?.days || 30;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      const data = await bloodPressureService.getReadingsByDateRange(startDate, new Date());
      setReadings(data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } catch (error) {
      console.error('Error loading readings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, [selectedRange]);

  const handleRangeSelection = (newRange: DateRange) => {
    if (newRange !== selectedRange) {
      // Trigger scale animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setSelectedRange(newRange);
    }
  };

  const getChartData = () => {
    if (readings.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [70],
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      };
    }

    // Format dates in a friendlier format
    const labels = readings.map((reading) => {
      const date = new Date(reading.timestamp);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    });

    // Show fewer labels for readability
    const displayLabels = labels.length > 5 ? 
      labels.filter((_, index) => index % Math.ceil(labels.length / 5) === 0) : labels;

    return {
      labels: displayLabels,
      datasets: [
        {
          data: readings.map(reading => reading.systolic),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue for systolic
          strokeWidth: 4,
          withDots: true,
        },
        {
          data: readings.map(reading => reading.diastolic),
          color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`, // Orange for diastolic
          strokeWidth: 4,
          withDots: true,
        },
      ],
    };
  };

  const getAverages = () => {
    if (readings.length === 0) return { systolic: 0, diastolic: 0, pulse: 0 };
    
    const sum = readings.reduce(
      (acc, reading) => ({
        systolic: acc.systolic + reading.systolic,
        diastolic: acc.diastolic + reading.diastolic,
        pulse: acc.pulse + reading.pulse,
      }),
      { systolic: 0, diastolic: 0, pulse: 0 }
    );

    return {
      systolic: Math.round(sum.systolic / readings.length),
      diastolic: Math.round(sum.diastolic / readings.length),
      pulse: Math.round(sum.pulse / readings.length),
    };
  };

  const getBloodPressureCategory = (systolic: number, diastolic: number) => {
    if (systolic < 120 && diastolic < 80) return { category: 'Normal', color: '#4CAF50' };
    if (systolic < 130 && diastolic < 80) return { category: 'Elevated', color: '#FF9800' };
    if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) return { category: 'High Stage 1', color: '#F44336' };
    if ((systolic >= 140 && systolic < 180) || (diastolic >= 90 && diastolic < 120)) return { category: 'High Stage 2', color: '#D32F2F' };
    if (systolic >= 180 || diastolic >= 120) return { category: 'Hypertensive Crisis', color: '#B71C1C' };
    return { category: 'Normal', color: '#4CAF50' };
  };

  const averages = getAverages();
  const { category, color } = getBloodPressureCategory(averages.systolic, averages.diastolic);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Track your health trends</Text>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dateRangeOptions.map((option) => {
            const isSelected = selectedRange === option.value;
            return (
              <Animated.View
                key={option.value}
                style={[
                  styles.filterButtonContainer,
                  { transform: [{ scale: isSelected ? scaleAnim : 1 }] }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    isSelected && [
                      styles.activeFilterButton,
                      { backgroundColor: option.color }
                    ],
                  ]}
                  onPress={() => handleRangeSelection(option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.filterButtonIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.filterButtonText,
                      isSelected && styles.activeFilterButtonText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: '#ffffff40' }]} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      {readings.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No readings found</Text>
          <Text style={styles.noDataSubtext}>
            Take some blood pressure readings to see your trends
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🩸</Text>
              <Text style={styles.statLabel}>Average Reading</Text>
              <Text style={styles.statValue}>
                {averages.systolic}/{averages.diastolic}
              </Text>
              <Text style={styles.statUnit}>mmHg</Text>
              <View style={[styles.categoryBadge, { backgroundColor: color }]}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statLabel}>Average Pulse</Text>
              <Text style={styles.statValue}>{averages.pulse}</Text>
              <Text style={styles.statUnit}>bpm</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📊</Text>
              <Text style={styles.statLabel}>Total Readings</Text>
              <Text style={styles.statValue}>{readings.length}</Text>
              <Text style={styles.statUnit}>measurements</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Blood Pressure Trends</Text>
            <Text style={styles.chartSubtitle}>Track your progress over time</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              scrollIndicatorInsets={{ bottom: 0 }}
              style={styles.chartScrollView}
            >
              <LineChart
                data={getChartData()}
                width={Math.max(screenWidth - 32, readings.length * 50)}
                height={300}
                yAxisSuffix=" mmHg"
                fromZero={false}
                yAxisInterval={1}
                segments={4}
                chartConfig={{
                  backgroundColor: '#1f2937',
                  backgroundGradientFrom: '#1f2937',
                  backgroundGradientTo: '#374151',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(243, 244, 246, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '3',
                    stroke: '#1f2937',
                    fill: '#ffffff',
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '3,3',
                    stroke: '#374151',
                    strokeWidth: 1,
                  },
                  fillShadowGradient: '#3b82f6',
                  fillShadowGradientOpacity: 0.1,
                }}
                withHorizontalLabels={true}
                withVerticalLabels={true}
                withInnerLines={true}
                withOuterLines={false}
                withHorizontalLines={true}
                withVerticalLines={false}
                withDots={true}
                withShadow={true}
                bezier
                style={styles.chart}
                onDataPointClick={(data) => {
                  const reading = readings[data.index];
                  if (reading) {
                    Alert.alert(
                      'Reading Details',
                      `Date: ${new Date(reading.timestamp).toLocaleDateString()}\n` +
                      `Systolic: ${reading.systolic} mmHg\n` +
                      `Diastolic: ${reading.diastolic} mmHg\n` +
                      `Pulse: ${reading.pulse} bpm\n` +
                      `${reading.notes ? `Notes: ${reading.notes}` : ''}`,
                      [{ text: 'OK' }]
                    );
                  }
                }}
              />
            </ScrollView>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendText}>Systolic (mmHg)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#f97316' }]} />
                <Text style={styles.legendText}>Diastolic (mmHg)</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  filtersContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  filterButtonContainer: {
    marginRight: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  activeFilterButton: {
    borderColor: 'transparent',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  filterButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#1f2937', // Dark background matching the image
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartScrollView: {
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#ffffff', // White text for dark background
  },
});