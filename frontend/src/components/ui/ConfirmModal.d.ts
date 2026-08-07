import { ReactNode } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  children?: ReactNode;
}

export default function ConfirmModal(props: ConfirmModalProps): JSX.Element;
