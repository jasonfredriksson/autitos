import React from 'react';

interface DashboardProps {
  speed: number;
  nitro: number;
  maxSpeed: number;
  score: number;
  airTime: { current: number; max: number };
}

export function Dashboard({ speed, nitro, maxSpeed, score, airTime }: DashboardProps) {
  // Convert the actual speed to display speed (scale down by 2)
  const displaySpeed = speed / 2;
  const displayMaxSpeed = 200; // Fixed max display speed of 200 km/h
  const nitroPercent = nitro / 100;

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 mb-4 
                    bg-gradient-to-b from-gray-900 to-gray-800 
                    rounded-xl p-6 shadow-[0_0_15px_rgba(0,0,0,0.5)] 
                    border-t-2 border-gray-700
                    w-[480px] h-[160px] flex items-center justify-between
                    font-mono">
      {/* Speedometer */}
      <div className="relative w-36 h-36">
        <div className="absolute inset-0 bg-black rounded-full shadow-inner" />
        <svg className="transform -rotate-90" viewBox="0 0 100 100">
          {/* Speedometer ticks */}
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="10"
              x2="50"
              y2="15"
              stroke="#666"
              strokeWidth="2"
              transform={`rotate(${i * 45}, 50, 50)`}
            />
          ))}
          {/* Speedometer background */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#333"
            strokeWidth="8"
          />
          {/* Speed indicator */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="url(#speedGradient)"
            strokeWidth="8"
            strokeDasharray={`${Math.min(displaySpeed / displayMaxSpeed, 1) * 251.2} 251.2`}
          />
          <defs>
            <linearGradient id="speedGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="100%" stopColor="#ffd93d" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-red-400 text-3xl font-bold font-digital">
            {Math.min(Math.round(displaySpeed), displayMaxSpeed)}
          </span>
          <span className="text-gray-500 text-xs mt-1">KM/H</span>
        </div>
      </div>

      {/* Center section with score and air time */}
      <div className="flex flex-col items-center mx-4 bg-black/30 p-4 rounded-lg">
        <div className="text-yellow-400 text-4xl font-bold font-digital">
          {score.toString().padStart(6, '0')}
        </div>
        <div className="bg-blue-900/50 px-3 py-1 rounded flex flex-col items-center">
          <span className="text-blue-400 text-sm">AIR TIME</span>
          <div className="flex gap-2 items-center">
            <span className="text-blue-300 font-digital">
              {airTime.current.toFixed(1)}s
            </span>
            <span className="text-blue-500 text-xs">MAX</span>
            <span className="text-blue-300 font-digital">
              {airTime.max.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Nitro gauge */}
      <div className="w-36">
        <div className="mb-2 text-center text-gray-400 text-sm font-bold tracking-wider">
          NITRO
        </div>
        <div className="h-6 bg-gray-900 rounded-full overflow-hidden border border-gray-700 shadow-inner">
          <div
            className={`h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
                      transition-all duration-200 relative ${nitro > 0 ? 'animate-pulse' : ''}`}
            style={{ width: `${nitro}%` }}
          >
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full w-4 bg-white/10 -skew-x-45"
                  style={{
                    left: `${i * 30}%`,
                    transform: 'skew(-45deg) translateX(-50%)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Nitro indicators */}
        <div className="mt-3 flex justify-between px-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                nitro >= i * 33.33
                  ? 'bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse'
                  : 'bg-gray-800'
              } shadow-lg`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
