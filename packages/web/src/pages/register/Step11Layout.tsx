interface Props {
  data: { layout: string };
  onChange: (data: Partial<{ layout: string }>) => void;
}

const LAYOUTS = [
  {
    id: 'overview_first',
    icon: '📊',
    label: 'Overview First',
    desc: 'Stats + pipeline + recent activity',
    preview: (
      <div className="grid grid-rows-3 gap-1 h-16 w-full">
        <div className="bg-current opacity-40 rounded" />
        <div className="grid grid-cols-3 gap-1">
          <div className="bg-current opacity-20 rounded" />
          <div className="bg-current opacity-20 rounded" />
          <div className="bg-current opacity-20 rounded" />
        </div>
        <div className="bg-current opacity-10 rounded" />
      </div>
    ),
  },
  {
    id: 'contacts_first',
    icon: '👥',
    label: 'Contacts First',
    desc: 'Contact grid front and center',
    preview: (
      <div className="grid grid-cols-2 gap-1 h-16 w-full">
        <div className="grid grid-rows-3 gap-1">
          <div className="bg-current opacity-40 rounded" />
          <div className="bg-current opacity-40 rounded" />
          <div className="bg-current opacity-40 rounded" />
        </div>
        <div className="grid grid-rows-3 gap-1">
          <div className="bg-current opacity-40 rounded" />
          <div className="bg-current opacity-40 rounded" />
          <div className="bg-current opacity-20 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'messages_first',
    icon: '💬',
    label: 'Messages First',
    desc: 'Chat/inbox view like WhatsApp',
    preview: (
      <div className="flex gap-1 h-16 w-full">
        <div className="w-1/3 bg-current opacity-20 rounded" />
        <div className="flex-1 grid grid-rows-3 gap-1">
          <div className="bg-current opacity-10 rounded ml-4" />
          <div className="bg-current opacity-40 rounded mr-4" />
          <div className="bg-current opacity-10 rounded ml-4" />
        </div>
      </div>
    ),
  },
  {
    id: 'pipeline_first',
    icon: '📋',
    label: 'Pipeline First',
    desc: 'Kanban board view',
    preview: (
      <div className="grid grid-cols-4 gap-1 h-16 w-full">
        {[40, 60, 30, 50].map((h, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="bg-current opacity-30 rounded" style={{ height: '12px' }} />
            <div className="bg-current opacity-20 rounded flex-1" />
          </div>
        ))}
      </div>
    ),
  },
];

export function Step11Layout({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        How do you want to see your data?
      </h2>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        Choose your default dashboard layout. You can always change it later.
      </p>

      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            onClick={() => onChange({ layout: layout.id })}
            className={`p-4 rounded-xl border-2 transition-all duration-150 text-left ${
              data.layout === layout.id
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <div className="mb-3 text-current">
              {layout.preview}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{layout.icon}</span>
              <span className="font-semibold text-white text-sm">{layout.label}</span>
            </div>
            <p className={`text-xs ${data.layout === layout.id ? 'text-indigo-400' : 'text-gray-500'}`}>{layout.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
