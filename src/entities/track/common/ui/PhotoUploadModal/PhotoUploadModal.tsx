import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Modal, Button, Avatar, App } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { useMessage } from 'entities/locale/lib/hooks';
import { useUploadPhotoMutation } from 'entities/user/common/model/api';

interface IPhotoUploadModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  uid: number;
  currentPhoto?: string | null;
}

export const PhotoUploadModal: React.FC<IPhotoUploadModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  uid,
  currentPhoto,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(currentPhoto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageApi = useMessage();
  const { message } = App.useApp();
  const [uploadPhoto] = useUploadPhotoMutation();

  // Update preview when currentPhoto changes
  useEffect(() => {
    setPreviewImage(currentPhoto || null);
  }, [currentPhoto]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error(messageApi('photo.upload.format.error'));
        return;
      }

      // Validate file size (2MB limit)
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error(messageApi('photo.upload.size.error'));
        return;
      }

      setUploading(true);

      try {
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64, prefix

          // Upload using RTK Query mutation
          const result = await uploadPhoto({
            uid,
            photo: base64Data,
          }).unwrap();

          if (result.success) {
            setPreviewImage(base64);
            message.success(messageApi('photo.upload.success'));
            onSuccess();
          } else {
            message.error(messageApi('photo.upload.error'));
          }
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload error:', error);
        message.error(messageApi('photo.upload.error'));
      } finally {
        setUploading(false);
      }
    },
    [uid, onSuccess, messageApi, uploadPhoto],
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal title={messageApi('photo.upload.title')} open={visible} onCancel={onCancel} footer={null} width={400}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: 20 }}>
          {previewImage ? (
            <Avatar src={`data:image/jpeg;base64,${previewImage}`} size={100} style={{ marginBottom: 10 }} />
          ) : (
            <Avatar icon={<UserOutlined />} size={100} style={{ marginBottom: 10 }} />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <Button icon={<UploadOutlined />} loading={uploading} disabled={uploading} onClick={handleUploadClick}>
          {messageApi('photo.upload.button')}
        </Button>

        <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>{messageApi('photo.upload.hint')}</div>
      </div>
    </Modal>
  );
};
