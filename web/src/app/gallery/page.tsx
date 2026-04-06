"use client";

import { useEffect, useState, useMemo } from "react";
import { BadgeCard, BadgeType } from "@/components/BadgeCard";
import { polygonAmoy, polygon } from "viem/chains";
import { Loader2, Search, Filter, Globe } from "lucide-react";
import Link from "next/link";

const ABI = [
  { "inputs": [], "name": "nextTokenId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
];

interface BadgeData {
  id: number;
  owner: string;
  firstName: string;
  lastName: string;
  eventName: string;
  startDate: string;
  endDate: string;
  badgeType: BadgeType | "Evolution";
  imageLink: string;
  profileImage?: string;
  description?: string;
}

export default function Gallery() {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("mainnet");
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchWallet, setSearchWallet] = useState("");
  const [filterEvent, setFilterEvent] = useState("");

  useEffect(() => {
    async function fetchBadges() {
      setLoading(true);
      setBadges([]);
      try {
        const isMainnet = network === "mainnet";
        const targetAddress = isMainnet
          ? process.env.NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS
          : (process.env.NEXT_PUBLIC_AMOY_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);

        if (!targetAddress || targetAddress === "0x0000000000000000000000000000000000000000") {
          setLoading(false);
          return;
        }

        const targetChain = isMainnet ? polygon : polygonAmoy;
        const rpcUrl = isMainnet
          ? (process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.drpc.org")
          : (process.env.NEXT_PUBLIC_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology");

        import("viem").then(async ({ createPublicClient, http }) => {
          const client = createPublicClient({
            chain: targetChain,
            transport: http(rpcUrl)
          });

          const nextTokenId = await client.readContract({
            address: targetAddress as `0x${string}`,
            abi: ABI,
            functionName: "nextTokenId"
          }) as bigint;

          const maxToFetch = Math.min(Number(nextTokenId), 24); // Fetch up to 24 for a better gallery
          const startId = Math.max(0, Number(nextTokenId) - maxToFetch);

          const fetchedBadges: BadgeData[] = [];

          // Fetch in parallel for speed!
          const promises = [];

          for (let i = Number(nextTokenId) - 1; i >= startId; i--) {
            console.log("fetching token ", i);
            promises.push((async () => {
              try {
                const uri = await client.readContract({
                  address: targetAddress as `0x${string}`,
                  abi: ABI,
                  functionName: "tokenURI",
                  args: [BigInt(i)]
                }) as string;

                const owner = await client.readContract({
                  address: targetAddress as `0x${string}`,
                  abi: ABI,
                  functionName: "ownerOf",
                  args: [BigInt(i)]
                }) as string;

                let metadata;
                if (uri.startsWith("data:application/json;base64,")) {
                  const base64 = uri.replace("data:application/json;base64,", "");
                  const jsonStr = atob(base64);
                  metadata = JSON.parse(jsonStr);
                } else if (uri.startsWith("ipfs://")) {
                  const hash = uri.replace("ipfs://", "");
                  const res = await fetch(`https://dweb.link/ipfs/${hash}`);
                  metadata = await res.json();
                } else if (uri.startsWith("http://") || uri.startsWith("https://")) {
                  const res = await fetch(uri);
                  metadata = await res.json();
                }

                const EXCLUDED_OWNERS = [
                  "0x189e56a151ada717d4c7ac0a1c031195d99866d3",
                  "0xa173c2c03524be6ac128faa9b32569c40502ef11",
                ];
                if (metadata && !EXCLUDED_OWNERS.includes(owner.toLowerCase())) {
                  const getAttr = (trait: string) => metadata.attributes?.find((a: any) => a.trait_type === trait)?.value || "";
                  fetchedBadges.push({
                    id: i,
                    owner: owner,
                    firstName: getAttr("First Name") || "",
                    lastName: getAttr("Last Name") || "",
                    eventName: getAttr("Event") || getAttr("Project") || getAttr("Milestone") || "General",
                    startDate: getAttr("Start Date") || "",
                    endDate: getAttr("End Date") || "",
                    badgeType: getAttr("Badge Type") as BadgeType | "Evolution",
                    // New badges store back-face in event_image. Old badges stored it in image directly.
                    imageLink: (() => {
                      const raw = "event_image" in metadata ? metadata.event_image : metadata.image;
                      if (!raw || raw === "ipfs://placeholder") return "";
                      return raw.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
                    })(),
                    profileImage: metadata.profile_image?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "",
                    description: metadata.description || ""
                  });
                }
              } catch (e) {
                console.error(`Failed to fetch badge ${i}`, e);
              }
            })());
          }

          await Promise.all(promises);

          // Sort descending by ID explicitly since Promise.all resolves in arbitrary order
          fetchedBadges.sort((a, b) => b.id - a.id);

          setBadges(fetchedBadges);
        });
      } catch (err) {
        console.error("Gallery fetch error", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBadges();
  }, [network]);

  const uniqueEvents = useMemo(() => {
    const events = new Set<string>();
    badges.forEach(b => {
      if (b.eventName && b.badgeType !== "Evolution") events.add(b.eventName);
    });
    return Array.from(events).sort();
  }, [badges]);

  const filteredBadges = useMemo(() => {
    return badges.filter(badge => {
      const matchWallet = searchWallet === "" || badge.owner.toLowerCase().includes(searchWallet.toLowerCase());
      const matchEvent = filterEvent === "" || badge.eventName === filterEvent || (filterEvent !== "" && badge.badgeType === "Evolution");
      return matchWallet && matchEvent;
    });
  }, [badges, searchWallet, filterEvent]);

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-16 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-[#012140] dark:text-white tracking-tight mb-1">
              Public Gallery
            </h1>
            <p className="text-[#005a8f] dark:text-[#00b2a9] text-lg font-medium">
              Explore ELCA Certified Badges
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setNetwork("testnet")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 ${network === "testnet"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/80"
                  }`}
              >
                Polygon Amoy
              </button>
              <button
                type="button"
                onClick={() => setNetwork("mainnet")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 ${network === "mainnet"
                    ? "bg-gradient-to-r from-[#00b2a9] to-[#005a8f] text-white shadow-[0_0_15px_rgba(0,178,169,0.3)]"
                    : "text-white/40 hover:text-white/80"
                  }`}
              >
                Polygon Mainnet
              </button>
            </div>
            <Link href="/" className="px-6 py-2 glass-dark border border-white/10 rounded-xl hover:bg-white/5 transition flex items-center justify-center text-white font-medium whitespace-nowrap shadow-lg h-[36px]">
              ⬅ Back to Minting
            </Link>
          </div>
        </div>

        {/* Filters */}
        {!loading && badges.length > 0 && (
          <div className="mb-10 p-4 glass-dark rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search by Wallet Address (0x...)"
                value={searchWallet}
                onChange={(e) => setSearchWallet(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2a9]"
              />
            </div>

            <div className="relative w-full md:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2a9] appearance-none"
              >
                <option value="" className="text-black">All Events / Projects</option>
                {uniqueEvents.map(evt => (
                  <option key={evt} value={evt} className="text-black">{evt}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-[#00b2a9] animate-spin" />
            <p className="text-white/60">Fetching indexed badges from Polygon Amoy...</p>
          </div>
        ) : badges.length === 0 ? (
          <div className="glass-dark rounded-3xl p-12 md:p-16 text-center border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-2">No Badges Found</h3>
            <p className="text-white/60">Be the first to mint an ELCA badge!</p>
          </div>
        ) : filteredBadges.length === 0 ? (
          <div className="glass-dark rounded-3xl p-16 text-center border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">No Matches Found</h3>
            <p className="text-white/60">Try adjusting your wallet or event filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12">
            {filteredBadges.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center">
                <div className="transform scale-[0.80] sm:scale-90 lg:scale-[0.85] origin-top mb-[-4rem] lg:mb-[-3rem]">
                  {badge.badgeType === "Evolution" ? (
                    <div className="w-80 h-[28rem] rounded-2xl glass-dark border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)] p-6 flex flex-col justify-between items-center text-center bg-gradient-to-b from-[#011122] to-[#ca8a04]/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl -mr-10 -mt-10" />
                      <h2 className="text-yellow-400 font-black text-xl uppercase tracking-widest leading-loose mt-4">{badge.badgeType} <br /> Badge</h2>
                      <div className="w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.6)]">
                        <span className="text-[#011122] text-5xl font-black">E</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-white/80 font-medium">{badge.eventName}</p>
                      </div>
                    </div>
                  ) : (
                    <BadgeCard {...badge} />
                  )}
                </div>
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-white/50 font-mono shadow-lg relative z-10">
                  Owner: {badge.owner.substring(0, 6)}...{badge.owner.substring(badge.owner.length - 4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
