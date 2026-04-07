"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export type BadgeType = "Attending" | "Sponsoring" | "Speaking" | "Evolution";

export const BADGE_THEMES: Record<string, any> = {
  Attending: {
    bg: "linear-gradient(135deg, rgba(1, 33, 64, 0.95), rgba(0, 90, 143, 0.9))",
    glow: "rgba(0, 178, 169, 0.8)",
    textAccent: "text-[#00b2a9]",
    badgePill: "bg-[#00b2a9]/20 border-[#00b2a9]/30 text-[#00b2a9]",
    borderAccent: "border-[#00b2a9]"
  },
  Speaking: {
    bg: "linear-gradient(135deg, rgba(30, 20, 5, 0.95), rgba(90, 60, 10, 0.9))",
    glow: "rgba(234, 179, 8, 0.8)",
    textAccent: "text-yellow-400",
    badgePill: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400 font-black tracking-widest",
    borderAccent: "border-yellow-400"
  },
  Sponsoring: {
    bg: "linear-gradient(135deg, rgba(15, 20, 25, 0.95), rgba(50, 60, 70, 0.9))",
    glow: "rgba(200, 210, 225, 0.8)",
    textAccent: "text-slate-200",
    badgePill: "bg-slate-300/20 border-slate-300/30 text-slate-200 font-black tracking-widest",
    borderAccent: "border-slate-300"
  },
  Evolution: {
    bg: "linear-gradient(135deg, rgba(40, 0, 80, 0.95), rgba(100, 0, 150, 0.9))",
    glow: "rgba(255, 100, 255, 0.9)",
    textAccent: "text-fuchsia-400",
    badgePill: "bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-300 font-black tracking-widest",
    borderAccent: "border-fuchsia-400"
  }
};

export interface BadgeCardProps {
  firstName: string;
  lastName: string;
  eventName: string;
  startDate: string;
  endDate: string;
  badgeType: BadgeType;
  imageLink?: string;
  profileImage?: string;
  description?: string;
}

export function BadgeCardFrontVisual({
  firstName,
  lastName,
  eventName,
  startDate,
  endDate,
  badgeType,
  profileImage,
  description,
  theme,
  bgPos
}: Omit<BadgeCardProps, "imageLink"> & { theme: any; bgPos?: any }) {
  return (
    <div 
      className="absolute inset-0 w-full h-full backface-hidden rounded-[2rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ 
        background: theme.bg,
        backdropFilter: "blur(20px)"
      }}
    >
      {/* Holographic Glow Layer */}
      {bgPos ? (
        <motion.div 
          className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
          style={{ background: `radial-gradient(circle at ${bgPos}, ${theme.glow} 0%, transparent 65%)` }}
        />
      ) : (
        <div 
          className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${theme.glow} 0%, transparent 65%)` }}
        />
      )}

      <div className="flex flex-col h-full relative z-10">
        {/* Background design elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-[100px] pointer-events-none" />
        
        {/* Header / Dynamic Event */}
        <div className="flex justify-between items-start pt-6 px-6 relative z-20">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-white/90 font-bold text-sm tracking-widest uppercase truncate w-64">{eventName || "Event Name"}</h3>
              <p className={`${theme.textAccent} text-[10px] font-mono tracking-widest uppercase opacity-80`}>Certified Badge</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-2 px-6 pb-6 flex-1 flex flex-col relative z-10 w-full items-center">
          {/* Profile Image (Optional) */}
          {profileImage && (
            <div className="mb-1 mt-0">
              <div className={`w-28 h-28 rounded-full border-[3px] ${theme.borderAccent} p-1.5 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.5)] bg-[#011122]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />
              </div>
            </div>
          )}

          <h2 className={`font-black tracking-tight mb-1 text-center text-white ${profileImage ? 'text-2xl mt-1' : 'text-3xl mt-4'}`}>
            {firstName || "First"} {lastName || "Last"}
          </h2>
          
          <div className={`px-5 py-1 rounded-full text-[11px] uppercase border ${theme.badgePill} mb-2 inline-block`}>
            {badgeType}
          </div>

          {description && description !== `Issued for ${eventName}` && (
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
              <p className="text-white/90 text-[13px] font-medium text-center max-w-[95%] line-clamp-3 break-words leading-snug drop-shadow-md">
                {description}
              </p>
            </div>
          )}

          <div className="mt-auto bg-black/30 rounded-2xl p-4 border border-white/10 backdrop-blur-md w-full relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${theme.borderAccent.replace('border-', 'bg-')} opacity-50`}/>
            <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ml-2 ${theme.textAccent} opacity-80`}>
              Date
            </p>
            <div className={`grid ${endDate ? 'grid-cols-2 gap-x-4' : 'grid-cols-1'} gap-y-2 ml-2`}>
              <div className="space-y-0.5">
                {endDate && (
                  <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    Start
                  </p>
                )}
                <p className="text-white/90 text-[11px] font-mono">{startDate || "----/--/--"}</p>
              </div>
              {endDate && (
                <div className="space-y-0.5">
                  <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    End
                  </p>
                  <p className="text-white/90 text-[11px] font-mono">{endDate}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BadgeCardSquareVisual({
  firstName,
  lastName,
  eventName,
  startDate,
  endDate,
  badgeType,
  profileImage,
  description,
  theme,
  bgPos
}: Omit<BadgeCardProps, "imageLink"> & { theme: any; bgPos?: any }) {
  return (
    <div 
      className="absolute inset-0 w-full h-full backface-hidden rounded-[2rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ 
        background: theme.bg,
        backdropFilter: "blur(20px)"
      }}
    >
      {/* Holographic Glow Layer */}
      {bgPos ? (
        <motion.div 
          className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
          style={{ background: `radial-gradient(circle at ${bgPos}, ${theme.glow} 0%, transparent 65%)` }}
        />
      ) : (
        <div 
          className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${theme.glow} 0%, transparent 65%)` }}
        />
      )}

      <div className="flex flex-col h-full relative z-10 p-8">
        {/* Background design elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-[150px] pointer-events-none" />
        
        {/* Header / Dynamic Event */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-white/90 font-bold text-lg tracking-widest uppercase truncate max-w-[300px]">{eventName || "Event Name"}</h3>
              <p className={`${theme.textAccent} text-xs font-mono tracking-widest uppercase opacity-80`}>Certified Badge</p>
            </div>
          </div>
          <div className={`px-5 py-2 rounded-full text-sm uppercase border ${theme.badgePill}`}>
            {badgeType}
          </div>
        </div>

        {/* Content Body - Split Layout for Square */}
        <div className="flex-1 flex items-center justify-between gap-6 relative z-10 w-full">
          {/* Left Side: Name & Desc */}
          <div className="flex-1 flex flex-col items-start justify-center">
            <h2 className="font-black tracking-tight mb-2 text-left text-white text-4xl leading-tight">
              {firstName || "First"}<br/>{lastName || "Last"}
            </h2>
            
            {description && description !== `Issued for ${eventName}` && (
              <p className="text-white/80 text-sm font-medium text-left line-clamp-4 leading-relaxed mt-2 max-w-[220px]">
                {description}
              </p>
            )}
          </div>

          {/* Right Side: Profile Image */}
          {profileImage && (
            <div className="shrink-0 flex items-center justify-center">
              <div className={`w-40 h-40 rounded-full border-4 ${theme.borderAccent} p-2 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)] bg-[#011122]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar: Dates */}
        <div className="mt-6 bg-black/30 rounded-2xl p-5 border border-white/10 backdrop-blur-md w-full relative overflow-hidden flex justify-between items-center">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${theme.borderAccent.replace('border-', 'bg-')} opacity-50`}/>
          <p className={`text-xs uppercase tracking-widest font-bold ml-2 ${theme.textAccent} opacity-80`}>
            Duration Timeline
          </p>
          <div className="flex gap-8 mr-2">
            <div className="space-y-1">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Start</p>
              <p className="text-white/90 text-sm font-mono">{startDate || "----/--/--"}</p>
            </div>
            {endDate && (
              <div className="space-y-1">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">End</p>
                <p className="text-white/90 text-sm font-mono">{endDate}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BadgeCard({
  firstName,
  lastName,
  eventName,
  startDate,
  endDate,
  badgeType,
  imageLink,
  profileImage,
  description,
}: BadgeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // 3D Tilt Effect Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for the tilt
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  // Map mouse position to rotation (-15 to +15 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);
  
  // Dynamic glow effect based on tilt
  const bgPos = useTransform(
    [mouseXSpring, mouseYSpring],
    ([mx, my]: any[]) => `${50 + mx * 100}% ${50 + my * 100}%`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const theme = BADGE_THEMES[badgeType || "Attending"] || BADGE_THEMES["Attending"];

  return (
    <div
      className="perspective-1000 cursor-pointer select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="w-80 h-[28rem] relative preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          rotateX,
          transformStyle: "preserve-3d",
          rotateY: isFlipped ? "180deg" : rotateY,
        }}
      >
        {/* FRONT OF CARD */}
        <BadgeCardFrontVisual 
          firstName={firstName}
          lastName={lastName}
          eventName={eventName}
          startDate={startDate}
          endDate={endDate}
          badgeType={badgeType}
          profileImage={profileImage}
          description={description}
          theme={theme}
          bgPos={bgPos}
        />

        {/* BACK OF CARD */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-[2rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col items-center justify-center bg-[#011122]"
          style={{ 
            transform: "rotateY(180deg)",
          }}
        >
          {imageLink ? (
             <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imageLink} 
                  alt="Issuer Visual" 
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${theme.textAccent}`}>Issuer Visual</p>
                  <p className="text-white font-medium text-sm leading-snug">{eventName || "ELCA Badge"}</p>
                </div>
             </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 opacity-30">
              <div className={`w-16 h-16 rounded-2xl ${theme.borderAccent.replace('border-', 'bg-')} flex items-center justify-center rotate-45`}>
                 <span className="text-black font-black -rotate-45 text-2xl">EL</span>
              </div>
              <p className="text-white font-mono text-xs uppercase tracking-widest">ELCA Secure Badge</p>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
