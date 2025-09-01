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
import { ActivityIndicator, Button } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import apiService from '../services/apiService';
import storageService from '../services/storageService';
import config from '../config';

const ProjectRegistrationScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    area: '',
    areaUnit: 'sqm',
    projectType: 'mangrove',
    coordinates: null,
  });

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await storageService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Project Name Required',
        text2: 'Please enter a project name',
      });
      return false;
    }

    if (formData.name.length < config.VALIDATION.PROJECT_NAME_MIN_LENGTH) {
      Toast.show({
        type: 'error',
        text1: 'Project Name Too Short',
        text2: `Project name must be at least ${config.VALIDATION.PROJECT_NAME_MIN_LENGTH} characters`,
      });
      return false;
    }

    if (!formData.location.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Location Required',
        text2: 'Please enter the project location',
      });
      return false;
    }

    if (formData.location.length < config.VALIDATION.LOCATION_MIN_LENGTH) {
      Toast.show({
        type: 'error',
        text1: 'Location Too Short',
        text2: `Location must be at least ${config.VALIDATION.LOCATION_MIN_LENGTH} characters`,
      });
      return false;
    }

    if (!formData.area || parseFloat(formData.area) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Area Required',
        text2: 'Please enter a valid project area',
      });
      return false;
    }

    const areaValue = parseFloat(formData.area);
    if (areaValue < config.VALIDATION.AREA_MIN || areaValue > config.VALIDATION.AREA_MAX) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Area',
        text2: `Area must be between ${config.VALIDATION.AREA_MIN} and ${config.VALIDATION.AREA_MAX}`,
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

        const newDocument = {
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `document_${Date.now()}.jpg`,
          size: asset.fileSize,
        };

        if (documents.length >= config.UPLOAD.MAX_FILES) {
          Toast.show({
            type: 'error',
            text1: 'Too Many Files',
            text2: `Maximum ${config.UPLOAD.MAX_FILES} files allowed`,
          });
          return;
        }

        setDocuments(prev => [...prev, newDocument]);
      }
    });
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const projectData = {
        ...formData,
        area: parseFloat(formData.area),
        documents: documents,
        owner: {
          address: userProfile?.address || '0x0000000000000000000000000000000000000000',
          name: userProfile?.name || 'Unknown',
          email: userProfile?.email || '',
          organization: userProfile?.organization || '',
        },
      };

      const isOnline = await apiService.isOnline();
      
      if (isOnline) {
        // Online submission
        const response = await apiService.registerProject(projectData);
        
        if (response.success) {
          Toast.show({
            type: 'success',
            text1: 'Project Registered',
            text2: `Project "${formData.name}" has been successfully registered`,
          });
          
          // Cache the project locally
          await storageService.addCachedProject(response.data);
          
          navigation.goBack();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: response.message || 'Failed to register project',
          });
        }
      } else {
        // Offline submission
        await storageService.addToSyncQueue('registerProject', projectData);
        
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Project will be registered when connection is restored',
        });
        
        navigation.goBack();
      }
    } catch (error) {
      console.error('Project registration error:', error);
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: error.message || 'An error occurred during registration',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDocumentItem = (document, index) => (
    <View key={index} style={styles.documentItem}>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName} numberOfLines={1}>
          {document.name}
        </Text>
        <Text style={styles.documentSize}>
          {(document.size / 1024 / 1024).toFixed(2)} MB
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeDocument(index)}
        disabled={isLoading}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
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
            <Text style={styles.title}>Register New Project</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Project Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Project Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter project name"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                maxLength={config.VALIDATION.PROJECT_NAME_MAX_LENGTH}
                editable={!isLoading}
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter project description"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={formData.description}
                onChangeText={(value) => updateFormData('description', value)}
                multiline
                numberOfLines={4}
                editable={!isLoading}
              />
            </View>

            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter project location"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={formData.location}
                onChangeText={(value) => updateFormData('location', value)}
                maxLength={config.VALIDATION.LOCATION_MAX_LENGTH}
                editable={!isLoading}
              />
            </View>

            {/* Area and Unit */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex2]}>
                <Text style={styles.inputLabel}>Area *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter area"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={formData.area}
                  onChangeText={(value) => updateFormData('area', value)}
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
                        'Choose area unit',
                        [
                          { text: 'sqm', onPress: () => updateFormData('areaUnit', 'sqm') },
                          { text: 'hectares', onPress: () => updateFormData('areaUnit', 'hectares') },
                          { text: 'acres', onPress: () => updateFormData('areaUnit', 'acres') },
                          { text: 'sqkm', onPress: () => updateFormData('areaUnit', 'sqkm') },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.pickerButtonText}>{formData.areaUnit}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Project Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Project Type</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Project Type',
                      'Choose project type',
                      [
                        { text: 'Mangrove', onPress: () => updateFormData('projectType', 'mangrove') },
                        { text: 'Seagrass', onPress: () => updateFormData('projectType', 'seagrass') },
                        { text: 'Saltmarsh', onPress: () => updateFormData('projectType', 'saltmarsh') },
                        { text: 'Kelp', onPress: () => updateFormData('projectType', 'kelp') },
                        { text: 'Other', onPress: () => updateFormData('projectType', 'other') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.projectType.charAt(0).toUpperCase() + formData.projectType.slice(1)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Document Upload */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Documents & Images</Text>
              <Text style={styles.inputSubtext}>
                Upload project photos, maps, or documents (max {config.UPLOAD.MAX_FILES} files)
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

              {/* Document List */}
              {documents.length > 0 && (
                <View style={styles.documentsList}>
                  {documents.map(renderDocumentItem)}
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
                <Text style={styles.submitButtonText}>Register Project</Text>
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
    marginRight: 40, // Compensate for back button
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
    height: 100,
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
  documentsList: {
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: config.UI.BORDER_RADIUS,
    padding: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: config.UI.TEXT_PRIMARY,
    fontWeight: '500',
  },
  documentSize: {
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

export default ProjectRegistrationScreen;
