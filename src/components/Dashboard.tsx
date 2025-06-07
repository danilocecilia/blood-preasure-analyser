import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
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
}

const dateRangeOptions: DateRangeOption[] = [
  { label: '7 Days', value: '7d', days: 7 },
  { label: '15 Days', value: '15d', days: 15 },
  { label: '30 Days', value: '30d', days: 30 },
  { label: '3 Months', value: '3m', days: 90 },
  { label: '6 Months', value: '6m', days: 180 },
  { label: '1 Year', value: '1y', days: 365 },
];

export default function Dashboard() {
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange>('30d');

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

    const labels = readings.map((reading) => {
      const date = new Date(reading.timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });

    return {
      labels: labels.length > 7 ? labels.filter((_, index) => index % Math.ceil(labels.length / 7) === 0) : labels,
      datasets: [
        {
          data: readings.map(reading => reading.systolic),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue for systolic
          strokeWidth: 3,
        },
        {
          data: readings.map(reading => reading.diastolic),
          color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`, // Orange for diastolic
          strokeWidth: 3,
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
    if (systolic < 140 || diastolic < 90) return { category: 'High Stage 1', color: '#F44336' };
    if (systolic < 180 || diastolic < 120) return { category: 'High Stage 2', color: '#D32F2F' };
    return { category: 'Crisis', color: '#B71C1C' };
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
        <Text style={styles.title}>Blood Pressure Dashboard</Text>
        <Text style={styles.subtitle}>Track your health trends</Text>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                selectedRange === option.value && styles.activeFilterButton,
              ]}
              onPress={() => setSelectedRange(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedRange === option.value && styles.activeFilterButtonText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
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
              <Text style={styles.statLabel}>Average Reading</Text>
              <Text style={styles.statValue}>
                {averages.systolic}/{averages.diastolic}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: color }]}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average Pulse</Text>
              <Text style={styles.statValue}>♥ {averages.pulse}</Text>
              <Text style={styles.statUnit}>bpm</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Readings</Text>
              <Text style={styles.statValue}>{readings.length}</Text>
              <Text style={styles.statUnit}>measurements</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Blood Pressure Readings Over Time</Text>
            <LineChart
              data={getChartData()}
              width={screenWidth - 32}
              height={280}
              yAxisSuffix=""
              fromZero={false}
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: '#1f2937',
                backgroundGradientFrom: '#1f2937',
                backgroundGradientTo: '#1f2937',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`, // Gray for grid lines and labels
                labelColor: (opacity = 1) => `rgba(243, 244, 246, ${opacity})`, // Light gray for labels
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#1f2937',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '', // solid grid lines
                  stroke: '#374151',
                  strokeWidth: 1,
                },
                fillShadowGradient: 'transparent',
                fillShadowGradientOpacity: 0,
              }}
              withHorizontalLabels={true}
              withVerticalLabels={true}
              withInnerLines={true}
              withOuterLines={true}
              withHorizontalLines={true}
              withVerticalLines={true}
              withDots={true}
              withShadow={false}
              bezier
              style={styles.chart}
            />
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
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
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
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 12,
    color: '#666',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff', // White text for dark background
    marginBottom: 16,
    textAlign: 'center',
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