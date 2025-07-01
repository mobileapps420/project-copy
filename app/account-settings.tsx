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
import { ArrowLeft, User, Mail, Save, CreditCard as Edit3 } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function AccountSettingsScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      fetchProfile(); // Refresh the profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
      });
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderProfileInfo = () => (
    <View style={styles.profileContainer}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <User size={32} color="#000000" />
        </View>
        <Text style={styles.avatarLabel}>Profile Picture</Text>
        <Text style={styles.avatarSubtext}>Coming soon</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>{profile?.full_name || 'Not set'}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email Address</Text>
          <Text style={styles.infoValue}>{profile?.email}</Text>
          <Text style={styles.infoNote}>Email cannot be changed</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
        <Edit3 size={16} color="#FFFFFF" />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEditForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Edit Profile</Text>
      <Text style={styles.formSubtitle}>Update your personal information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={formData.full_name}
          onChangeText={(text) => setFormData({ ...formData, full_name: text })}
          placeholder="Enter your full name"
          placeholderTextColor="#A0AEC0"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={formData.email}
          editable={false}
          placeholder="Email address"
          placeholderTextColor="#A0AEC0"
        />
        <Text style={styles.inputNote}>Email address cannot be changed</Text>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Save size={16} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
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
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : isEditing ? (
          renderEditForm()
        ) : (
          renderProfileInfo()
        )}

        {/* Account Information */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.accountInfo}>
            <View style={styles.accountItem}>
              <Mail size={16} color="#A7C5BD" />
              <View style={styles.accountItemContent}>
                <Text style={styles.accountItemTitle}>Email Verification</Text>
                <Text style={styles.accountItemSubtext}>Your email is verified</Text>
              </View>
            </View>
          </View>
        </View>
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
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#000000',
  },
  profileContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  avatarSubtext: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  infoNote: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A7C5BD',
    borderRadius: 12,
    paddingVertical: 12,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#A0AEC0',
  },
  inputNote: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 4,
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
  saveButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  accountSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  accountInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountItemContent: {
    marginLeft: 12,
  },
  accountItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  accountItemSubtext: {
    fontSize: 12,
    color: '#68D391',
  },
});