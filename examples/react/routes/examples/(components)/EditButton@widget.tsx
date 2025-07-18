import styles from './EditButton.module.css';

interface EditButtonProps {
  className?: string;
  currentFileUrl: string;
}

export default function EditButton({
  className,
  currentFileUrl,
}: EditButtonProps) {
  // Check if we're in development environment using import.meta.env.DEV
  const isDev = import.meta.env.DEV;

  // Don't render anything in non-development environments
  if (!isDev) {
    return null;
  }

  const handleEditClick = async () => {
    // Get current file path from currentFileUrl
    const currentFilePath = getCurrentFilePath();

    if (!currentFilePath) {
      console.error('No file path available for editing');
      return;
    }

    // Use dev server's built-in functionality to open file
    const openUrl = `/__open-in-editor?file=${encodeURIComponent(currentFilePath)}`;

    console.log('Opening file in editor:', openUrl);

    try {
      const response = await fetch(openUrl);
      if (!response.ok) {
        console.warn('Failed to open file in editor:', response.statusText);
      }
    } catch (error) {
      console.error('Error opening file in editor:', error);
    }
  };

  const getCurrentFilePath = (): string => {
    // Use the full path from the provided currentFileUrl
    try {
      const url = new URL(currentFileUrl);
      return url.pathname;
    } catch (error) {
      console.error('Failed to parse currentFileUrl:', error);
      throw new Error('Invalid currentFileUrl provided');
    }
  };

  return (
    <div className={`${styles.editButtonContainer} ${className || ''}`}>
      <button
        className={styles.editButton}
        onClick={handleEditClick}
        title={`Edit this page in IDE\nSource: ${currentFileUrl}`}
        aria-label="Edit this page in IDE">
        <span className={styles.editIcon}>🖊️</span>
        <span className={styles.editText}>Try editing this page</span>
      </button>
    </div>
  );
}
