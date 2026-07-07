const Loader = ({ 
  size = 'medium', 
  color = '#3b82f6',
  text = '',
  fullScreen = false 
}) => {
  const sizes = {
    small: 'w-5 h-5',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-50'
    : 'flex flex-col items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className="relative">
        {/* Spinner principale */}
        <div
          className={`${sizes[size]} border-4 border-gray-200 border-t-transparent rounded-full animate-spin`}
          style={{ borderTopColor: color }}
        />
      </div>
      
      {text && (
        <p className="mt-4 text-gray-600 text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;