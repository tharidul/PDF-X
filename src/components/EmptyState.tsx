import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  instructions: {
    title: string;
    steps: Array<{
      number: number;
      text: string;
    }>;
  };
  theme: 'red' | 'green' | 'blue';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  instructions,
  theme
}) => {
  const themeConfig = {
    red: {
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      border: 'border-red-200',
      stepBg: 'bg-red-500',
      stepText: 'text-white',
      gradient: 'from-red-50 to-rose-50'
    },
    green: {
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      border: 'border-emerald-200',
      stepBg: 'bg-emerald-500',
      stepText: 'text-white',
      gradient: 'from-emerald-50 to-teal-50'
    },
    blue: {
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      border: 'border-blue-200',
      stepBg: 'bg-blue-500',
      stepText: 'text-white',
      gradient: 'from-blue-50 to-cyan-50'
    }
  };

  const config = themeConfig[theme];  return (
    <div className="group relative w-full max-w-md mx-auto h-[450px]">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} backdrop-blur-xl shadow-2xl border border-white/30 transition-all duration-300 hover:-translate-y-2 h-full`}>
        <div className="p-6 lg:p-8 h-full flex flex-col justify-between">
          <div className="max-w-2xl mx-auto text-center">        {/* Main Icon */}
        <div className={`w-16 h-16 mx-auto mb-4 ${config.iconBg} rounded-2xl flex items-center justify-center border ${config.border}`}>
          <div className={`${config.iconColor} transform scale-110`}>
            {icon}
          </div>
        </div>        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          {title}
        </h3>        {/* Description */}
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">
          {description}
        </p>        {/* How-to Guide */}
        <div className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-4 border ${config.border}`}>
          <div className="flex items-center justify-center mb-3">
            <div className={`w-6 h-6 ${config.stepBg} rounded-lg flex items-center justify-center mr-3`}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">
              {instructions.title}
            </h4>
          </div>
          
          <div className="space-y-2">
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex items-start text-left">
                <div className={`w-6 h-6 ${config.stepBg} ${config.stepText} rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0 shadow-sm`}>
                  {step.number}
                </div>
                <p className="text-gray-700 pt-1 leading-relaxed text-xs">{step.text}</p>
              </div>
            ))}
          </div>
        </div>        {/* Additional tip */}
        <div className="mt-3 flex items-center justify-center text-xs text-gray-500"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Tip: Your files are processed locally in your browser for maximum privacy
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
