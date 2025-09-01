import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import apiService from '../services/apiService';
import storageService from '../services/storageService';
import config from '../config';

const MRVUploadScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    projectId: '',
    co2Sequestered: '',
    unit: 'tons',
    measurementDate: new Date().toISOString().split('T')[0],
    measurementMethod: 'ground_survey',
    measurementLocation: '',
    coordinates: null,
  });

  const [environmentalData, setEnvironmentalData] = useState({
    temperature: '',
    humidity: '',
    salinity: '',
    ph: '',
    notes: '',
  });

  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    loadUserProfile();
    loadProjects();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await storageService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const isOnline = await apiService.isOnline();
      
      if (isOnline) {
        const response = await apiService.getProjects();
        if (response.success) {
          setProjects(response.data.projects || []);
          await storageService.cacheProjects(response.data.projects || []);
        }
      } else {
        const cachedProjects = await storageService.getCachedProjects();
        setProjects(cachedProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // Try to load from cache
      const cachedProjects = await storageService.getCachedProjects();
      setProjects(cachedProjects);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEnvironmentalData = (field, value) => {
    setEnvironmentalData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.projectId.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Project ID Required',
        text2: 'Please select a project',
      });
      return false;
    }

    if (!formData.co2Sequestered || parseFloat(formData.co2Sequestered) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'CO2 Data Required',
        text2: 'Please enter valid CO2 sequestration data',
      });
      return false;
    }

    const co2Value = parseFloat(formData.co2Sequestered);
    if (co2Value < config.VALIDATION.CO2_MIN || co2Value > config.VALIDATION.CO2_MAX) {
      Toast.show({
        type: 'error',
        text1: 'Invalid CO2 Data',
        text2: `CO2 value must be between ${config.VALIDATION.CO2_MIN} and ${config.VALIDATION.CO2_MAX}`,
      });
      return false;
    }

    if (!formData.measurementDate) {
      Toast.show({
        type: 'error',
        text1: 'Measurement Date Required',
        text2: 'Please select a measurement date',
      });
      return false;
    }

    if (!formData.measurementLocation.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Measurement Location Required',
        text2: 'Please enter the measurement location',
      });
      return false;
    }

    return true;
  };

  const handleImagePicker = (type) => {
    const options = {
      mediaType: 'photo',
      quality: config.UPLOAD.IMAGE_QUALITY,
      maxWidth: 1920,
      maxHeight: 1080,
      includeBase64: false,
    };

    const launchFunction = type === 'camera' ? launchCamera : launchImageLibrary;

    launchFunction(options, (response) => {
      if (response.didCancel) {
        return;
      }

      if (response.error) {
        Toast.show({
          type: 'error',
          text1: 'Image Selection Error',
          text2: response.error,
        });
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        
        // Check file size
        if (asset.fileSize > config.UPLOAD.MAX_FILE_SIZE) {
          Toast.show({
            type: 'error',
            text1: 'File Too Large',
            text2: `File size must be less than ${config.UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB`,
          });
          return;
        }

        // Check file type
        if (!config.UPLOAD.ALLOWED_TYPES.includes(asset.type)) {
          Toast.show({
            type: 'error',
            text1: 'Invalid File Type',
            text2: 'Please select an image file (JPEG, PNG)',
          });
          return;
        }

        const newAttachment = {
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `mrv_attachment_${Date.now()}.jpg`,
          size: asset.fileSize,
        };

        if (attachments.length >= config.UPLOAD.MAX_FILES) {
          Toast.show({
            type: 'error',
            text1: 'Too Many Files',
            text2: `Maximum ${config.UPLOAD.MAX_FILES} files allowed`,
          });
          return;
        }

        setAttachments(prev => [...prev, newAttachment]);
      }
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const mrvData = {
        projectId: formData.projectId,
        measurementData: {
          co2Sequestered: parseFloat(formData.co2Sequestered),
          unit: formData.unit,
          measurementDate: formData.measurementDate,
          measurementMethod: formData.measurementMethod,
          measurementLocation: formData.measurementLocation,
          coordinates: formData.coordinates,
        },
        environmentalData: {
          temperature: environmentalData.temperature ? parseFloat(environmentalData.temperature) : null,
          humidity: environmentalData.humidity ? parseFloat(environmentalData.humidity) : null,
          salinity: environmentalData.salinity ? parseFloat(environmentalData.salinity) : null,
          ph: environmentalData.ph ? parseFloat(environmentalData.ph) : null,
          notes: environmentalData.notes,
        },
        reporter: {
          address: userProfile?.address || '0x0000000000000000000000000000000000000000',
          name: userProfile?.name || 'Unknown',
          email: userProfile?.email || '',
          organization: userProfile?.organization || '',
        },
        qualityControl: {
          qualityScore: 0,
          qualityNotes: '',
        },
        attachments: attachments,
      };

      const isOnline = await apiService.isOnline();
      
      if (isOnline) {
        // Online submission
        const response = await apiService.uploadMRVData(mrvData);
        
        if (response.success) {
          Toast.show({
            type: 'success',
            text1: 'MRV Data Uploaded',
            text2: `MRV data for project ${formData.projectId} has been successfully uploaded`,
          });
          
          // Cache the MRV data locally
          await storageService.addCachedMRVData(response.data);
          
          navigation.goBack();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Upload Failed',
            text2: response.message || 'Failed to upload MRV data',
          });
        }
      } else {
        // Offline submission
        await storageService.addToSyncQueue('uploadMRVData', mrvData);
        
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'MRV data will be uploaded when connection is restored',
        });
        
        navigation.goBack();
      }
    } catch (error) {
      console.error('MRV upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Error',
        text2: error.message || 'An error occurred during upload',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderAttachmentItem = (attachment, index) => (
    <View key={index} style={styles.attachmentItem}>
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName} numberOfLines={1}>
          {attachment.name}
        </Text>
        <Text style={styles.attachmentSize}>
          {(attachment.size / 1024 / 1024).toFixed(2)} MB
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeAttachment(index)}
        disabled={isLoading}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProjectItem = (project) => (
    <TouchableOpacity
      key={project.projectId}
      style={[
        styles.projectItem,
        selectedProject?.projectId === project.projectId && styles.selectedProjectItem
      ]}
      onPress={() => {
        setSelectedProject(project);
        updateFormData('projectId', project.projectId);
      }}
      disabled={isLoading}
    >
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{project.name}</Text>
        <Text style={styles.projectLocation}>{project.location}</Text>
        <Text style={styles.projectStatus}>
          Status: {project.status} • Area: {project.area} {project.areaUnit}
        </Text>
      </View>
      {selectedProject?.projectId === project.projectId && (
        <Text style={styles.selectedIndicator}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Upload MRV Data</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Project Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Select Project *</Text>
              <Text style={styles.inputSubtext}>
                Choose the project for which you're uploading MRV data
              </Text>
              
              {projects.length > 0 ? (
                <View style={styles.projectsList}>
                  {projects.map(renderProjectItem)}
                </View>
              ) : (
                <View style={styles.noProjects}>
                  <Text style={styles.noProjectsText}>No projects available</Text>
                  <TouchableOpacity
                    style={styles.addProjectButton}
                    onPress={() => navigation.navigate('ProjectRegistration')}
                  >
                    <Text style={styles.addProjectButtonText}>Add New Project</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* CO2 Data */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex2]}>
                <Text style={styles.inputLabel}>CO2 Sequestered *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter CO2 value"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={formData.co2Sequestered}
                  onChangeText={(value) => updateFormData('co2Sequestered', value)}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>Unit</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      Alert.alert(
                        'Select Unit',
                        'Choose CO2 unit',
                        [
                          { text: 'tons', onPress: () => updateFormData('unit', 'tons') },
                          { text: 'kg', onPress: () => updateFormData('unit', 'kg') },
                          { text: 'metric_tons', onPress: () => updateFormData('unit', 'metric_tons') },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.pickerButtonText}>{formData.unit}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Measurement Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Measurement Date *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={formData.measurementDate}
                onChangeText={(value) => updateFormData('measurementDate', value)}
                editable={!isLoading}
              />
            </View>

            {/* Measurement Method */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Measurement Method</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Method',
                      'Choose measurement method',
                      [
                        { text: 'Ground Survey', onPress: () => updateFormData('measurementMethod', 'ground_survey') },
                        { text: 'Satellite', onPress: () => updateFormData('measurementMethod', 'satellite') },
                        { text: 'Aerial Survey', onPress: () => updateFormData('measurementMethod', 'aerial_survey') },
                        { text: 'Sensor Network', onPress: () => updateFormData('measurementMethod', 'sensor_network') },
                        { text: 'Other', onPress: () => updateFormData('measurementMethod', 'other') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.measurementMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Measurement Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Measurement Location *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter measurement location"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={formData.measurementLocation}
                onChangeText={(value) => updateFormData('measurementLocation', value)}
                editable={!isLoading}
              />
            </View>

            {/* Environmental Data */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Environmental Data (Optional)</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>Temperature (°C)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter temperature"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={environmentalData.temperature}
                  onChangeText={(value) => updateEnvironmentalData('temperature', value)}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>Humidity (%)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter humidity"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={environmentalData.humidity}
                  onChangeText={(value) => updateEnvironmentalData('humidity', value)}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>Salinity (ppt)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter salinity"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={environmentalData.salinity}
                  onChangeText={(value) => updateEnvironmentalData('salinity', value)}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>pH</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter pH"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={environmentalData.ph}
                  onChangeText={(value) => updateEnvironmentalData('ph', value)}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Environmental Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter any additional environmental observations"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={environmentalData.notes}
                onChangeText={(value) => updateEnvironmentalData('notes', value)}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>

            {/* Attachments */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Attachments & Photos</Text>
              <Text style={styles.inputSubtext}>
                Upload measurement photos, data sheets, or supporting documents
              </Text>
              
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleImagePicker('camera')}
                  disabled={isLoading}
                >
                  <Text style={styles.uploadButtonText}>📷 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleImagePicker('gallery')}
                  disabled={isLoading}
                >
                  <Text style={styles.uploadButtonText}>🖼️ Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsList}>
                  {attachments.map(renderAttachmentItem)}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={config.UI.CARD_COLOR} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Upload MRV Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: config.UI.BACKGROUND_COLOR,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: config.UI.CARD_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: config.UI.SECONDARY_COLOR,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: config.UI.TEXT_PRIMARY,
    textAlign: 'center',
    marginRight: 40,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: config.UI.TEXT_PRIMARY,
    marginBottom: 8,
  },
  inputSubtext: {
    fontSize: 12,
    color: config.UI.TEXT_SECONDARY,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: config.UI.BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: config.UI.TEXT_PRIMARY,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: config.UI.BORDER_RADIUS,
    backgroundColor: '#FAFAFA',
  },
  pickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: config.UI.TEXT_PRIMARY,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: config.UI.TEXT_PRIMARY,
  },
  projectsList: {
    gap: 8,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: config.UI.BORDER_RADIUS,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedProjectItem: {
    borderColor: config.UI.PRIMARY_COLOR,
    backgroundColor: '#E8F5E8',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: config.UI.TEXT_PRIMARY,
    marginBottom: 4,
  },
  projectLocation: {
    fontSize: 14,
    color: config.UI.TEXT_SECONDARY,
    marginBottom: 4,
  },
  projectStatus: {
    fontSize: 12,
    color: config.UI.TEXT_SECONDARY,
  },
  selectedIndicator: {
    fontSize: 20,
    color: config.UI.PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  noProjects: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: config.UI.BORDER_RADIUS,
  },
  noProjectsText: {
    fontSize: 14,
    color: config.UI.TEXT_SECONDARY,
    marginBottom: 12,
  },
  addProjectButton: {
    backgroundColor: config.UI.SECONDARY_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addProjectButtonText: {
    color: config.UI.CARD_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: config.UI.SECONDARY_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: config.UI.CARD_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: config.UI.BORDER_RADIUS,
    padding: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    color: config.UI.TEXT_PRIMARY,
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 12,
    color: config.UI.TEXT_SECONDARY,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 16,
    color: config.UI.ERROR_COLOR,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: config.UI.PRIMARY_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: config.UI.PRIMARY_COLOR,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: config.UI.CARD_COLOR,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MRVUploadScreen;
