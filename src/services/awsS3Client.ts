import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
const accessKeyId = process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '';
const bucketName = process.env.EXPO_PUBLIC_AWS_S3_BUCKET || '';

import * as FileSystem from 'expo-file-system';

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const s3Service = {
  async uploadImage(imageUri: string, fileName: string): Promise<string> {
    try {
      // Read the image as a binary buffer using expo-file-system
      const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri, {size: true});
      if (!fileInfo.exists) {
        throw new Error('File does not exist at provided URI');
      }
      const fileBuffer = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      
      // Convert base64 to Uint8Array for React Native compatibility
      const binaryString = atob(fileBuffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const uploadParams = {
        Bucket: bucketName,
        Key: `blood-pressure-images/${fileName}`,
        Body: bytes,
        ContentType: 'image/jpeg',
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      
      // Encode the file name for the URL
      const encodedFileName = encodeURIComponent(fileName);
      const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/blood-pressure-images/${encodedFileName}`;
      return imageUrl;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error('Failed to upload image to S3');
    }
  },

  generateFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomString = Math.random().toString(36).substring(2, 8);
    return `bp-reading-${timestamp}-${randomString}.jpg`;
  }
};