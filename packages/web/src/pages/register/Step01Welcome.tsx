import { ArrowRight, Zap } from 'lucide-react';

interface Props {
  onNext: () => void;
}

export function Step01Welcome({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
        <Zap size={40} className="text-white" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
        Let's build your<br />
        <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          AI sales team
        </span>
      </h1>
      <p className="text-xl text-gray-400 mb-12 max-w-md">
        In 5 minutes, you'll have a fully configured AI agent ready to qualify leads, collect docs, and follow up 24/7.
      </p>
      <button
        onClick={onNext}
        className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105"
      >
        Get Started
        <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
      </button>
      <p className="text-sm text-gray-600 mt-6">No credit card required · Free 14-day trial</p>
    </div>
  );
}
