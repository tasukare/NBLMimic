const fs = require('fs');

const EXPANDED_FALLBACK_NEWS = [
  {
    id: 1,
    type: 'news',
    icon: 'globe',
    title: 'Global Semiconductor Alliance Outlines Joint Sovereign AI Infrastructure Framework',
    source: 'Reuters / World Desk',
    category: 'World',
    categoryColor: '#0284C7',
    excerpt: 'Representatives from thirty nations concluded negotiations establishing common hardware provenance protocols and energy efficiency standards for sovereign data centers across North America, Europe, and East Asia.',
    content: 'Global Semiconductor Alliance Outlines Joint Sovereign AI Infrastructure Framework\n\nPublished by Reuters.\n\nRepresentatives from thirty nations concluded negotiations establishing common hardware provenance protocols and energy efficiency standards for sovereign data centers across North America, Europe, and East Asia.',
    url: 'https://news.google.com/',
    date: '2h ago',
    timestamp: Date.now() - 7200000,
    tags: ['#worldnews', '#world']
  },
  {
    id: 2,
    type: 'news',
    icon: 'cpu',
    title: 'Next-Generation Sparse Mixture-of-Experts Models Cut Inference Compute by 65%',
    source: 'Ars Technica',
    category: 'AI & Tech',
    categoryColor: '#8B5CF6',
    excerpt: 'New research demonstrates dynamic token routing that maintains reasoning benchmarks on mathematics and code synthesis while activating only 8% of total parameters per forward pass.',
    content: 'Next-Generation Sparse Mixture-of-Experts Models Cut Inference Compute by 65%\n\nPublished by Ars Technica.\n\nNew research demonstrates dynamic token routing that maintains reasoning benchmarks on mathematics and code synthesis while activating only 8% of total parameters per forward pass.',
    url: 'https://arstechnica.com',
    date: '4h ago',
    timestamp: Date.now() - 14400000,
    tags: ['#worldnews', '#aitech']
  },
  {
    id: 3,
    type: 'news',
    icon: 'flask',
    title: 'James Webb Space Telescope Identifies Potential Biosignature Gases in Nearby Sub-Neptune',
    source: 'ScienceDaily',
    category: 'Science',
    categoryColor: '#059669',
    excerpt: 'Transmission spectroscopy reveals atmospheric methane and carbon dioxide alongside tentatively detected dimethyl sulfide in habitable zone exoplanet observations.',
    content: 'James Webb Space Telescope Identifies Potential Biosignature Gases in Nearby Sub-Neptune\n\nPublished by ScienceDaily.\n\nTransmission spectroscopy reveals atmospheric methane and carbon dioxide alongside tentatively detected dimethyl sulfide in habitable zone exoplanet observations.',
    url: 'https://www.sciencedaily.com',
    date: '7h ago',
    timestamp: Date.now() - 25200000,
    tags: ['#worldnews', '#science']
  },
  {
    id: 4,
    type: 'news',
    icon: 'briefcase',
    title: 'Central Banks Harmonize Cross-Border Digital Settlement Pilot Across Asian Financial Hubs',
    source: 'Financial Times / BBC',
    category: 'Markets',
    categoryColor: '#D97706',
    excerpt: 'Project mBridge completes multi-billion dollar real-time wholesale trial, settling foreign exchange transactions with atomic delivery versus payment mechanisms.',
    content: 'Central Banks Harmonize Cross-Border Digital Settlement Pilot Across Asian Financial Hubs\n\nPublished by Financial Times.\n\nProject mBridge completes multi-billion dollar real-time wholesale trial, settling foreign exchange transactions with atomic delivery versus payment mechanisms.',
    url: 'https://www.bbc.com/news/business',
    date: '14h ago',
    timestamp: Date.now() - 50400000,
    tags: ['#worldnews', '#markets']
  },
  {
    id: 5,
    type: 'news',
    icon: 'file-text',
    title: 'International AI Safety Institute Releases First Harmonized Evaluation Suite for Frontier Models',
    source: 'BBC News',
    category: 'Policy',
    categoryColor: '#64748B',
    excerpt: 'The standardized benchmark suite tests autonomous replication, cyber offensive capabilities, and biosecurity boundary enforcement across top commercial foundation models.',
    content: 'International AI Safety Institute Releases First Harmonized Evaluation Suite for Frontier Models\n\nPublished by BBC News.\n\nThe standardized benchmark suite tests autonomous replication, cyber offensive capabilities, and biosecurity boundary enforcement across top commercial foundation models.',
    url: 'https://www.bbc.co.uk/news',
    date: '1d ago',
    timestamp: Date.now() - 86400000,
    tags: ['#worldnews', '#policy']
  },
  {
    id: 6,
    type: 'news',
    icon: 'cpu',
    title: 'Linear Attention and Mamba Hybrids Surpass Transformers in Long-Context Retrieval Benchmarks',
    source: 'MIT Technology Review',
    category: 'AI & Tech',
    categoryColor: '#8B5CF6',
    excerpt: 'State-space recurrent models achieve 1M token context evaluation with sub-quadratic memory complexity and zero degradation in needle-in-a-haystack verification.',
    content: 'Linear Attention and Mamba Hybrids Surpass Transformers in Long-Context Retrieval Benchmarks\n\nPublished by MIT Technology Review.\n\nState-space recurrent models achieve 1M token context evaluation with sub-quadratic memory complexity.',
    url: 'https://technologyreview.com',
    date: '6h ago',
    timestamp: Date.now() - 21600000,
    tags: ['#worldnews', '#aitech']
  },
  {
    id: 7,
    type: 'news',
    icon: 'flask',
    title: 'Solid-State Electrolyte Breakthrough Achieves 95% Capacity Retention Over 3,000 Rapid Cycles',
    source: 'Nature Materials',
    category: 'Science',
    categoryColor: '#059669',
    excerpt: 'Novel composite sulfide matrix suppresses lithium dendrite proliferation during 15-minute ultra-fast charging under ambient operating pressures.',
    content: 'Solid-State Electrolyte Breakthrough Achieves 95% Capacity Retention Over 3,000 Rapid Cycles\n\nPublished by Nature Materials.\n\nNovel composite sulfide matrix suppresses lithium dendrite proliferation during 15-minute ultra-fast charging.',
    url: 'https://nature.com',
    date: '12h ago',
    timestamp: Date.now() - 43200000,
    tags: ['#worldnews', '#science']
  },
  {
    id: 8,
    type: 'news',
    icon: 'briefcase',
    title: 'Global Tech Capital Flows Pivot Towards High-Density Energy and Grid Interconnect Projects',
    source: 'Bloomberg Markets',
    category: 'Markets',
    categoryColor: '#D97706',
    excerpt: 'Venture and infrastructure consortiums allocate $45B towards small modular nuclear reactors and geothermal power purchase agreements dedicated to next-decade computing.',
    content: 'Global Tech Capital Flows Pivot Towards High-Density Energy and Grid Interconnect Projects\n\nPublished by Bloomberg Markets.\n\nVenture and infrastructure consortiums allocate $45B towards clean energy projects.',
    url: 'https://bloomberg.com',
    date: '16h ago',
    timestamp: Date.now() - 57600000,
    tags: ['#worldnews', '#markets']
  },
  {
    id: 9,
    type: 'news',
    icon: 'globe',
    title: 'United Nations High-Level Advisory Body Delivers Final Multilateral Framework on AI Governance',
    source: 'UN News / World Wire',
    category: 'World',
    categoryColor: '#0284C7',
    excerpt: 'Proposals include international scientific consensus panels, capacity development funds for developing nations, and open benchmark standards for societal impact evaluations.',
    content: 'United Nations High-Level Advisory Body Delivers Final Multilateral Framework on AI Governance\n\nPublished by UN News.\n\nProposals include international scientific consensus panels and open benchmark standards.',
    url: 'https://news.un.org',
    date: '18h ago',
    timestamp: Date.now() - 64800000,
    tags: ['#worldnews', '#world']
  },
  {
    id: 10,
    type: 'news',
    icon: 'cpu',
    title: 'Researchers Unveil Post-Quantum Cryptographic Key Encapsulation with Zero Latency Penalty',
    source: 'IEEE Spectrum',
    category: 'AI & Tech',
    categoryColor: '#8B5CF6',
    excerpt: 'Lattice-based hardware accelerator integration into consumer silicon ensures seamless transition to NIST-standardized FIPS-203 protocols across public networks.',
    content: 'Researchers Unveil Post-Quantum Cryptographic Key Encapsulation with Zero Latency Penalty\n\nPublished by IEEE Spectrum.\n\nLattice-based hardware accelerator integration into consumer silicon ensures seamless transition to NIST-standardized protocols.',
    url: 'https://spectrum.ieee.org',
    date: '20h ago',
    timestamp: Date.now() - 72000000,
    tags: ['#worldnews', '#aitech']
  },
  {
    id: 11,
    type: 'news',
    icon: 'flask',
    title: 'CRISPR Epigenetic Editing Silences Target PCSK9 Gene Without Inducing DNA Double-Strand Breaks',
    source: 'Science Translational Medicine',
    category: 'Science',
    categoryColor: '#059669',
    excerpt: 'Zinc-finger histone methylation maintains therapeutic cholesterol reduction in non-human primates for over eleven months following a single lipid nanoparticle dose.',
    content: 'CRISPR Epigenetic Editing Silences Target PCSK9 Gene Without Inducing DNA Double-Strand Breaks\n\nPublished by Science Translational Medicine.\n\nZinc-finger histone methylation maintains therapeutic cholesterol reduction.',
    url: 'https://science.org',
    date: '1d ago',
    timestamp: Date.now() - 86400000,
    tags: ['#worldnews', '#science']
  },
  {
    id: 12,
    type: 'news',
    icon: 'briefcase',
    title: 'Semiconductor Foundry CapEx Guidance Surges on Advanced Packaging and High-Bandwidth Memory Demand',
    source: 'Nikkei Asia',
    category: 'Markets',
    categoryColor: '#D97706',
    excerpt: 'Leading chipmakers boost full-year capital expenditure forecast by 18% to expand 2.5D substrate capacity and next-generation HBM4 production lines.',
    content: 'Semiconductor Foundry CapEx Guidance Surges on Advanced Packaging and High-Bandwidth Memory Demand\n\nPublished by Nikkei Asia.\n\nLeading chipmakers boost full-year capital expenditure forecast.',
    url: 'https://asia.nikkei.com',
    date: '1d ago',
    timestamp: Date.now() - 93600000,
    tags: ['#worldnews', '#markets']
  }
];

const fallbackStr = JSON.stringify(EXPANDED_FALLBACK_NEWS, null, 2);

// 1. Update server.js
let serverCode = fs.readFileSync('server.js', 'utf8');
const serverTarget = 'const FALLBACK_WORLD_NEWS = [';
const serverTargetEnd = 'async function fetchLiveNewsFeed(force = false) {';
const startIdx = serverCode.indexOf(serverTarget);
const endIdx = serverCode.indexOf(serverTargetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  serverCode = serverCode.slice(0, startIdx) + 'const FALLBACK_WORLD_NEWS = ' + fallbackStr + ';\n\n' + serverCode.slice(endIdx);
  fs.writeFileSync('server.js', serverCode, 'utf8');
  console.log('Updated FALLBACK_WORLD_NEWS in server.js');
}

// 2. Update js/sources-reader.js
let readerCode = fs.readFileSync('js/sources-reader.js', 'utf8');
const rTarget = 'export const CLIENT_FALLBACK_WORLD_NEWS = [';
const rTargetEnd = 'let cachedWorldNews = [];';
const rStart = readerCode.indexOf(rTarget);
const rEnd = readerCode.indexOf(rTargetEnd);

if (rStart !== -1 && rEnd !== -1) {
  readerCode = readerCode.slice(0, rStart) + 'export const CLIENT_FALLBACK_WORLD_NEWS = ' + fallbackStr + ';\n\n' + readerCode.slice(rEnd);
  fs.writeFileSync('js/sources-reader.js', readerCode, 'utf8');
  console.log('Updated CLIENT_FALLBACK_WORLD_NEWS in js/sources-reader.js');
}
