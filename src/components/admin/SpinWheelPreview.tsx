import { motion } from 'framer-motion';

interface SpinWheelPreviewProps {
  segmentValues: number[];
  segmentColors: string[];
  pointerColor: string;
  centerColor: string;
  borderColor: string;
}

const SpinWheelPreview = ({
  segmentValues,
  segmentColors,
  pointerColor,
  centerColor,
  borderColor,
}: SpinWheelPreviewProps) => {
  const segmentAngle = 360 / segmentValues.length;

  const getSegmentColor = (index: number) => {
    return segmentColors[index % segmentColors.length] || 'hsl(200, 100%, 50%)';
  };

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
        <div 
          className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent drop-shadow-lg"
          style={{ borderTopColor: pointerColor }}
        />
      </div>
      
      {/* Wheel */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 20,
          ease: "linear",
          repeat: Infinity,
        }}
        className="w-full h-full rounded-full relative overflow-hidden"
        style={{
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 20px ${borderColor}33, inset 0 0 15px hsl(0 0% 0% / 0.5)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {segmentValues.map((value, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            
            const x1 = 50 + 50 * Math.cos(startRad);
            const y1 = 50 + 50 * Math.sin(startRad);
            const x2 = 50 + 50 * Math.cos(endRad);
            const y2 = 50 + 50 * Math.sin(endRad);
            
            const largeArc = segmentAngle > 180 ? 1 : 0;
            
            const midAngle = (startAngle + endAngle) / 2 - 90;
            const midRad = midAngle * (Math.PI / 180);
            const textX = 50 + 32 * Math.cos(midRad);
            const textY = 50 + 32 * Math.sin(midRad);
            
            return (
              <g key={index}>
                <path
                  d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={getSegmentColor(index)}
                  stroke="hsl(0 0% 0% / 0.3)"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="4"
                  fontWeight="bold"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  ₹{value}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="8" 
            fill={centerColor} 
            stroke={borderColor} 
            strokeWidth="1" 
          />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="3" fontWeight="bold">
            SPIN
          </text>
        </svg>
      </motion.div>
      
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: `0 0 20px ${borderColor}55`,
        }}
      />
    </div>
  );
};

export default SpinWheelPreview;