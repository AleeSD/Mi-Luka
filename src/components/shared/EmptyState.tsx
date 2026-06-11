interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ emoji = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--luka-text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--luka-text-secondary)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
