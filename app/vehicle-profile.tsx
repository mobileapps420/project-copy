import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Car, Save, Plus, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  license_plate?: string;
}

export default function VehicleProfileScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
  });

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!formData.make || !formData.model || !formData.year) {
      Alert.alert('Error', 'Please fill in make, model, and year');
      return;
    }

    const year = parseInt(formData.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Please enter a valid year');
      return;
    }

    try {
      const vehicleData = {
        make: formData.make.trim(),
        model: formData.model.trim(),
        year,
        user_id: user?.id,
      };

      if (editingVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        Alert.alert('Success', 'Vehicle updated successfully');
      } else {
        // Add new vehicle
        const { error } = await supabase
          .from('vehicles')
          .insert(vehicleData);

        if (error) throw error;
        Alert.alert('Success', 'Vehicle added successfully');
      }

      // Reset form and refresh list
      setFormData({ make: '', model: '', year: '' });
      setEditingVehicle(null);
      setIsAddingNew(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      Alert.alert('Error', 'Failed to save vehicle');
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
    });
    setEditingVehicle(vehicle);
    setIsAddingNew(true);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicle.id);

              if (error) throw error;
              Alert.alert('Success', 'Vehicle deleted successfully');
              fetchVehicles();
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const handleAddNew = () => {
    setFormData({ make: '', model: '', year: '' });
    setEditingVehicle(null);
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setFormData({ make: '', model: '', year: '' });
    setEditingVehicle(null);
    setIsAddingNew(false);
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <View key={vehicle.id} style={styles.vehicleCard}>
      <View style={styles.vehicleInfo}>
        <View style={styles.vehicleIcon}>
          <Car size={24} color="#000000" />
        </View>
        <View style={styles.vehicleDetails}>
          <Text style={styles.vehicleName}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
          <Text style={styles.vehicleSubtext}>Added to your garage</Text>
        </View>
      </View>
      <View style={styles.vehicleActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditVehicle(vehicle)}
        >
          <Edit3 size={16} color="#A7C5BD" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteVehicle(vehicle)}
        >
          <Trash2 size={16} color="#F56565" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>
        {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
      </Text>
      
      <Text style={styles.formSubtitle}>
        Just the basics - make, model, and year are all we need!
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Make</Text>
        <TextInput
          style={styles.input}
          value={formData.make}
          onChangeText={(text) => setFormData({ ...formData, make: text })}
          placeholder="e.g., Toyota, Ford, BMW"
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Model</Text>
        <TextInput
          style={styles.input}
          value={formData.model}
          onChangeText={(text) => setFormData({ ...formData, model: text })}
          placeholder="e.g., Camry, F-150, X3"
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Year</Text>
        <TextInput
          style={styles.input}
          value={formData.year}
          onChangeText={(text) => setFormData({ ...formData, year: text })}
          placeholder="e.g., 2020"
          placeholderTextColor="#A0AEC0"
          keyboardType="numeric"
          maxLength={4}
        />
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveVehicle}>
          <Save size={16} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Vehicle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isAddingNew ? (
          renderForm()
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Vehicles</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Vehicle</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading vehicles...</Text>
                </View>
              ) : vehicles.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Car size={48} color="#E2E8F0" />
                  <Text style={styles.emptyTitle}>No vehicles added yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Add your vehicle details to get more accurate diagnostics and recommendations
                  </Text>
                  <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddNew}>
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.emptyAddButtonText}>Add Your First Vehicle</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.vehiclesList}>
                  {vehicles.map(renderVehicleCard)}
                </View>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Why add vehicle details?</Text>
              <View style={styles.infoList}>
                <Text style={styles.infoItem}>• More accurate diagnostic recommendations</Text>
                <Text style={styles.infoItem}>• Vehicle-specific repair guides and tips</Text>
                <Text style={styles.infoItem}>• Better cost estimates for repairs</Text>
                <Text style={styles.infoItem}>• Tailored maintenance suggestions</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A7C5BD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#000000',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A7C5BD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  vehiclesList: {
    gap: 12,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A7C5BD20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  vehicleSubtext: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 2,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A7C5BD',
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
});