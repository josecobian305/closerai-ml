interface Props {
  data: { areaCode: string; portExisting: boolean; existingNumber: string };
  onChange: (data: Partial<{ areaCode: string; portExisting: boolean; existingNumber: string }>) => void;
}

const POPULAR_AREA_CODES = ['305', '786', '954', '212', '310', '312', '404', '415', '512', '713', '972'];

export function Step10Phone({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Choose your agent's phone number
      </h2>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        We'll auto-provision a dedicated number for your agent.
      </p>

      <div className="w-full max-w-md space-y-6">
        {/* Mode toggle */}
        <div className="flex rounded-xl bg-gray-800 p-1">
          <button
            onClick={() => onChange({ portExisting: false })}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              !data.portExisting ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Get New Number
          </button>
          <button
            onClick={() => onChange({ portExisting: true })}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              data.portExisting ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Port Existing
          </button>
        </div>

        {!data.portExisting ? (
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 block">Area code preference</label>
            <input
              type="text"
              value={data.areaCode}
              onChange={(e) => onChange({ areaCode: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              placeholder="e.g. 305"
              maxLength={3}
              className="w-full bg-gray-800/60 border border-gray-700 focus:border-indigo-500 rounded-xl px-5 py-4 text-2xl text-white placeholder-gray-500 outline-none transition-colors tracking-widest font-mono"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {POPULAR_AREA_CODES.map((code) => (
                <button
                  key={code}
                  onClick={() => onChange({ areaCode: code })}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                    data.areaCode === code
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">We'll provision the closest available number to your preferred area code.</p>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 block">Existing number to port</label>
            <input
              type="tel"
              value={data.existingNumber}
              onChange={(e) => onChange({ existingNumber: e.target.value })}
              placeholder="+1 (305) 000-0000"
              className="w-full bg-gray-800/60 border border-gray-700 focus:border-indigo-500 rounded-xl px-5 py-4 text-base text-white placeholder-gray-500 outline-none transition-colors"
            />
            <p className="text-xs text-amber-400 mt-3">⚠️ Number porting requires LOA and takes 3–10 business days.</p>
          </div>
        )}
      </div>
    </div>
  );
}
