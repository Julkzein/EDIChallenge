"use client";

import { useState, useRef, useEffect } from "react";
import { BadgeType } from "@/components/BadgeCard";
import dynamic from "next/dynamic";
import { Loader2, Send, UploadCloud, Wand2, X, Crop, Globe } from "lucide-react";
import Cropper, { Point, Area } from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";

import { toBlob } from "html-to-image";
import { BADGE_THEMES } from "@/components/BadgeCard";

const BadgeCard = dynamic(
  () => import("@/components/BadgeCard").then((mod) => mod.BadgeCard),
  { ssr: false, loading: () => <div className="w-80 h-[28rem] rounded-[2rem] bg-white/5 animate-pulse border border-white/10" /> }
);

const BadgeCardFrontVisual = dynamic(
  () => import("@/components/BadgeCard").then((mod) => mod.BadgeCardFrontVisual),
  { ssr: false }
);

const BadgeCardSquareVisual = dynamic(
  () => import("@/components/BadgeCard").then((mod) => mod.BadgeCardSquareVisual),
  { ssr: false }
);

export default function Home() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    eventName: "",
    description: "",
    startDate: "",
    endDate: "",
    badgeType: "Attending" as BadgeType,
    imageLink: "",
    profileImage: "",
    recipientWallet: "",
    network: "mainnet",
  });

  const [isMinting, setIsMinting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [mintResult, setMintResult] = useState<{ hash: string; url: string; evolved?: boolean; tokenId?: string; contractAddress?: string } | null>(null);

  // AI Extraction Modal State
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // Image Cropping Modal State
  const [cropState, setCropState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    isProfile: boolean;
    crop: Point;
    zoom: number;
    croppedAreaPixels: Area | null;
    aspect: number;
  }>({
    isOpen: false,
    imageSrc: "",
    isProfile: false,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
    aspect: 1,
  });

  // Local blob URL for the off-screen capture — avoids CORS issues with Pinata gateway
  const [captureProfileUrl, setCaptureProfileUrl] = useState("");

  // Revoke old blob URL when it changes to avoid memory leaks
  useEffect(() => {
    return () => {
      if (captureProfileUrl) URL.revokeObjectURL(captureProfileUrl);
    };
  }, [captureProfileUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: User selects file, open crop modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isProfile: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCropState({
      isOpen: true,
      imageSrc: objectUrl,
      isProfile,
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
      aspect: isProfile ? 1 : 320 / 448, // 1:1 for profile face, 0.714 for card background
    });
    
    e.target.value = ''; // Reset input to allow re-selection
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCropState((prev) => ({ ...prev, croppedAreaPixels }));
  };

  // Step 2: User confirms crop, compile canvas Blob and upload to IPFS
  const handleConfirmCrop = async () => {
    if (!cropState.imageSrc || !cropState.croppedAreaPixels) return;

    const { imageSrc, croppedAreaPixels, isProfile } = cropState;
    
    setCropState(prev => ({ ...prev, isOpen: false })); // immediately dismiss UI for snappiness
    
    if (isProfile) setIsUploadingProfile(true);
    else setIsUploadingImage(true);

    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedFile) throw new Error("Could not construct image from canvas");

      // Keep a local blob URL for the off-screen capture (same-origin, no CORS)
      if (isProfile) {
        setCaptureProfileUrl(URL.createObjectURL(croppedFile));
      }

      const form = new FormData();
      form.append("file", croppedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        if (isProfile) {
          setFormData(prev => ({ ...prev, profileImage: data.url }));
        } else {
          setFormData(prev => ({ ...prev, imageLink: data.url }));
        }
      } else {
        alert("Failed to upload image to IPFS.");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing or uploading image. Please try again.");
    } finally {
      if (isProfile) setIsUploadingProfile(false);
      else setIsUploadingImage(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);
    setMintResult(null);

    let compiledImageHash = "";

    try {
      if (badgeRef.current) {
        console.log("[Capture] Starting off-screen badge capture...");
        // cacheBust is intentionally omitted — it corrupts blob:// URLs
        const blob = await toBlob(badgeRef.current, { pixelRatio: 2 });
        if (blob && blob.size > 0) {
          console.log(`[Capture] ✅ Blob captured: ${(blob.size / 1024).toFixed(1)} KB`);
          const form = new FormData();
          form.append("file", blob, "badge.png");

          console.log("[Capture] Uploading compiled badge to IPFS...");
          const res = await fetch("/api/upload", {
            method: "POST",
            body: form,
          });

          if (res.ok) {
            const data = await res.json();
            compiledImageHash = data.ipfsHash;
            console.log(`[Capture] ✅ IPFS hash: ${compiledImageHash}`);
          } else {
            console.warn("[Capture] ⚠️ Upload failed:", await res.text());
          }
        } else {
          console.warn("[Capture] ⚠️ toBlob returned null or empty blob");
        }
      } else {
        console.warn("[Capture] ⚠️ badgeRef is null — off-screen element not mounted");
      }
    } catch (err) {
      console.error("[Capture] ❌ Capture threw:", err);
    }

    if (!compiledImageHash) {
      const proceed = confirm(
        "Could not generate the badge image for the NFT. The NFT will mint without a visual preview in wallets like MetaMask.\n\nMint anyway?"
      );
      if (!proceed) {
        setIsMinting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, compiledImageHash }),
      });
      if (res.ok) {
        const data = await res.json();
        setMintResult(data);
      } else {
        alert("Failed to mint badge");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to mint badge");
    } finally {
      setIsMinting(false);
    }
  };

  // Placeholder for handleExtract function
  const handleExtract = () => {
    // Implement AI extraction logic here
    console.log("Extracting text:", extractText);
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      setIsExtractModalOpen(false);
      alert("Extraction logic not implemented yet!");
    }, 2000);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-16 overflow-x-hidden">
      {/* Off-screen container for image generation — must be painted by browser for html-to-image */}
      <div aria-hidden="true" style={{position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none'}}>
        <div ref={badgeRef} className="w-[480px] h-[480px] relative flex items-center justify-center overflow-hidden bg-[#010810] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
           <BadgeCardSquareVisual
              {...formData}
              profileImage={captureProfileUrl || formData.profileImage}
              theme={BADGE_THEMES[formData.badgeType] || BADGE_THEMES["Attending"]}
           />
        </div>
      </div>

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center py-4 mb-8 border-b border-white/10 gap-4 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#012140] dark:text-white tracking-tight">
            EDI Challenge 2026
          </h1>
          <p className="text-[#005a8f] dark:text-[#00b2a9] text-sm md:text-base font-medium">
            ELCA Digital Badges
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Network Interrupter Toggle */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, network: "testnet" })}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                formData.network === "testnet" 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              Polygon Amoy
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, network: "mainnet" })}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                formData.network === "mainnet" 
                  ? "bg-gradient-to-r from-[#00b2a9] to-[#005a8f] text-white shadow-[0_0_15px_rgba(0,178,169,0.3)]" 
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              Polygon Mainnet
            </button>
          </div>
          <a href="/gallery" className="px-5 py-2 glass-dark flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition text-sm md:text-base font-bold whitespace-nowrap shadow-lg h-[36px]">
            Public Gallery
          </a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left Column: Form */}
        <div className="flex-1 space-y-6 order-2 lg:order-1 w-full max-w-full">
          <div className="glass-dark rounded-3xl p-5 md:p-8 relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6">Badge Details</h2>

            <form onSubmit={handleMint} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm md:text-base">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">First Name</label>
                  <input required name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Last Name</label>
                  <input required name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Event Name</label>
                <input required name="eventName" value={formData.eventName} onChange={handleInputChange} placeholder="e.g. AWS Summit 2026" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Description</label>
                <textarea required name="description" value={formData.description} onChange={handleInputChange as any} placeholder="e.g. Keynote Speaker on AI scaling..." className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-[#00b2a9] outline-none transition resize-none h-20" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Badge Type</label>
                <select name="badgeType" value={formData.badgeType} onChange={handleInputChange} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-[#00b2a9] transition">
                  <option value="Attending" className="text-black">Attending</option>
                  <option value="Sponsoring" className="text-black">Sponsoring</option>
                  <option value="Speaking" className="text-black">Speaking</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Start Date</label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">End Date</label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Profile Image</label>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <input type="file" accept="image/*" className="hidden" ref={profileInputRef} onChange={(e) => handleFileSelect(e, true)} />
                  <button type="button" onClick={() => profileInputRef.current?.click()} className="flex justify-center items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-sm font-medium whitespace-nowrap">
                    {isUploadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {isUploadingProfile ? "Uploading..." : "Upload Face"}
                  </button>
                  <span className="text-white/40 text-sm text-center hidden sm:block">or</span>
                  <input name="profileImage" value={formData.profileImage} onChange={handleInputChange} placeholder="Image URL..." className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Event Issuer Visual (Back of Card)</label>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileSelect(e, false)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex justify-center items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-sm font-medium whitespace-nowrap">
                    {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {isUploadingImage ? "Uploading..." : "Upload Cover"}
                  </button>
                  <span className="text-white/40 text-sm text-center hidden sm:block">or</span>
                  <input name="imageLink" value={formData.imageLink} onChange={handleInputChange} placeholder="Image URL..." className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
                </div>
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="text-xs font-semibold text-[#00b2a9] uppercase tracking-widest">Recipient Wallet Address</label>
                <input required name="recipientWallet" value={formData.recipientWallet} onChange={handleInputChange} placeholder="0x..." className="w-full bg-black/30 border border-[#00b2a9]/30 rounded-xl p-3 text-[#00b2a9] font-mono text-sm focus:ring-2 focus:ring-[#00b2a9] outline-none transition" />
              </div>

              <div className="pt-2 pb-1">
                <p className="text-xs text-center text-white/50 font-medium">
                  Currently deploying to: <span className="font-bold text-[#00b2a9]">{formData.network === "mainnet" ? "Polygon Mainnet" : "Polygon Amoy"}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isMinting}
                className="w-full mt-6 py-4 bg-gradient-to-r from-[#00b2a9] to-[#005a8f] text-white rounded-xl font-bold text-lg flex gap-2 items-center justify-center hover:shadow-[0_0_20px_rgba(0,178,169,0.4)] transition disabled:opacity-70 disabled:hover:shadow-none"
              >
                {isMinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isMinting ? "Authenticating Request..." : "Issue Badge"}
              </button>

              {/* Extract Modal */}
              {isExtractModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="glass-dark border border-[#00b2a9]/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,178,169,0.15)] relative">
                    <button onClick={() => setIsExtractModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition">
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Wand2 className="w-5 h-5 text-[#00b2a9]" /> Data Automation</h3>
                    <p className="text-white/60 text-sm mb-5 leading-relaxed">Paste unstructured text (emails, event bios, LinkedIn) and our AI securely parses it to auto-fill the credential details.</p>
                    <textarea 
                      value={extractText} 
                      onChange={(e) => setExtractText(e.target.value)} 
                      placeholder="Paste raw text here..." 
                      className="w-full bg-black/40 border border-[#00b2a9]/20 rounded-xl p-4 text-white text-sm focus:ring-2 focus:ring-[#00b2a9] outline-none transition resize-none h-40 mb-5"
                    />
                    <button 
                      onClick={handleExtract}
                      disabled={isExtracting}
                      className="w-full py-3.5 bg-gradient-to-r from-[#00b2a9] to-[#005a8f] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(0,178,169,0.4)] transition disabled:opacity-70 disabled:hover:shadow-none"
                    >
                      {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      {isExtracting ? "Processing Analysis..." : "Auto-Fill Extraction"}
                    </button>
                  </div>
                </div>
              )}

              {/* Image Crop Modal */}
              {cropState.isOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-md">
                  <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2"><Crop className="w-5 h-5 text-[#00b2a9]" /> Interactive Image Editor</h3>
                      <p className="text-white/60 text-sm mt-1">Pinch and drag to frame your {cropState.isProfile ? "Profile Image" : "Event Visual"} perfectly.</p>
                    </div>
                    <button onClick={() => setCropState(prev => ({ ...prev, isOpen: false }))} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="relative flex-1 w-full bg-[#010810]">
                    <Cropper
                      image={cropState.imageSrc}
                      crop={cropState.crop}
                      zoom={cropState.zoom}
                      aspect={cropState.aspect}
                      onCropChange={(crop) => setCropState(p => ({ ...p, crop }))}
                      onZoomChange={(zoom) => setCropState(p => ({ ...p, zoom }))}
                      onCropComplete={onCropComplete}
                    />
                  </div>

                  <div className="p-6 border-t border-white/10 flex flex-col md:flex-row items-center gap-6 shrink-0 bg-[#011122]">
                    <div className="flex-1 w-full flex items-center gap-4 hidden md:flex">
                      <span className="text-white/40 text-sm">-</span>
                      <input
                        type="range"
                        value={cropState.zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setCropState(p => ({ ...p, zoom: Number(e.target.value) }))}
                        className="w-full max-w-xs accent-[#00b2a9]"
                      />
                      <span className="text-white/40 text-sm">+</span>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                      <button 
                        onClick={() => setCropState(prev => ({ ...prev, isOpen: false }))} 
                        className="flex-1 md:flex-none px-6 py-3.5 border border-white/20 text-white rounded-xl hover:bg-white/10 transition font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleConfirmCrop}
                        className="flex-1 md:flex-none px-8 py-3.5 bg-gradient-to-r from-[#00b2a9] to-[#005a8f] text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(0,178,169,0.5)] transition flex justify-center items-center gap-2"
                      >
                        Confirm Crop
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mintResult && (
                <div className="mt-6 p-5 bg-[#00b2a9]/10 border border-[#00b2a9]/30 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#00b2a9]" />
                  <div>
                    <h3 className="text-[#00b2a9] font-bold text-xs tracking-widest uppercase">Issuance Complete</h3>
                    <p className="text-white/80 text-xs mt-1.5 leading-relaxed">The secure digital badge has been successfully anchored on the permanent registry.</p>
                  </div>
                  <a href={mintResult.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00b2a9]/80 hover:text-[#00b2a9] transition underline break-all block font-mono">
                    Transaction Log / Explorer
                  </a>
                  {mintResult.tokenId && mintResult.contractAddress && (
                    <div className="mt-2 p-3 bg-black/30 rounded-lg border border-white/10 space-y-2">
                      <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold">Import in MetaMask / Rabby</p>
                      <div>
                        <p className="text-white/40 text-[10px]">Contract</p>
                        <p className="text-white/80 text-[11px] font-mono break-all">{mintResult.contractAddress}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px]">Token ID</p>
                        <p className="text-[#00b2a9] text-sm font-mono font-bold">#{mintResult.tokenId}</p>
                      </div>
                    </div>
                  )}
                  {mintResult.evolved && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-white/90 font-bold text-xs tracking-widest uppercase mb-1">Milestone Credential Unlocked</h4>
                      <p className="text-xs text-white/50 leading-relaxed">The recipient has securely collected multiple internal credentials, triggering an automated deployment of a Master Evolution asset.</p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="flex-1 flex flex-col items-center lg:items-start lg:mt-10 order-1 lg:order-2 w-full">
          <div className="text-center lg:text-left mb-6 w-full px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#012140] dark:text-white">Live Preview</h2>
          </div>

          <div className="flex justify-center w-full lg:justify-start transform scale-75 sm:scale-90 md:scale-100 origin-top h-[32rem]">
            <BadgeCard {...formData} />
          </div>

          {/* New Square NFT Export Preview */}
          <div className="mt-4 flex flex-col items-center lg:items-start w-full px-4">
             <div className="flex items-center justify-between w-full mb-4">
               <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">NFT Format</h3>
             </div>

             <div className="flex items-start gap-6 w-full">
               {/* Dynamic 1:1 Preview Viewport */}
               <div className="w-[200px] h-[200px] relative flex items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 shrink-0" style={{ background: '#010810' }}>
                   <div className="w-full h-full relative z-10 overflow-hidden shadow-2xl">
                        <div style={{ transform: 'scale(0.416)', transformOrigin: 'top left' }} className="w-[480px] h-[480px] absolute top-0 left-0">
                           <BadgeCardSquareVisual
                             {...formData}
                             profileImage={captureProfileUrl || formData.profileImage}
                             theme={BADGE_THEMES[formData.badgeType] || BADGE_THEMES["Attending"]}
                           />
                        </div>
                   </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
