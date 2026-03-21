interface Props {
  data: { tone: string };
  onChange: (data: Partial<{ tone: string }>) => void;
}

const TONES = [
  {
    id: 'professional',
    emoji: '🎯',
    label: 'Professional',
    desc: 'Polished and precise',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500',
    text: 'text-blue-300',
  },
  {
    id: 'casual',
    emoji: '💬',
    label: 'Casual',
    desc: 'Friendly and conversational',
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500',
    text: 'text-green-300',
  },
  {
    id: 'urgent',
    emoji: '⚡',
    label: 'Urgent',
    desc: 'Direct and time-sensitive',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500',
    text: 'text-amber-300',
  },
  {
    id: 'empathetic',
    emoji: '❤️',
    label: 'Empathetic',
    desc: 'Warm and understanding',
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-500',
    text: 'text-pink-300',
  },
  {
    id: 'bold',
    emoji: '💪',
    label: 'Bold',
    desc: 'Confident and assertive',
    gradient: 'from-purple-500/20 to-indigo-500/20',
    border: 'border-purple-500',
    text: 'text-purple-300',
  },
];

export function Step06Tone({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        How should your agent talk?
      </h2>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        Choose the conversation style that matches your brand.
      </p>

      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TONES.map((tone) => (
          <button
            key={tone.id}
            onClick={() => onChange({ tone: tone.id })}
            className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-150 text-left ${
              data.tone === tone.id
                ? `bg-gradient-to-br ${tone.gradient} ${tone.border} ${tone.text}`
                : 'bg-gray-800/40 border-gray-700/60 text-gray-300 hover:border-gray-600 hover:bg-gray-800/60'
            }`}
          >
            <span className="text-3xl flex-shrink-0">{tone.emoji}</span>
            <div>
              <p className="font-semibold text-base">{tone.label}</p>
              <p className={`text-sm mt-0.5 ${data.tone === tone.id ? 'opacity-80' : 'text-gray-500'}`}>{tone.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
