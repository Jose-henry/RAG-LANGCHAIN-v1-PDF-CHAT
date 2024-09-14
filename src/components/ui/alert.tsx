import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  className?: string;
}

export function Alert({ children, className = '' }: AlertProps) {
  return (
    <div className={`p-4 mb-4 text-sm rounded-lg ${className}`} role="alert">
      {children}
    </div>
  );
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div className="font-medium">{children}</div>;
}